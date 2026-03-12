const champions = [
  "가렌", "갈리오", "갱플랭크", "그라가스", "그레이브즈", "나르", "나미", "나서스", "노틸러스", "녹턴",
  "누누와 윌럼프", "니달리", "니코", "닐라", "다리우스", "다이애나", "드레이븐", "라이즈", "라칸", "람머스",
  "럭스", "럼블", "레나타 글라스크", "레넥톤", "레오나", "렉사이", "렐", "렝가", "루시안", "루루",
  "르블랑", "리 신", "리븐", "리산드라", "릴리아", "마스터 이", "마오카이", "말파이트", "말자하", "모데카이저",
  "모르가나", "문도 박사", "미스 포츈", "밀리오", "바드", "바루스", "바이", "베이브", "베이가", "베인",
  "벨베스", "벨코즈", "볼리베어", "브라움", "브라이어", "브랜드", "블라디미르", "블리츠크랭크", "비에고", "빅토르",
  "뽀삐", "사미라", "사이온", "사일러스", "샤코", "세나", "세라핀", "세주아니", "세트", "소나",
  "소라카", "쉔", "쉬바나", "스웨인", "스카너", "스몰더", "시비르", "신 짜오", "신드라", "신지드",
  "아리", "아무무", "아우렐리온 솔", "아이번", "아지르", "아칼리", "아크샨", "아트록스", "아펠리오스", "알리스타",
  "애니", "애니비아", "애쉬", "엘리스", "오공", "오른", "오리아나", "올라프", "요네", "요릭",
  "우디르", "우르곳", "워윅", "유미", "이렐리아", "이브린", "이즈리얼", "일라오이", "자르반 4세", "자야",
  "자이라", "자크", "잔나", "잭스", "제드", "제라스", "제이스", "제리", "조이", "직스",
  "진", "질리언", "징크스", "초가스", "카르마", "카밀", "카사딘", "카서스", "카시오페아", "카이사",
  "카직스", "카타리나", "칼리스타", "케넨", "케이틀린", "케인", "케일", "코그모", "코르키", "퀸",
  "클레드", "키아나", "킨드레드", "타릭", "탈론", "탈리야", "탐 켄치", "트런들", "트리스타나", "트린다미어",
  "트위스티드 페이트", "트위치", "티모", "파이크", "판테온", "피들스틱", "피오라", "피즈", "하이머딩거", "헤카림", "흐웨이"
];

let selectedAllies = Array(5).fill(null);
let selectedEnemies = Array(5).fill(null);
let myRole = null;
let currentTarget = null;

const allySlots = document.getElementById('ally-slots');
const enemySlots = document.getElementById('enemy-slots');
const roleButtons = document.querySelectorAll('.role-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const championModal = document.getElementById('champion-modal');
const championList = document.getElementById('champion-list');
const championSearch = document.getElementById('champion-search');
const loading = document.getElementById('loading');
const resultArea = document.getElementById('result-area');

// 초기화: 챔피언 리스트 생성
function renderChampionList(filter = '') {
  championList.innerHTML = '';
  champions.filter(name => name.includes(filter)).forEach(name => {
    const item = document.createElement('div');
    item.className = 'champ-item';
    item.innerHTML = `
      <div style="width:60px; height:60px; background:#050b13; border:1px solid #1e2328; display:flex; align-items:center; justify-content:center; font-size:10px; color:#a09b8c;">${name}</div>
      <p>${name}</p>
    `;
    item.onclick = () => selectChampion(name);
    championList.appendChild(item);
  });
}

// 챔피언 슬롯 클릭 이벤트
[...allySlots.children, ...enemySlots.children].forEach(slot => {
  slot.onclick = () => {
    currentTarget = {
      team: slot.dataset.team,
      index: parseInt(slot.dataset.index)
    };
    championModal.classList.remove('hidden');
    championSearch.value = '';
    renderChampionList();
  };
});

// 챔피언 선택 처리
function selectChampion(name) {
  const { team, index } = currentTarget;
  const slot = document.querySelector(`.slot[data-team="${team}"][data-index="${index}"]`);
  
  if (team === 'ally') {
    selectedAllies[index] = name;
  } else {
    selectedEnemies[index] = name;
  }

  slot.classList.add('selected');
  slot.innerHTML = `<div style="font-size:12px; font-weight:bold; color:var(--accent-gold); text-align:center; padding:5px;">${name}</div>`;
  slot.style.backgroundImage = 'none';
  
  championModal.classList.add('hidden');
  checkReady();
}

// 라인 선택 처리
roleButtons.forEach(btn => {
  btn.onclick = () => {
    roleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    myRole = btn.dataset.role;
    checkReady();
  };
});

// 분석 버튼 활성화 체크
function checkReady() {
  const allAllies = selectedAllies.every(c => c !== null);
  const allEnemies = selectedEnemies.every(c => c !== null);
  analyzeBtn.disabled = !(allAllies && allEnemies && myRole);
}

// 검색 기능
championSearch.oninput = (e) => renderChampionList(e.target.value);

// 모달 닫기
document.querySelector('.close-modal').onclick = () => championModal.classList.add('hidden');

// 분석 시작
analyzeBtn.onclick = async () => {
  analyzeBtn.disabled = true;
  loading.classList.remove('hidden');
  resultArea.classList.add('hidden');

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allies: selectedAllies,
        enemies: selectedEnemies,
        myRole: myRole
      })
    });

    const data = await response.json();
    if (data.result) {
      displayResult(data.result);
    } else {
      alert(data.error || '분석 중 오류가 발생했습니다.');
    }
  } catch (error) {
    alert('서버 통신 오류가 발생했습니다.');
  } finally {
    loading.classList.add('hidden');
    analyzeBtn.disabled = false;
  }
};

function displayResult(text) {
  const sections = text.split(/초반|중반|후반/);
  // 정규식 분할 특성상 첫 번째 요소는 비어있을 수 있음
  const resultParts = text.match(/(초반|중반|후반)[\s\S]+?(?=(초반|중반|후반|$))/g);

  if (resultParts) {
    resultParts.forEach(part => {
      const content = part.replace(/^(초반|중반|후반)\W*/, '').trim();
      if (part.startsWith('초반')) document.querySelector('#early-game .content').innerText = content;
      if (part.startsWith('중반')) document.querySelector('#mid-game .content').innerText = content;
      if (part.startsWith('후반')) document.querySelector('#late-game .content').innerText = content;
    });
  } else {
    // 매칭 실패 시 전체 텍스트를 초반 섹션에라도 표시
    document.querySelector('#early-game .content').innerText = text;
  }

  resultArea.classList.remove('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth' });
}

renderChampionList();
