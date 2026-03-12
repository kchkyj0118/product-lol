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
    const loading = document.getElementById('loading');
    const content = document.getElementById('analysis-content');
    const resultArea = document.getElementById('result');
    const btn = document.getElementById('analyze-btn');

    resultArea.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.innerHTML = '';
    btn.disabled = true;

    const blueTeamArr = [];
    document.querySelectorAll('#blue-team-list .player-row').forEach(row => {
        const l = row.querySelector('.lane-select').value;
        const c = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(c) blueTeamArr.push(`${l}: ${c}(${s1}/${s2})${l === selectedLane ? '[사용자]' : ''}`);
    });
    const blueTeamInfo = blueTeamArr.join(", ");

    const redTeamArr = [];
    document.querySelectorAll('#red-team-list .player-row').forEach(row => {
        const l = row.querySelector('.lane-select').value;
        const c = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(c) redTeamArr.push(`${l}: ${c}(${s1}/${s2})`);
    });
    const redTeamInfo = redTeamArr.join(", ");

    let prompt = `[시스템: LOL.PS 전문 분석 모드]
- 반드시 2026년 최신 아이템을 기반으로 추천할 것.
- 답변 시작 시 'LOL.PS 분석 리포트'나 날짜 같은 머리말은 절대 쓰지 마세요.
- 1단계: 핵심 요약(3줄)을 작성하고 바로 다음에 '---' 구분자를 넣으세요.
- 2단계: 그 아래에 상세 분석 및 템트리를 작성하세요.
- 승리 전략에는 몇 레벨까지 유리하고 언제부터 불리한지 타임라인을 명시하세요.
- 만약 사용자 라인이 '정글'이라면, JSON 형식으로 동선 데이터를 포함하세요: [JUNGLE_DATA: {"matchupTip": "...", "steps": [{"target": "레드", "desc": "..."}], "pathPoints": [{"x": 100, "y": 100}]}]
- [응답은 반드시 한국어로만 하세요]

현재 라인: ${selectedLane}
우리팀: ${blueTeamInfo} / 상대팀: ${redTeamInfo}`;

    try {
        const response = await fetch('/analyze', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }) 
        });
        const result = await response.json();
        
        if (result.error) {
            content.innerText = "Error: " + result.error;
        } else {
            let fullText = "";
            if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
                fullText = result.candidates[0].content.parts[0].text;
            } else {
                fullText = JSON.stringify(result);
            }

            // 정글 데이터 추출 시도
            const jungleDataMatch = fullText.match(/\[JUNGLE_DATA: (.*?)\]/);
            let cleanText = fullText.replace(/\[JUNGLE_DATA: .*?\]/, '');

            const sections = cleanText.split('---'); 
            const summary = sections[0] || "요약 데이터를 불러오지 못했습니다.";
            const details = sections[1] || "상세 분석 내용이 없습니다.";

            content.innerHTML = `
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

            if (jungleDataMatch && selectedLane === '정글') {
                try {
                    const jungleData = JSON.parse(jungleDataMatch[1]);
                    renderJungleStrategy(jungleData);
                } catch (e) {
                    console.error("정글 데이터 파싱 실패", e);
                }
            }
        }
    } catch (e) { 
        content.innerText = "Error: " + e.message; 
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
            <div class="minimap-wrapper">
                <img src="https://ddragon.leagueoflegends.com/cdn/img/map/map11.png" class="minimap-img">
                <canvas id="jungle-path-canvas" width="300" height="300"></canvas>
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
    setTimeout(() => drawPathOnCanvas(strategyData.pathPoints), 100);
}

function drawPathOnCanvas(points) {
    const canvas = document.getElementById('jungle-path-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    points.forEach((p, i) => {
        if (i === 0) { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        else {
            ctx.lineTo(p.x, p.y);
            if (i === points.length - 1) {
                const prev = points[i-1];
                const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 10 * Math.cos(angle - Math.PI / 6), p.y - 10 * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(p.x - 10 * Math.cos(angle + Math.PI / 6), p.y - 10 * Math.sin(angle + Math.PI / 6));
                ctx.closePath(); ctx.fill();
            }
        }
    });
    ctx.stroke();
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
    navigator.clipboard.writeText(text).then(() => alert('복사되었습니다!'));
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
