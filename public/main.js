const spellInfo = { '점멸': 'SummonerFlash', '점화': 'SummonerDot', '텔포': 'SummonerTeleport', '강타': 'SummonerSmite', '탈진': 'SummonerExhaust', '회복': 'SummonerHeal', '정화': 'SummonerBoost', '유체화': 'SummonerHaste', '방어막': 'SummonerBarrier' };
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';
let language = 'ko';
let allChampions = [];

const getImg = {
    item: (id) => `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/${id}.png`,
    rune: (path) => `https://ddragon.leagueoflegends.com/cdn/img/${path}`,
    champ: (id) => `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${id}.png`
};

// 1. 결과 캐싱 (localStorage 활용, 24시간 유지)
const cacheAnalysis = (key, value) => {
    const data = { value, timestamp: Date.now() };
    localStorage.setItem(`lol_analysis_${key}`, JSON.stringify(data));
};

const getCachedAnalysis = (key) => {
    const cached = localStorage.getItem(`lol_analysis_${key}`);
    if (!cached) return null;
    const { value, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > 1000 * 60 * 60 * 24) {
        localStorage.removeItem(`lol_analysis_${key}`);
        return null;
    }
    return value;
};

// 2. 스마트 재시도 로직 (429 에러 대응)
async function fetchWithRetry(prompt, maxRetries = 2) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch('/analyze', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }) 
            });

            if (response.status === 429 && i < maxRetries) {
                const waitTime = (i + 1) * 3000;
                console.warn(`제한 발생. ${waitTime/1000}초 후 재시도...`);
                await new Promise(res => setTimeout(res, waitTime));
                continue;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "분석 요청에 실패했습니다.");
            }

            return await response.json();
        } catch (error) {
            if (i === maxRetries) throw error;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
}

function getChoseong(str) {
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
        let code = str.charCodeAt(i) - 44032;
        if(code > -1 && code < 11172) result += cho[Math.floor(code/588)];
        else result += str.charAt(i);
    }
    return result;
}

async function fetchAllChampions() {
    try {
        const v = "14.5.1"; 
        const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`);
        const data = await res.json();
        allChampions = Object.values(data.data).map(c => ({
            name: c.name,
            id: c.id,
            i: getChoseong(c.name)
        }));
    } catch (e) {
        console.error("챔피언 데이터를 불러오는데 실패했습니다.", e);
    }
}

function showAutocomplete(input) {
    const val = input.value.trim();
    const listEl = input.parentElement.querySelector('.autocomplete-list');
    listEl.innerHTML = '';
    if(!val) return;

    const searchVal = getChoseong(val).toLowerCase();
    const filtered = allChampions.filter(c => c.name.includes(val) || c.i.includes(searchVal) || c.id.toLowerCase().includes(val.toLowerCase()));

    filtered.slice(0, 10).forEach(c => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `<img src="${getImg.champ(c.id)}"> ${c.name}`;
        li.onclick = () => {
            input.value = c.name;
            const row = input.closest('.player-row');
            const iconImg = row.querySelector('.champ-icon-main');
            iconImg.src = getImg.champ(c.id);
            iconImg.classList.add('active'); 
            listEl.innerHTML = '';
        };
        listEl.appendChild(li);
    });
}

function handleLaneChange(selectEl) {
    const row = selectEl.closest('.player-row');
    const s1 = row.querySelector('.s1');
    const s2 = row.querySelector('.s2');

    if (selectEl.value === '정글') {
        if (s1.value === '점멸') {
            s2.value = '강타';
            updateSpellIcon(s2);
        } else if (s2.value === '점멸') {
            s1.value = '강타';
            updateSpellIcon(s1);
        } else {
            s1.value = '강타';
            s2.value = '점멸';
            updateSpellIcon(s1);
            updateSpellIcon(s2);
        }
    }
}

function updateSpellIcon(selectEl) {
    const icon = selectEl.parentElement.querySelector('.spell-icon');
    icon.src = `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/${spellInfo[selectEl.value]}.png`;
}

function selectMyLane(lane, btn) {
    selectedLane = lane;
    document.querySelectorAll('.lane-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function toggleLanguage() {
    language = language === 'ko' ? 'en' : 'ko';
    document.getElementById('lang-status').innerText = language === 'ko' ? 'KR' : 'EN';
}

function addPlayer(team) {
    const list = document.getElementById(`${team}-team-list`);
    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
        <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
        <div class="input-line">
            <img src="" class="champ-icon-main">
            <div class="champ-input-container">
                <input type="text" class="champ-input" placeholder="ㄱ, 가ㄹ 검색" oninput="showAutocomplete(this)">
                <ul class="autocomplete-list"></ul>
            </div>
            <select class="lane-select" onchange="handleLaneChange(this)">${lanes.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
        </div>
        <div class="spell-row">
            <div class="spell-item"><img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/SummonerFlash.png" class="spell-icon"><select class="spell-select s1" onchange="updateSpellIcon(this)">${Object.keys(spellInfo).map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
            <div class="spell-item"><img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/SummonerDot.png" class="spell-icon"><select class="spell-select s2" onchange="updateSpellIcon(this)">${Object.keys(spellInfo).map((s,i) => `<option value="${s}" ${i==1?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>
    `;
    list.appendChild(div);
}

async function startAnalysis() {
    const resultArea = document.getElementById('result');
    const loading = document.getElementById('loading');
    const content = document.getElementById('analysis-content');
    const btn = document.getElementById('analyze-btn');

    // 데이터 수집
    const blueTeam = [];
    document.querySelectorAll('#blue-team-list .player-row').forEach(row => {
        const l = row.querySelector('.lane-select').value;
        const c = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(c) blueTeam.push({lane: l, champ: c, spells: [s1, s2], isUser: l === selectedLane});
    });

    const redTeam = [];
    document.querySelectorAll('#red-team-list .player-row').forEach(row => {
        const l = row.querySelector('.lane-select').value;
        const c = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(c) redTeam.push({lane: l, champ: c, spells: [s1, s2]});
    });

    if (blueTeam.length === 0 || redTeam.length === 0) {
        alert("챔피언 정보를 입력해주세요.");
        return;
    }

    // 캐시 확인용 고유 키 생성
    const cacheKey = btoa(encodeURIComponent(`${selectedLane}_${JSON.stringify(blueTeam)}_${JSON.stringify(redTeam)}`));
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
        resultArea.classList.remove('hidden');
        content.innerHTML = cached;
        return;
    }

    // UI 피드백
    resultArea.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.innerHTML = '';
    btn.disabled = true;

    // 프롬프트 경량화 (토큰 절약 및 속도 향상)
    const prompt = `
[ROLE] 롤 전문 코치
[DATA] Blue:${JSON.stringify(blueTeam)} / Red:${JSON.stringify(redTeam)}
[ORDER] 
1. 10초 내 읽게 요약.
2. 리쉬(Leash) 언급 금지.
3. 시간/레벨별 유리한 시점 명시.
4. '---' 구분자로 요약과 상세 분리.
5. 한국어로 짧고 명확하게 답변.
${selectedLane === '정글' ? '6. 정글 전용 JSON 동선 포함: [JUNGLE_DATA: {"matchupTip": "...", "steps": [{"target": "...", "desc": "..."}], "pathPoints": [{"x": 0, "y": 0}]}]' : ''}
    `.trim();

    try {
        const result = await fetchWithRetry(prompt);
        
        let fullText = "";
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
            fullText = result.candidates[0].content.parts[0].text;
        } else {
            fullText = JSON.stringify(result);
        }

        const jungleDataMatch = fullText.match(/\[JUNGLE_DATA: (.*?)\]/);
        let cleanText = fullText.replace(/\[JUNGLE_DATA: .*?\]/, '');

        const sections = cleanText.split('---'); 
        const summary = sections[0] || "요약 데이터를 불러오지 못했습니다.";
        const details = sections[1] || "상세 분석 내용이 없습니다.";

        const finalHtml = `
            <div class="summary-card">
                <h4>⚡ 핵심 승리 전략</h4>
                <div class="summary-text">${summary.replace(/\n/g, '<br>')}</div>
            </div>
            
            <button id="toggle-details" class="details-btn" onclick="toggleDetails()">
                상세 룬/템트리 보기 ↓
            </button>

            <div id="analysis-details" class="hidden-details">
                <div class="analysis-text">
                    <h5 style="margin-top:0; color:#3b82f6;">🛡️ 상세 전략 및 추천 빌드</h5>
                    ${details.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        content.innerHTML = finalHtml;
        cacheAnalysis(cacheKey, finalHtml); // 결과 저장

        if (jungleDataMatch && selectedLane === '정글') {
            try {
                const jungleData = JSON.parse(jungleDataMatch[1]);
                renderJungleStrategy(jungleData);
            } catch (e) {
                console.error("정글 데이터 파싱 실패", e);
            }
        }
    } catch (e) { 
        content.innerHTML = `
            <div class="error-msg">
                현재 분석 요청이 너무 많습니다. <br>
                <button onclick="startAnalysis()" class="retry-btn" style="margin-top:10px; padding:8px 16px; background:#3b82f6; border:none; border-radius:6px; color:white; cursor:pointer;">다시 시도하기</button>
            </div>`;
    } finally { 
        loading.classList.add('hidden'); 
        btn.disabled = false;
    }
}

function renderJungleStrategy(strategyData) {
    const analysisSection = document.getElementById('analysis-content');
    const jungleHtml = `
        <div class="jungle-strategy-card">
            <h4>🗺️ 정글러 전용: 맞춤형 전략 동선</h4>
            <div class="jungle-analysis-container">
                <img src="https://ddragon.leagueoflegends.com/cdn/img/map/map11.png" id="jungle-minimap">
                <canvas id="jungle-path-canvas" width="320" height="320"></canvas>
            </div>
            <div class="strategy-details">
                <div class="matchup-box">
                    <strong>🆚 정글 상성 분석:</strong> 
                    <p>${strategyData.matchupTip}</p>
                </div>
                <ul class="step-list">
                    ${strategyData.steps.map((step, i) => `
                        <li>
                            <span class="step-num">${i + 1}</span>
                            <div><strong>${step.target}</strong>: ${step.desc}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    analysisSection.insertAdjacentHTML('beforeend', jungleHtml);
    setTimeout(() => drawJungleStrategy(strategyData.pathPoints, strategyData.matchupTip.includes('카정') ? '카정' : '일반'), 100);
}

function drawJungleStrategy(points, strategyType) {
    const canvas = document.getElementById('jungle-path-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = strategyType === '카정' ? '#ef4444' : '#fbbf24';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 8]);

    ctx.beginPath();
    points.forEach((p, i) => {
        const targetX = (p.x / 100) * canvas.width;
        const targetY = (p.y / 100) * canvas.height;
        if (i === 0) ctx.moveTo(targetX, targetY);
        else ctx.lineTo(targetX, targetY);
    });
    ctx.stroke();

    const last = points[points.length - 1];
    if (last) {
        ctx.fillStyle = '#ef4444';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc((last.x/100)*canvas.width, (last.y/100)*canvas.height, 8, 0, Math.PI*2);
        ctx.fill();
    }
}

function toggleDetails() {
    const detailsDiv = document.getElementById('analysis-details');
    const btn = document.getElementById('toggle-details');
    if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        btn.innerText = '상세 룬/템트리 보기 ↓';
    } else {
        detailsDiv.style.display = 'block';
        btn.innerText = '상세 내용 접기 ↑';
    }
}

function copyResult() {
    const text = document.querySelector('.analysis-text').innerText;
    navigator.clipboard.writeText(text).then(() => alert(language === 'ko' ? '복사되었습니다!' : 'Copied!'));
}

window.onload = async () => {
    await fetchAllChampions();
    addPlayer('blue');
    addPlayer('red');
};

document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('champ-input')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => list.innerHTML = '');
    }
});
