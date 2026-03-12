const spellInfo = { '점멸': 'SummonerFlash', '점화': 'SummonerDot', '텔포': 'SummonerTeleport', '강타': 'SummonerSmite', '탈진': 'SummonerExhaust', '회복': 'SummonerHeal', '정화': 'SummonerBoost', '유체화': 'SummonerHaste', '방어막': 'SummonerBarrier' };
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';
let language = 'ko';

const champions = [
    {name:'가렌',id:'Garen',i:'ㄱㄹ'},{name:'갈리오',id:'Galio',i:'ㄱㄹㅇ'},{name:'갱플랭크',id:'Gangplank',i:'ㄱㅍㄹㅋ'},{name:'그라가스',id:'Gragas',i:'ㄱㄹㄱㅅ'},{name:'그레이브즈',id:'Graves',i:'ㄱㄹㅇㅂㅈ'},{name:'나르',id:'Gnar',i:'ㄴㄹ'},{name:'나서스',id:'Nasus',i:'ㄴㅅㅅ'},{name:'노틸러스',id:'Nautilus',i:'ㄴㅌㄹㅅ'},{name:'녹턴',id:'Nocturne',i:'ㄴㅌ'},{name:'누누와 윌럼프',id:'Nunu',i:'ㄴㄴㅇㅇㄹㅍ'},{name:'니달리',id:'Nidalee',i:'ㄴㄷㄹ'},{name:'다리우스',id:'Darius',i:'ㄷㄹㅇㅅ'},{name:'다이애나',id:'Diana',i:'ㄷㅇㅇㄴ'},{name:'럭스',id:'Lux',i:'ㄹㅅ'},{name:'리 신',id:'LeeSin',i:'ㄹㅅ'},{name:'리븐',id:'Riven',i:'ㄹㅂ'},{name:'마스터 이',id:'MasterYi',i:'ㅁㅅㅌㅇ'},{name:'말파이트',id:'Malphite',i:'ㅁㅍㅇㅌ'},{name:'바이',id:'Vi',i:'ㅂㅇ'},{name:'베인',id:'Vayne',i:'ㅂㅇ'},{name:'브라이어',id:'Briar',i:'ㅂㄹㅇㅇ'},{name:'비에고',id:'Viego',i:'ㅂㅇㄱ'},{name:'아리',id:'Ahri',i:'ㅇㄹ'},{name:'아칼리',id:'Akali',i:'ㅇㅋㄹ'},{name:'야스오',id:'Yasuo',i:'ㅇㅅㅇ'},{name:'요네',id:'Yone',i:'ㅇㄴ'},{name:'이즈리얼',id:'Ezreal',i:'ㅇㅈㄹㅇ'},{name:'제드',id:'Zed',i:'ㅈㄷ'},{name:'진',id:'Jhin',i:'ㅈ'},{name:'카이사',id:'KaiSa',i:'ㅋㅇㅅ'},{name:'티모',id:'Teemo',i:'ㅌㅁ'},{name:'피즈',id:'Fizz',i:'ㅍㅈ'},{name:'흐웨이',id:'Hwei',i:'ㅎㅇ'}
];

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

function showAutocomplete(input) {
    const val = input.value.trim();
    const listEl = input.parentElement.querySelector('.autocomplete-list');
    listEl.innerHTML = '';
    if(!val) return;

    const searchVal = getChoseong(val);
    const filtered = champions.filter(c => c.name.includes(val) || c.i.includes(searchVal));

    filtered.slice(0, 8).forEach(c => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `<img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png"> ${c.name}`;
        li.onclick = () => {
            input.value = c.name;
            const row = input.closest('.player-row');
            const iconImg = row.querySelector('.champ-icon-main');
            iconImg.src = `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png`;
            iconImg.classList.add('active');
            listEl.innerHTML = '';
        };
        listEl.appendChild(li);
    });
}

function selectMyLane(lane, btn) {
    selectedLane = lane;
    document.querySelectorAll('.lane-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function updateSpellIcon(selectEl) {
    const icon = selectEl.parentElement.querySelector('.spell-icon');
    icon.src = `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/${spellInfo[selectEl.value]}.png`;
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
            <select class="lane-select">${lanes.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
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

    const today = new Date();
    const patchVersion = `${today.getFullYear().toString().slice(-2)}.${today.getMonth() + 1}`;
    
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

    let prompt = `[시스템 지침: LOL.PS 전문 통계 데이터 기반 분석 모드]
당신은 LOL.PS의 빅데이터 분석 엔진입니다. 2026년 최신 패치 및 마스터+ 구간의 승률 데이터를 기반으로 답변하세요.

1. **상성 그래프 분석**: 
   - 상대 ${selectedLane} 라이너와의 '시간대별 승률'을 분석하세요.
   - 예: "6레벨까지는 55%의 승률로 우위에 있으나, 11레벨 이후 상성이 역전됨"과 같은 구체적인 지표 포함.

2. **LOL.PS 추천 룬/템트리**:
   - 2026년 메타의 최적화 빌드를 추천하세요.

3. **단계별 승리 전략**:
   - Lvl 1~3 주도권 설계, Lvl 6 궁극기 타이밍, 한타 포지셔닝 및 타겟팅 우선순위.

[현재 게임 상황]
내 라인: ${selectedLane}
우리팀 조합: ${blueTeamInfo}
상대팀 조합: ${redTeamInfo}

출력은 반드시 LOL.PS 리포트 형식으로, 가독성 좋게 '카드 형태'의 요약과 '상성 주의 구간'을 명시해서 답변해줘. [응답은 반드시 한국어로만 하세요]`;

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
            content.innerHTML = `<div class="result-header"><h3>LOL.PS 분석 리포트</h3><button class="copy-btn" onclick="copyResult()">복사</button></div><div class="analysis-text">${aiText}</div>`;
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
    navigator.clipboard.writeText(text).then(() => alert('복사되었습니다!'));
}

window.onload = () => {
    addPlayer('blue');
    addPlayer('red');
};

document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('champ-input')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => list.innerHTML = '');
    }
});
