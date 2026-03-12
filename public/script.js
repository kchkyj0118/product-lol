// Champion List
const champions = [
    "가렌", "갈리오", "갱플랭크", "그라가스", "그레이브즈", "나르", "나미", "나서스", "나피리", "노틸러스", "녹턴", "누누와 윌럼프", "니달리", "니코", "닐라", 
    "다리우스", "다이애나", "드레이븐", "라이즈", "라칸", "람머스", "럭스", "럼블", "레나타 글라스크", "레넥톤", "레오나", "렉사이", "렐", "렝가", "루시안", "루루", "르블랑", "리 신", "리븐", "리산드라", "릴리아", 
    "마스터 이", "마오카이", "말자하", "말파이트", "모데카이저", "모르가나", "밀리오", "바드", "바루스", "바이", "베이브", "베이가", "베인", "벨베스", "벨코즈", "볼리베어", "브라움", "브라이어", "브랜드", "블라디미르", "블리츠크랭크", "비에고", "빅토르", "뽀삐", 
    "사미라", "사이온", "사일러스", "샤코", "세나", "세라핀", "세주아니", "세트", "소나", "소라카", "쉔", "쉬바나", "스웨인", "스카너", "스몰더", "시비르", "신 짜오", "신드라", "신지드", "쓰레쉬", 
    "아리", "아무무", "아우렐리온 솔", "아이번", "아지르", "아칼리", "아크샨", "아트록스", "아펠리오스", "알리스타", "애니", "애니비아", "애쉬", "야스오", "에코", "엘리스", "오공", "오로라", "오른", "오리아나", "올라프", "요네", "요릭", "우디르", "우르곳", "워윅", "유미", "이렐리아", "이브린", "이즈리얼", "일라오이", 
    "자르반 4세", "자야", "자이라", "자크", "잔나", "잭스", "제드", "제라스", "제이스", "제리", "조이", "직스", "진", "질리언", "징크스", 
    "초가스", "카르마", "카밀", "카사딘", "카서스", "카시오페아", "카이사", "카직스", "카타리나", "칼리스타", "케넨", "케이틀린", "케인", "케일", "코그모", "코르키", "퀸", "클레드", "키아나", "킨드레드", 
    "타릭", "탈론", "탈리야", "탐 켄치", "트런들", "트리스타나", "트린다미어", "트위스티드 페이트", "트위치", "티모", 
    "파이크", "판테온", "피들스틱", "피오라", "피즈", "하이머딩거", "헤카림", "흐웨이", "암베사", "멜 메다르다", "유나라", "자헨"
];

// State
let selectedLane = null;

// DOM Elements
const championListDatalist = document.getElementById('champion-list');
const laneButtons = document.querySelectorAll('.lane-btn');
const analyzeBtn = document.querySelector('#analyze-btn');
const loading = document.querySelector('#loading');
const resultArea = document.querySelector('#result-area');
const analysisContent = document.querySelector('#analysis-content');

// Populate Datalist
champions.forEach(champ => {
    const option = document.createElement('option');
    option.value = champ;
    championListDatalist.appendChild(option);
});

// Lane Selection logic
laneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        laneButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLane = btn.dataset.lane;
    });
});

// Analyze button click handler
analyzeBtn.addEventListener('click', async () => {
    const allyInputs = document.querySelectorAll('#ally-inputs .champion-input');
    const enemyInputs = document.querySelectorAll('#enemy-inputs .champion-input');
    const analysisMode = document.querySelector('input[name="analysis-mode"]:checked').value;

    const allies = Array.from(allyInputs).map(input => input.value.trim()).filter(v => v !== "");
    const enemies = Array.from(enemyInputs).map(input => input.value.trim()).filter(v => v !== "");

    if (allies.length < 5 || enemies.length < 5) {
        alert("모든 챔피언(각 팀 5명)을 입력해주세요.");
        return;
    }

    if (!selectedLane) {
        alert("내 라인을 선택해주세요.");
        return;
    }

    // Construct prompt for the new backend
    const modeText = analysisMode === 'LANE' ? '1:1 라인전 집중' : analysisMode === 'SKIRMISH' ? '2:2 교전 집중' : '5:5 전체 승리 플랜';
    const fullPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
분석 모드: ${modeText}
내 라인: ${selectedLane}
우리팀: ${allies.join(", ")}
상대팀: ${enemies.join(", ")}
최적의 승리 플랜을 알려줘.`;

    // Show loading state
    resultArea.classList.remove('hidden');
    loading.classList.remove('hidden');
    analysisContent.innerHTML = "";
    analyzeBtn.disabled = true;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: fullPrompt
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Parsing Gemini's standard response format
        let aiText = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            aiText = data.candidates[0].content.parts[0].text;
        } else {
            aiText = "AI 응답을 가져오지 못했습니다.";
        }

        const formattedText = aiText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        analysisContent.innerHTML = formattedText;
    } catch (error) {
        console.error("Analysis failed:", error);
        analysisContent.innerHTML = "분석 중 오류가 발생했습니다: " + error.message;
    } finally {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});
