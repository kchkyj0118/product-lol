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

const loadingMessages = {
    ko: ["상대 정글러의 초반 동선을 예측 중입니다...", "라인별 상성 데이터를 대조하고 있습니다...", "오브젝트 주도권을 시뮬레이션 중입니다...", "첫 코어 아이템 시점의 파워 스파이크를 계산 중입니다...", "최적의 갱킹 루트를 설계하고 있습니다..."],
    en: ["Predicting enemy jungler's initial path...", "Comparing lane-by-lane matchup data...", "Simulating object control...", "Calculating power spikes for the first core item...", "Designing the optimal ganking route..."]
};

// --- 글로벌 언어 전환 함수 ---
function toggleLanguage() {
    language = (language === 'ko') ? 'en' : 'ko';
    document.getElementById('lang-status').innerText = (language === 'ko') ? 'KR' : 'EN';
    document.getElementById('lang-btn').innerText = (language === 'ko') ? '🌐 EN' : '🌐 KR';

    document.querySelectorAll('[data-kr]').forEach(el => {
        const translation = el.getAttribute(`data-${language}`);
        if (el.tagName === 'INPUT') el.placeholder = translation;
        else el.innerText = translation;
    });
}

// --- 로컬 캐싱 시스템 (12시간 유지) ---
const cacheAnalysis = (key, value) => {
    const data = { value, expiry: Date.now() + (1000 * 60 * 60 * 12) };
    localStorage.setItem(`lol_analysis_${key}`, JSON.stringify(data));
};

const getCachedAnalysis = (key) => {
    const item = localStorage.getItem(`lol_analysis_${key}`);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`lol_analysis_${key}`);
        return null;
    }
    return parsed.value;
};

// --- 지수 백오프 기반 재시도 함수 ---
async function fetchWithRetry(prompt, retries = 2, backoff = 3000) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch('/analyze', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }) 
            });

            if (response.status === 429 && i < retries) {
                console.warn(`Rate limit. Retrying in ${(backoff * (i + 1))/1000}s...`);
                await new Promise(res => setTimeout(res, backoff * (i + 1)));
                continue;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Analysis failed.");
            }

            return await response.json();
        } catch (error) {
            if (i === retries) throw error;
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
        console.error("Failed to load champions.", e);
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

function addPlayer(team) {
    const list = document.getElementById(`${team}-team-list`);
    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
        <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
        <div class="input-line">
            <img src="" class="champ-icon-main">
            <div class="champ-input-container">
                <input type="text" class="champ-input" placeholder="${language === 'ko' ? 'ㄱ, 가ㄹ 검색' : 'Search champion'}" oninput="showAutocomplete(this)">
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
    const loadingContainer = document.getElementById('loading-container');
    const loadingText = document.getElementById('loading-text');
    const content = document.getElementById('analysis-content');
    const btn = document.getElementById('analyze-btn');

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
        alert(language === 'ko' ? "챔피언 정보를 입력해주세요." : "Please enter champion information.");
        return;
    }

    const cacheKey = btoa(encodeURIComponent(`${language}_${selectedLane}_${JSON.stringify(blueTeam)}_${JSON.stringify(redTeam)}`));
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
        resultArea.classList.remove('hidden');
        content.innerHTML = cached;
        return;
    }

    resultArea.classList.add('hidden');
    loadingContainer.style.display = 'block';
    loadingText.innerText = language === 'ko' ? "데이터를 수집 중입니다..." : "Collecting data...";
    
    const msgInterval = setInterval(() => {
        const msgs = loadingMessages[language];
        loadingText.innerText = msgs[Math.floor(Math.random() * msgs.length)];
    }, 2500);

    content.innerHTML = '';
    btn.disabled = true;

    const prompt = `
[DATA]
User Lane: ${selectedLane}
Blue Team: ${JSON.stringify(blueTeam)}
Red Team: ${JSON.stringify(redTeam)}

[RULE]
1. 2026 Season Meta.
2. No leash mention.
3. Timeline strengths (level/minute) 1-line summary.
4. Matchup changes at first core item 1-line summary.
5. Overall victory plan 3-line summary.
6. Use '---' separator between summary and details.
7. Answer in ${language === 'ko' ? 'Korean' : 'English'}.
${selectedLane === '정글' ? '8. Include Jungle JSON pathing: [JUNGLE_DATA: {"matchupTip": "...", "steps": [{"target": "...", "desc": "..."}], "pathPoints": [{"x": 0, "y": 0}]}]' : ''}
    `.trim();

    try {
        const result = await fetchWithRetry(prompt);
        clearInterval(msgInterval);
        loadingContainer.style.display = 'none';
        
        let fullText = result.candidates[0].content.parts[0].text;

        const jungleDataMatch = fullText.match(/\[JUNGLE_DATA: (.*?)\]/);
        let cleanText = fullText.replace(/\[JUNGLE_DATA: .*?\]/, '');

        const sections = cleanText.split('---'); 
        const summary = sections[0] || "...";
        const details = sections[1] || "...";

        const finalHtml = `
            <div class="summary-card">
                <h4>⚡ ${language === 'ko' ? '핵심 승리 전략' : 'Core Victory Strategy'}</h4>
                <div class="summary-text">${summary.replace(/\n/g, '<br>')}</div>
            </div>
            
            <button id="toggle-details" class="details-btn" onclick="toggleDetails()">
                ${language === 'ko' ? '상세 룬/템트리 보기 ↓' : 'View Detailed Runes/Items ↓'}
            </button>

            <div id="analysis-details" class="hidden-details">
                <div class="analysis-text">
                    <h5 style="margin-top:0; color:#3b82f6;">🛡️ ${language === 'ko' ? '상세 전략 및 추천 빌드' : 'Detailed Strategy & Recommended Build'}</h5>
                    ${details.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        resultArea.classList.remove('hidden');
        content.innerHTML = finalHtml;
        cacheAnalysis(cacheKey, finalHtml);

        if (jungleDataMatch && selectedLane === '정글') {
            try { renderJungleStrategy(JSON.parse(jungleDataMatch[1])); } catch (e) {}
        }
    } catch (e) { 
        clearInterval(msgInterval);
        loadingContainer.style.display = 'none';
        resultArea.classList.remove('hidden');
        content.innerHTML = `
            <div class="error-box">
                <p>${language === 'ko' ? '분석 요청이 지연되고 있습니다.' : 'Analysis request delayed.'} (${e.message})</p>
                <button onclick="startAnalysis()" class="retry-btn">${language === 'ko' ? '다시 시도하기' : 'Retry'}</button>
            </div>`;
    } finally { 
        btn.disabled = false;
    }
}

function renderJungleStrategy(strategyData) {
    const analysisSection = document.getElementById('analysis-content');
    const jungleHtml = `
        <div class="jungle-strategy-card">
            <h4>🗺️ ${language === 'ko' ? '정글러 전용: 맞춤형 전략 동선' : 'Jungle Specific: Custom Pathing'}</h4>
            <div class="jungle-analysis-container">
                <img src="https://ddragon.leagueoflegends.com/cdn/img/map/map11.png" id="jungle-minimap">
                <canvas id="jungle-path-canvas" width="320" height="320"></canvas>
            </div>
            <div class="strategy-details">
                <div class="matchup-box">
                    <strong>🆚 ${language === 'ko' ? '정글 상성 분석' : 'Jungle Matchup'}:</strong> 
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
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([8, 8]);
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
        ctx.fillStyle = '#ef4444'; ctx.setLineDash([]); ctx.beginPath();
        ctx.arc((last.x/100)*canvas.width, (last.y/100)*canvas.height, 8, 0, Math.PI*2); ctx.fill();
    }
}

function toggleDetails() {
    const detailsDiv = document.getElementById('analysis-details');
    const btn = document.getElementById('toggle-details');
    if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        btn.innerText = (language === 'ko') ? '상세 룬/템트리 보기 ↓' : 'View Detailed Runes/Items ↓';
    } else {
        detailsDiv.style.display = 'block';
        btn.innerText = (language === 'ko') ? '상세 내용 접기 ↑' : 'Collapse Details ↑';
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
