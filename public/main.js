const spellInfo = {
    '점멸': 'SummonerFlash', '점화': 'SummonerDot', '텔포': 'SummonerTeleport',
    '강타': 'SummonerSmite', '탈진': 'SummonerExhaust', '회복': 'SummonerHeal',
    '정화': 'SummonerBoost', '유체화': 'SummonerHaste', '방어막': 'SummonerBarrier'
};
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';
let language = 'ko';

// 주요 챔피언 리스트 (한글명, 영문ID, 초성)
const champions = [
    { name: '가렌', id: 'Garen', initial: 'ㄱㄹ' },
    { name: '그라가스', id: 'Gragas', initial: 'ㄱㄹㄱㅅ' },
    { name: '갈리오', id: 'Galio', initial: 'ㄱㄹㅇ' },
    { name: '갱플랭크', id: 'Gangplank', initial: 'ㄱㅍㄹㅋ' },
    { name: '그레이브즈', id: 'Graves', initial: 'ㄱㄹㅇㅂㅈ' },
    { name: '나르', id: 'Gnar', initial: 'ㄴㄹ' },
    { name: '나미', id: 'Nami', initial: 'ㄴㅁ' },
    { name: '나서스', id: 'Nasus', initial: 'ㄴㅅㅅ' },
    { name: '노틸러스', id: 'Nautilus', initial: 'ㄴㅌㄹㅅ' },
    { name: '녹턴', id: 'Nocturne', initial: 'ㄴㅌ' },
    { name: '누누와 윌럼프', id: 'Nunu', initial: 'ㄴㄴㅇㅇㄹㅍ' },
    { name: '니달리', id: 'Nidalee', initial: 'ㄴㄷㄹ' },
    { name: '다이애나', id: 'Diana', initial: 'ㄷㅇㅇㄴ' },
    { name: '다리우스', id: 'Darius', initial: 'ㄷㄹㅇㅅ' },
    { name: '드레이븐', id: 'Draven', initial: 'ㄷㄹㅇㅂㄴ' },
    { name: '라이즈', id: 'Ryze', initial: 'ㄹㅇㅈ' },
    { name: '럭스', id: 'Lux', initial: 'ㄹㅅ' },
    { name: '럼블', id: 'Rumble', initial: 'ㄹㅂ' },
    { name: '레넥톤', id: 'Renekton', initial: 'ㄹㄴㅌ' },
    { name: '레오나', id: 'Leona', initial: 'ㄹㅇㄴ' },
    { name: '리 신', id: 'LeeSin', initial: 'ㄹㅅ' },
    { name: '리븐', id: 'Riven', initial: 'ㄹㅂ' },
    { name: '리산드라', id: 'Lissandra', initial: 'ㄹㅅㄷㄹ' },
    { name: '릴리아', id: 'Lillia', initial: 'ㄹㄹㅇ' },
    { name: '마스터 이', id: 'MasterYi', initial: 'ㅁㅅㅌㅇ' },
    { name: '마오카이', id: 'Maokai', initial: 'ㅁㅇㅋㅇ' },
    { name: '말자하', id: 'Malzahar', initial: 'ㅁㅈㅎ' },
    { name: '말파이트', id: 'Malphite', initial: 'ㅁㅍㅇㅌ' },
    { name: '모데카이저', id: 'Mordekaiser', initial: 'ㅁㄷㅋㅇㅈ' },
    { name: '모르가나', id: 'Morgana', initial: 'ㅁㄹㄱㄴ' },
    { name: '문도 박사', id: 'DrMundo', initial: 'ㅁㄷㅂㅅ' },
    { name: '바이', id: 'Vi', initial: 'ㅂㅇ' },
    { name: '바루스', id: 'Varus', initial: 'ㅂㄹㅅ' },
    { name: '바드', id: 'Bard', initial: 'ㅂㄷ' },
    { name: '베인', id: 'Vayne', initial: 'ㅂㅇ' },
    { name: '벨코즈', id: 'Velkoz', initial: 'ㅂㅋㅈ' },
    { name: '볼리베어', id: 'Volibear', initial: 'ㅂㄹㅂㅇ' },
    { name: '브라움', id: 'Braum', initial: 'ㅂㄹㅇ' },
    { name: '브랜드', id: 'Brand', initial: 'ㅂㄹㄷ' },
    { name: '블라디미르', id: 'Vladimir', initial: 'ㅂㄹㄷㅁㄹ' },
    { name: '블리츠크랭크', id: 'Blitzcrank', initial: 'ㅂㄹㅊㅋㄹㅋ' },
    { name: '비에고', id: 'Viego', initial: 'ㅂㅇㄱ' },
    { name: '빅토르', id: 'Viktor', initial: 'ㅂㅌㄹ' },
    { name: '뽀삐', id: 'Poppy', initial: 'ㅃㅃ' },
    { name: '사미라', id: 'Samira', initial: 'ㅅㅁㄹ' },
    { name: '사이온', id: 'Sion', initial: 'ㅅㅇㅇ' },
    { name: '사일러스', id: 'Sylas', initial: 'ㅅㅇㄹㅅ' },
    { name: '샤코', id: 'Shaco', initial: 'ㅅㅋ' },
    { name: '세나', id: 'Senna', initial: 'ㅅㄴ' },
    { name: '세라핀', id: 'Seraphine', initial: 'ㅅㄹㅍ' },
    { name: '세주아니', id: 'Sejuani', initial: 'ㅅㅈㅇㄴ' },
    { name: '세트', id: 'Sett', initial: 'ㅅㅌ' },
    { name: '소나', id: 'Sona', initial: 'ㅅㄴ' },
    { name: '소라카', id: 'Soraka', initial: 'ㅅㄹㅋ' },
    { name: '쉔', id: 'Shen', initial: 'ㅅ' },
    { name: '쉬바나', id: 'Shyvana', initial: 'ㅅㅂㄴ' },
    { name: '스웨인', id: 'Swain', initial: 'ㅅㅇㅇ' },
    { name: '스카너', id: 'Skarner', initial: 'ㅅㅋㄴ' },
    { name: '시비르', id: 'Sivir', initial: 'ㅅㅂㄹ' },
    { name: '신 짜오', id: 'XinZhao', initial: 'ㅅㅉㅇ' },
    { name: '신드라', id: 'Syndra', initial: 'ㅅㄷㄹ' },
    { name: '신지드', id: 'Singed', initial: 'ㅅㅈㄷ' },
    { name: '쓰레쉬', id: 'Thresh', initial: 'ㅆㄹㅅ' },
    { name: '아리', id: 'Ahri', initial: 'ㅇㄹ' },
    { name: '아무무', id: 'Amumu', initial: 'ㅇㅁㅁ' },
    { name: '아우렐리온 솔', id: 'AurelionSol', initial: 'ㅇㅇㄹㄹㅇㅅ' },
    { name: '아지르', id: 'Azir', initial: 'ㅇㅈㄹ' },
    { name: '아칼리', id: 'Akali', initial: 'ㅇㅋㄹ' },
    { name: '아트록스', id: 'Aatrox', initial: 'ㅇㅌㄹㅅ' },
    { name: '아펠리오스', id: 'Aphelios', initial: 'ㅇㅍㄹㅇㅅ' },
    { name: '알리스타', id: 'Alistar', initial: 'ㅇㄹㅅㅌ' },
    { name: '애니', id: 'Annie', initial: 'ㅇㄴ' },
    { name: '애니비아', id: 'Anivia', initial: 'ㅇㄴㅂㅇ' },
    { name: '애쉬', id: 'Ashe', initial: 'ㅇㅅ' },
    { name: '야스오', id: 'Yasuo', initial: 'ㅇㅅㅇ' },
    { name: '에코', id: 'Ekko', initial: 'ㅇㅋ' },
    { name: '엘리스', id: 'Elise', initial: 'ㅇㄹㅅ' },
    { name: '오공', id: 'MonkeyKing', initial: 'ㅇㄱ' },
    { name: '오른', id: 'Ornn', initial: 'ㅇㄹ' },
    { name: '오리아나', id: 'Orianna', initial: 'ㅇㄹㅇㄴ' },
    { name: '올라프', id: 'Olaf', initial: 'ㅇㄹㅍ' },
    { name: '요네', id: 'Yone', initial: 'ㅇㄴ' },
    { name: '요릭', id: 'Yorick', initial: 'ㅇㄹ' },
    { name: '우디르', id: 'Udyr', initial: 'ㅇㄷㄹ' },
    { name: '우르곳', id: 'Urgot', initial: 'ㅇㄹㄱ' },
    { name: '워윅', id: 'Warwick', initial: 'ㅇㅇ' },
    { name: '유미', id: 'Yuumi', initial: 'ㅇㅁ' },
    { name: '이렐리아', id: 'Irelia', initial: 'ㅇㄹㄹㅇ' },
    { name: '이브린', id: 'Evelynn', initial: 'ㅇㅂㄹ' },
    { name: '이즈리얼', id: 'Ezreal', initial: 'ㅇㅈㄹㅇ' },
    { name: '일라오이', id: 'Illaoi', initial: 'ㅇㄹㅇㅇ' },
    { name: '자르반 4세', id: 'JarvanIV', initial: 'ㅈㄹㅂ' },
    { name: '자야', id: 'Xayah', initial: 'ㅈㅇ' },
    { name: '자이라', id: 'Zyra', initial: 'ㅈㅇㄹ' },
    { name: '자크', id: 'Zac', initial: 'ㅈㅋ' },
    { name: '잔나', id: 'Janna', initial: 'ㅈㄴ' },
    { name: '잭스', id: 'Jax', initial: 'ㅈㅅ' },
    { name: '제드', id: 'Zed', initial: 'ㅈㄷ' },
    { name: '제라스', id: 'Xerath', initial: 'ㅈㄹㅅ' },
    { name: '제이스', id: 'Jayce', initial: 'ㅈㅇㅅ' },
    { name: '조이', id: 'Zoe', initial: 'ㅈㅇ' },
    { name: '직스', id: 'Ziggs', initial: 'ㅈㅅ' },
    { name: '진', id: 'Jhin', initial: 'ㅈ' },
    { name: '질리언', id: 'Zilean', initial: 'ㅈㄹㅇ' },
    { name: '징크스', id: 'Jinx', initial: 'ㅈㅋㅅ' },
    { name: '초가스', id: 'Chogath', initial: 'ㅊㄱㅅ' },
    { name: '카르마', id: 'Karma', initial: 'ㅋㄹㅁ' },
    { name: '카미유', id: 'Camille', initial: 'ㅋㅁㅇ' },
    { name: '카사딘', id: 'Kassadin', initial: 'ㅋㅅㄷ' },
    { name: '카서스', id: 'Karthus', initial: 'ㅋㅅㅅ' },
    { name: '카시오페아', id: 'Cassiopeia', initial: 'ㅋㅅㅇㅍㅇ' },
    { name: '카이사', id: 'KaiSa', initial: 'ㅋㅇㅅ' },
    { name: '카직스', id: 'Khazix', initial: 'ㅋㅈㅅ' },
    { name: '카타리나', id: 'Katarina', initial: 'ㅋㅌㄹㄴ' },
    { name: '칼리스타', id: 'Kalista', initial: 'ㅋㄹㅅㅌ' },
    { name: '케넨', id: 'Kennen', initial: 'ㅋㄴ' },
    { name: '케이틀린', id: 'Caitlyn', initial: 'ㅋㅇㅌㄹ' },
    { name: '케인', id: 'Kayn', initial: 'ㅋㅇ' },
    { name: '케일', id: 'Kayle', initial: 'ㅋㅇ' },
    { name: '코그모', id: 'KogMaw', initial: 'ㅋㄱㅁ' },
    { name: '코르키', id: 'Corki', initial: 'ㅋㄹㅋ' },
    { name: '퀸', id: 'Quinn', initial: 'ㅋ' },
    { name: '클레드', id: 'Kled', initial: 'ㅋㄹㄷ' },
    { name: '키아나', id: 'Qiyana', initial: 'ㅋㅇㄴ' },
    { name: '킨드레드', id: 'Kindred', initial: 'ㅋㄷㄹㄷ' },
    { name: '타릭', id: 'Taric', initial: 'ㅌㄹ' },
    { name: '탈론', id: 'Talon', initial: 'ㅌㄹ' },
    { name: '탈리야', id: 'Taliyah', initial: 'ㅌㄹㅇ' },
    { name: '탐 켄치', id: 'TahmKench', initial: 'ㅌㅋㅊ' },
    { name: '트런들', id: 'Trundle', initial: 'ㅌㄹㄷ' },
    { name: '트리스타나', id: 'Tristana', initial: 'ㅌㄹㅅㅌㄴ' },
    { name: '트린다미어', id: 'Tryndamere', initial: 'ㅌㄹㄷㅁㅇ' },
    { name: '트위스티드 페이트', id: 'TwistedFate', initial: 'ㅌㅇㅅㅌㄷㅍㅇㅌ' },
    { name: '트위치', id: 'Twitch', initial: 'ㅌㅇㅊ' },
    { name: '티모', id: 'Teemo', initial: 'ㅌㅁ' },
    { name: '파이크', id: 'Pyke', initial: 'ㅍㅇㅋ' },
    { name: '판테온', id: 'Pantheon', initial: 'ㅍㅌㅇ' },
    { name: '피들스틱', id: 'Fiddlesticks', initial: 'ㅍㄷㅅㅌ' },
    { name: '피오라', id: 'Fiora', initial: 'ㅍㅇㄹ' },
    { name: '피즈', id: 'Fizz', initial: 'ㅍㅈ' },
    { name: '하이머딩거', id: 'Heimerdinger', initial: 'ㅎㅇㅁㄷㄱ' },
    { name: '헤카림', id: 'Hecarim', initial: 'ㅎㅋㄹ' }
];

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
    const val = input.value;
    const listEl = input.parentElement.querySelector('.autocomplete-list');
    listEl.innerHTML = '';
    if(!val) return;

    const searchVal = getChoseong(val).toLowerCase();
    const filtered = champions.filter(c => c.name.includes(val) || c.initial.includes(searchVal) || c.id.toLowerCase().includes(val.toLowerCase()));

    filtered.slice(0, 10).forEach(c => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `<img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png"> ${c.name}`;
        li.onclick = () => {
            input.value = c.name;
            const row = input.closest('.player-row');
            row.querySelector('.champ-icon-main').src = `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png`;
            listEl.innerHTML = '';
        };
        listEl.appendChild(li);
    });
}

function addPlayer(team) {
    const list = document.getElementById(`${team}-team-list`);
    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
        <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
        <div class="input-line">
            <img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Garen.png" class="champ-icon-main">
            <div class="champ-input-container">
                <input type="text" class="champ-input" placeholder="ㄱㄹ, 가렌, Garen" oninput="showAutocomplete(this)">
                <ul class="autocomplete-list"></ul>
            </div>
            <select class="lane-select">${lanes.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
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
    const patchMajor = year.toString().slice(-2);
    const patchVersion = `${patchMajor}.${month}`; 
    const dateString = `${year}-${month}-${today.getDate()}`;

    let prompt = `[SYSTEM SETTINGS]
- Date: ${dateString}
- Season: Season 16 (Patch ${patchVersion})
- Language: ${language === 'ko' ? 'Korean' : 'English'}
- User Lane: ${selectedLane}

ALLIES:
`;
    
    document.querySelectorAll('#blue-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(champ) prompt += `- ${lane}: ${champ} (${s1}/${s2}) ${lane === selectedLane ? '[USER]' : ''}\n`;
    });

    prompt += `\nENEMIES:\n`;
    document.querySelectorAll('#red-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(champ) prompt += `- ${lane}: ${champ} (${s1}/${s2})\n`;
    });

    prompt += `\nINSTRUCTIONS:
1. Analyze based on Patch ${patchVersion} meta.
2. Place a 3-line summary card at the top.
3. Provide lane phase and teamfight strategies for the ${selectedLane} user.
4. Recommend latest 2026 item builds.
[RESPONSE MUST BE IN ${language.toUpperCase()}]`;

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

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('champ-input')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => list.innerHTML = '');
    }
});
