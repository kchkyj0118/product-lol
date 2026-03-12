const spellInfo = {
    '점멸': 'SummonerFlash', '점화': 'SummonerDot', '텔포': 'SummonerTeleport',
    '강타': 'SummonerSmite', '탈진': 'SummonerExhaust', '회복': 'SummonerHeal',
    '정화': 'SummonerBoost', '유체화': 'SummonerHaste', '방어막': 'SummonerBarrier'
};
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';
let language = 'ko';

function selectMyLane(lane, btn) {
    selectedLane = lane;
    document.querySelectorAll('.lane-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function toggleLanguage() {
    language = language === 'ko' ? 'en' : 'ko';
    document.getElementById('lang-status').innerText = language === 'ko' ? 'KR' : 'EN';
}

function getSpellImg(spellName) {
    return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/${spellInfo[spellName] || 'SummonerFlash'}.png`;
}

function updateSpellIcon(selectEl) {
    const icon = selectEl.parentElement.querySelector('.spell-icon');
    icon.src = getSpellImg(selectEl.value);
}

function addPlayer(team) {
    const list = document.getElementById(`${team}-team-list`);
    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
        <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
        <div class="input-line">
            <select class="lane-select">${lanes.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
            <input type="text" class="champ-input" placeholder="챔피언 이름">
        </div>
        <div class="spell-row">
            <div class="spell-item">
                <img src="${getSpellImg('점멸')}" class="spell-icon">
                <select class="spell-select s1" onchange="updateSpellIcon(this)">${Object.keys(spellInfo).map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            </div>
            <div class="spell-item">
                <img src="${getSpellImg('점화')}" class="spell-icon">
                <select class="spell-select s2" onchange="updateSpellIcon(this)">${Object.keys(spellInfo).map((s,i) => `<option value="${s}" ${i==1?'selected':''}>${s}</option>`).join('')}</select>
            </div>
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

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    // [자동 계산 로직] 연도의 마지막 두 자리를 패치 버전 앞자리로 사용 (2026 -> 26)
    const patchMajor = year.toString().slice(-2);
    const patchVersion = `${patchMajor}.${month}`; 
    const dateString = `${year}-${month}-${today.getDate()}`;

    let prompt = `[시스템 설정]
- 현재 날짜: ${dateString}
- 현재 패치 버전: Patch ${patchVersion}
- 언어: ${language === 'ko' ? '한국어' : 'English'}
- 내 라인: ${selectedLane}

우리팀 조합:
`;
    
    ['blue', 'red'].forEach(team => {
        prompt += `[${team === 'blue' ? '우리팀' : '상대팀'}]\n`;
        document.querySelectorAll(`#${team}-team-list .player-row`).forEach(row => {
            const lane = row.querySelector('.lane-select').value;
            const champ = row.querySelector('.champ-input').value;
            const s1 = row.querySelector('.s1').value;
            const s2 = row.querySelector('.s2').value;
            if(champ) prompt += `- ${lane}: ${champ} (${s1}/${s2}) ${lane === selectedLane && team === 'blue' ? '[USER]' : ''}\n`;
        });
    });

    prompt += `\n분석 지침:
1. 반드시 Patch ${patchVersion} 메타를 기반으로 분석하라.
2. 3줄 핵심 요약을 최상단에 배치하라.
3. 2026년 이후의 최신 아이템 빌드 체계를 반영하여 추천하라. [응답은 반드시 선택된 언어(${language})로만 하세요]`;

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
            let aiText = "";
            if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
                aiText = result.candidates[0].content.parts[0].text;
            } else {
                aiText = JSON.stringify(result);
            }
            
            content.innerHTML = `
                <div class="result-header">
                    <h3>분석 결과 (Patch ${patchVersion})</h3>
                    <button class="copy-btn" onclick="copyResult()">결과 복사</button>
                </div>
                <div class="analysis-text">${aiText}</div>
            `;
        }
    } catch (e) { 
        content.innerText = "Error: " + e.message; 
    } finally { 
        loading.classList.add('hidden'); 
        btn.disabled = false;
    }
}

function copyResult() {
    const text = document.querySelector('.analysis-text').innerText;
    navigator.clipboard.writeText(text).then(() => alert(language === 'ko' ? '복사되었습니다!' : 'Copied!'));
}

// 초기 기본 생성
window.onload = () => {
    addPlayer('blue');
    addPlayer('red');
};
