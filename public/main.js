const spellInfo = { '점멸': 'SummonerFlash', '점화': 'SummonerDot', '텔포': 'SummonerTeleport', '강타': 'SummonerSmite', '탈진': 'SummonerExhaust', '회복': 'SummonerHeal', '정화': 'SummonerBoost', '유체화': 'SummonerHaste', '방어막': 'SummonerBarrier' };
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';
let language = 'ko';

// 2026년 기준 전 챔피언 데이터 (한글명, ID, 초성)
const champions = [
    {name:'가렌',id:'Garen',i:'ㄱㄹ'},{name:'갈리오',id:'Galio',i:'ㄱㄹㅇ'},{name:'갱플랭크',id:'Gangplank',i:'ㄱㅍㄹㅋ'},{name:'그라가스',id:'Gragas',i:'ㄱㄹㄱㅅ'},{name:'그레이브즈',id:'Graves',i:'ㄱㄹㅇㅂㅈ'},{name:'나르',id:'Gnar',i:'ㄴㄹ'},{name:'나미',id:'Nami',i:'ㄴㅁ'},{name:'나서스',id:'Nasus',i:'ㄴㅅㅅ'},{name:'노틸러스',id:'Nautilus',i:'ㄴㅌㄹㅅ'},{name:'녹턴',id:'Nocturne',i:'ㄴㅌ'},{name:'누누와 윌럼프',id:'Nunu',i:'ㄴㄴㅇㅇㄹㅍ'},{name:'니달리',id:'Nidalee',i:'ㄴㄷㄹ'},{name:'니코',id:'Neeko',i:'ㄴㅋ'},{name:'닐라',id:'Nilah',i:'ㄴㄹ'},{name:'다리우스',id:'Darius',i:'ㄷㄹㅇㅅ'},{name:'다이애나',id:'Diana',i:'ㄷㅇㅇㄴ'},{name:'드레이븐',id:'Draven',i:'ㄷㄹㅇㅂ'},{name:'라이즈',id:'Ryze',i:'ㄹㅇㅈ'},{name:'라칸',id:'Rakan',i:'ㄹㅋ'},{name:'람머스',id:'Armordillo',i:'ㄹㅁㅅ'},{name:'럭스',id:'Lux',i:'ㄹㅅ'},{name:'럼블',id:'Rumble',i:'ㄹㅂ'},{name:'레나타 글라스크',id:'Renata',i:'ㄹㄴㅌㄱㄹㅅㅋ'},{name:'레넥톤',id:'Renekton',i:'ㄹㄴㅌ'},{name:'레오나',id:'Leona',i:'ㄹㅇㄴ'},{name:'렉사이',id:'RekSai',i:'ㄹㅅㅇ'},{name:'렐',i:'Rell',i:'ㄹ'},{name:'렌가',id:'Rengar',i:'ㄹㄱ'},{name:'루시안',id:'Lucian',i:'ㄹㅅㅇ'},{name:'루루',id:'Lulu',i:'ㄹㄹ'},{name:'르블랑',id:'LeBlanc',i:'ㄹㅂㄹ'},{name:'리 신',id:'LeeSin',i:'ㄹㅅ'},{name:'리븐',id:'Riven',i:'ㄹㅂ'},{name:'리산드라',id:'Lissandra',i:'ㄹㅅㄷㄹ'},{name:'릴리아',id:'Lillia',i:'ㄹㄹㅇ'},{name:'마스터 이',id:'MasterYi',i:'ㅁㅅㅌㅇ'},{name:'마오카이',id:'Maokai',i:'ㅁㅇㅋㅇ'},{name:'말자하',id:'Malzahar',i:'ㅁㅈㅎ'},{name:'말파이트',id:'Malphite',i:'ㅁㅍㅇㅌ'},{name:'모데카이저',id:'Mordekaiser',i:'ㅁㄷㅋㅇㅈ'},{name:'모르가나',id:'Morgana',i:'ㅁㄹㄱㄴ'},{name:'문도 박사',id:'DrMundo',i:'ㅁㄷㅂㅅ'},{name:'미스 포츈',id:'MissFortune',i:'ㅁㅅㅍㅊ'},{name:'밀리오',id:'Milio',i:'ㅁㄹㅇ'},{name:'바드',id:'Bard',i:'ㅂㄷ'},{name:'바루스',id:'Varus',i:'ㅂㄹㅅ'},{name:'바이',id:'Vi',i:'ㅂㅇ'},{name:'베이가',id:'Veigar',i:'ㅂㅇㄱ'},{name:'베인',id:'Vayne',i:'ㅂㅇ'},{name:'벨베스',id:'Belveth',i:'ㅂㅂㅅ'},{name:'벨코즈',id:'Velkoz',i:'ㅂㅋㅈ'},{name:'볼리베어',id:'Volibear',i:'ㅂㄹㅂㅇ'},{name:'브라움',id:'Braum',i:'ㅂㄹㅇ'},{name:'브라이어',id:'Briar',i:'ㅂㄹㅇㅇ'},{name:'브랜드',id:'Brand',i:'ㅂㄹㄷ'},{name:'블라디미르',id:'Vladimir',i:'ㅂㄹㄷㅁㄹ'},{name:'블리츠크랭크',id:'Blitzcrank',i:'ㅂㄹㅊㅋㄹㅋ'},{name:'비에고',id:'Viego',i:'ㅂㅇㄱ'},{name:'빅토르',id:'Viktor',i:'ㅂㅌㄹ'},{name:'뽀삐',id:'Poppy',i:'ㅃㅃ'},{name:'사미라',id:'Samira',i:'ㅅㅁㄹ'},{name:'사이온',id:'Sion',i:'ㅅㅇㅇ'},{name:'사일러스',id:'Sylas',i:'ㅅㅇㄹㅅ'},{name:'샤코',id:'Shaco',i:'ㅅㅋ'},{name:'세나',id:'Senna',i:'ㅅㄴ'},{name:'세라핀',id:'Seraphine',i:'ㅅㄹㅍ'},{name:'세주아니',id:'Sejuani',i:'ㅅㅈㅇㄴ'},{name:'세트',id:'Sett',i:'ㅅㅌ'},{name:'소나',id:'Sona',i:'ㅅㄴ'},{name:'소라카',id:'Soraka',i:'ㅅㄹㅋ'},{name:'쉔',id:'Shen',i:'ㅅ'},{name:'쉬바나',id:'Shyvana',i:'ㅅㅂㄴ'},{name:'스웨인',id:'Swain',i:'ㅅㅇㅇ'},{name:'스카너',id:'Skarner',i:'ㅅㅋㄴ'},{name:'스모더',id:'Smolder',i:'ㅅㅁㄷ'},{name:'시비르',id:'Sivir',i:'ㅅㅂㄹ'},{name:'신 짜오',id:'XinZhao',i:'ㅅㅉㅇ'},{name:'신드라',id:'Syndra',i:'ㅅㄷㄹ'},{name:'신지드',id:'Singed',i:'ㅅㅈㄷ'},{name:'쓰레쉬',id:'Thresh',i:'ㅆㄹㅅ'},{name:'아리',id:'Ahri',i:'ㅇㄹ'},{name:'아무무',id:'Amumu',i:'ㅇㅁㅁ'},{name:'아우렐리온 솔',id:'AurelionSol',i:'ㅇㅇㄹㄹㅇㅅ'},{name:'아이번',id:'Ivern',i:'ㅇㅇㅂ'},{name:'아지르',id:'Azir',i:'ㅇㅈㄹ'},{name:'아칼리',id:'Akali',i:'ㅇㅋㄹ'},{name:'아크샨',id:'Akshan',i:'ㅇㅋㅅ'},{name:'아트록스',id:'Aatrox',i:'ㅇㅌㄹㅅ'},{name:'아펠리오스',id:'Aphelios',i:'ㅇㅍㄹㅇㅅ'},{name:'알리스타',id:'Alistar',i:'ㅇㄹㅅㅌ'},{name:'애니',id:'Annie',i:'ㅇㄴ'},{name:'애니비아',id:'Anivia',i:'ㅇㄴㅂㅇ'},{name:'애쉬',id:'Ashe',i:'ㅇㅅ'},{name:'야스오',id:'Yasuo',i:'ㅇㅅㅇ'},{name:'에코',id:'Ekko',i:'ㅇㅋ'},{name:'엘리스',id:'Elise',i:'ㅇㄹㅅ'},{name:'오공',id:'MonkeyKing',i:'ㅇㄱ'},{name:'오른',id:'Ornn',i:'ㅇㄹ'},{name:'오리아나',id:'Orianna',i:'ㅇㄹㅇㄴ'},{name:'올라프',id:'Olaf',i:'ㅇㄹㅍ'},{name:'요네',id:'Yone',i:'ㅇㄴ'},{name:'요릭',id:'Yorick',i:'ㅇㄹ'},{name:'우디르',id:'Udyr',i:'ㅇㄷㄹ'},{name:'우르곳',id:'Urgot',i:'ㅇㄹㄱ'},{name:'워윅',id:'Warwick',i:'ㅇㅇ'},{name:'유미',id:'Yuumi',i:'ㅇㅁ'},{name:'이렐리아',id:'Irelia',i:'ㅇㄹㄹㅇ'},{name:'이벨린',id:'Evelynn',i:'ㅇㅂㄹ'},{name:'이즈리얼',id:'Ezreal',i:'ㅇㅈㄹㅇ'},{name:'일라오이',id:'Illaoi',i:'ㅇㄹㅇㅇ'},{name:'자르반 4세',id:'JarvanIV',i:'ㅈㄹㅂ4ㅅ'},{name:'자야',id:'Xayah',i:'ㅈㅇ'},{name:'자이라',id:'Zyra',i:'ㅈㅇㄹ'},{name:'자크',id:'Zac',i:'ㅈㅋ'},{name:'잔나',id:'Janna',i:'ㅈㄴ'},{name:'잭스',id:'Jax',i:'ㅈㅅ'},{name:'제드',id:'Zed',i:'ㅈㄷ'},{name:'제라스',id:'Xerath',i:'ㅈㄹㅅ'},{name:'제리',id:'Zeri',i:'ㅈㄹ'},{name:'제이스',id:'Jayce',i:'ㅈㅇㅅ'},{name:'조이',id:'Zoe',i:'ㅈㅇ'},{name:'직스',id:'Ziggs',i:'ㅈㄱㅅ'},{name:'진',id:'Jhin',i:'ㅈ'},{name:'질리언',id:'Zilean',i:'ㅈㄹㅇ'},{name:'징크스',id:'Jinx',i:'ㅈㅋㅅ'},{name:'초가스',id:'Chogath',i:'ㅊㄱㅅ'},{name:'카르마',id:'Karma',i:'ㅋㄹㅁ'},{name:'카밀',id:'Camille',i:'ㅋㅁ'},{name:'카사딘',id:'Kassadin',i:'ㅋㅅㄷ'},{name:'카서스',id:'Karthus',i:'ㅋㅅㅅ'},{name:'카시오페아',id:'Cassiopeia',i:'ㅋㅅㅇㅍㅇ'},{name:'카이사와',id:'KaiSa',i:'ㅋㅇㅅ'},{name:'카직스',id:'Khazix',i:'ㅋㅈㅅ'},{name:'카타리나',id:'Katarina',i:'ㅋㅌㄹㄴ'},{name:'칼리스타',id:'Kalista',i:'ㅋㄹㅅㅌ'},{name:'케넨',id:'Kennen',i:'ㅋㄴ'},{name:'케이틀린',id:'Caitlyn',i:'ㅋㅇㅌㄹ'},{name:'케인',id:'Kayn',i:'ㅋㅇ'},{name:'케일',id:'Kayle',i:'ㅋㅇ'},{name:'코그모',id:'KogMaw',i:'ㅋㄱㅁ'},{name:'코르키',id:'Corki',i:'ㅋㄹㅋ'},{name:'클레드',id:'Kled',i:'ㅋㄹㄷ'},{name:'키아나',id:'Qiyana',i:'ㅋㅇㄴ'},{name:'킨드레드',id:'Kindred',i:'ㅋㄷㄹㄷ'},{name:'타릭',id:'Taric',i:'ㅌㄹ'},{name:'탈론',id:'Talon',i:'ㅌㄹ'},{name:'탈리야',id:'Taliyah',i:'ㅌㄹㅇ'},{name:'탐 켄치',id:'TahmKench',i:'ㅌㅋㅊ'},{name:'트런들',id:'Trundle',i:'ㅌㄹㄷ'},{name:'트리스타나',id:'Tristana',i:'ㅌㄹㅅㅌㄴ'},{name:'트린다미어',id:'Tryndamere',i:'ㅌㄹㄷㅁㅇ'},{name:'트위스티드 페이트',id:'TwistedFate',i:'ㅌㅇㅅㅌㄷㅍㅇㅌ'},{name:'트위치',id:'Twitch',i:'ㅌㅇㅊ'},{name:'티모',id:'Teemo',i:'ㅌㅁ'},{name:'파이크',id:'Pyke',i:'ㅍㅇㅋ'},{name:'판테온',id:'Pantheon',i:'ㅍㅌㅇ'},{name:'피들스틱',id:'Fiddlesticks',i:'ㅍㄷㅅㅌ'},{name:'피오라',id:'Fiora',i:'ㅍㅇㄹ'},{name:'피즈',id:'Fizz',i:'ㅍㅈ'},{name:'하이머딩거',id:'Heimerdinger',i:'ㅎㅇㅁㄷㄱ'},{name:'헤카림',id:'Hecarim',i:'ㅎㅋㄹ'},{name:'흐웨이',id:'Hwei',i:'ㅎㅇ'}
];

// 초성 추출 함수
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

// 자동완성 표시
function showAutocomplete(input) {
    const val = input.value.trim();
    const listEl = input.parentElement.querySelector('.autocomplete-list');
    listEl.innerHTML = '';
    if(!val) return;

    const searchVal = getChoseong(val).toLowerCase();
    const filtered = champions.filter(c => c.name.includes(val) || c.i.includes(searchVal) || c.id.toLowerCase().includes(val.toLowerCase()));

    filtered.slice(0, 8).forEach(c => { // 최대 8개만 표시
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `<img src="https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png"> ${c.name}`;
        li.onclick = () => {
            input.value = c.name;
            const row = input.closest('.player-row');
            const iconImg = row.querySelector('.champ-icon-main');
            iconImg.src = `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${c.id}.png`;
            iconImg.classList.add('active'); // 이미지를 보여줌
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
                <input type="text" class="champ-input" placeholder="챔피언 검색" oninput="showAutocomplete(this)">
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
    
    let prompt = `[Patch ${patchVersion}] [내 라인: ${selectedLane}] 분석 요청.\n\n우리팀:\n`;
    document.querySelectorAll('#blue-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        if(champ) prompt += `- ${lane}: ${champ} ${lane === selectedLane ? '[사용자]' : ''}\n`;
    });
    prompt += `\n상대팀:\n`;
    document.querySelectorAll('#red-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        if(champ) prompt += `- ${lane}: ${champ}\n`;
    });

    prompt += "\n1. 3줄 핵심 요약 2. 라인전 설계 3. 최신 아이템 빌드 (2026 메타 반영). 마크다운으로 예쁘게 구성해줘. [응답은 반드시 한국어로만 하세요]";

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
            content.innerHTML = `<div class="result-header"><h3>분석 결과 (Patch ${patchVersion})</h3><button class="copy-btn" onclick="copyResult()">복사</button></div><div class="analysis-text">${aiText}</div>`;
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
