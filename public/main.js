const spells = ['점멸', '점화', '텔포', '강타', '탈진', '회복', '정화', '유체화', '방어막'];
const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let selectedLane = '탑';

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
            <select class="lane-select">
                ${lanes.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
            <input type="text" class="champ-input" placeholder="챔피언 이름">
        </div>
        <div class="spell-row">
            <select class="spell-select s1">${spells.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            <select class="spell-select s2">${spells.map((s,i) => `<option value="${s}" ${i==2?'selected':''}>${s}</option>`).join('')}</select>
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

    // [핵심] 현재 날짜를 실시간으로 가져오는 코드
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    let prompt = `[분석 기준 일자: ${dateString}]\n`;
    prompt += `[현재 시즌 메타 및 최신 패치 노트 데이터 적용 요청]\n`;
    prompt += `[사용자 라인: ${selectedLane}]\n\n우리팀 조합:\n`;
    
    document.querySelectorAll('#blue-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(champ) prompt += `- ${lane}: ${champ} (스펠: ${s1}, ${s2}) ${lane === selectedLane ? '[★ 사용자 캐릭터]' : ''}\n`;
    });

    prompt += `\n상대팀 조합:\n`;
    document.querySelectorAll('#red-team-list .player-row').forEach(row => {
        const lane = row.querySelector('.lane-select').value;
        const champ = row.querySelector('.champ-input').value;
        const s1 = row.querySelector('.s1').value;
        const s2 = row.querySelector('.s2').value;
        if(champ) prompt += `- ${lane}: ${champ} (스펠: ${s1}, ${s2})\n`;
    });

    prompt += `\n분석 지침:
1. 위 제공된 [분석 기준 일자]를 바탕으로, 해당 시점의 최신 롤 패치 버전과 메타를 반영해라.
2. 구버전 아이템 빌드는 지양하고, 현재 가장 높은 승률을 기록 중인 1~3코어 빌드를 추천해라.
3. 3줄 핵심 요약 / 상대 ${selectedLane} 라이너와의 상성 분석 / 추천 아이템 순서대로 답변해줘. [응답은 반드시 한국어로만 하세요]`;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        const result = await response.json();
        
        if (result.error) {
            content.innerText = "오류: " + result.error;
        } else {
            // Check for Gemini response structure
            let aiText = "";
            if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
                aiText = result.candidates[0].content.parts[0].text;
            } else {
                aiText = JSON.stringify(result);
            }
            content.innerText = aiText;
        }
    } catch (e) {
        content.innerText = "오류 발생: " + e.message;
    } finally {
        loading.classList.add('hidden');
        btn.disabled = false;
    }
}

// 초기 기본 생성
window.onload = () => {
    addPlayer('blue');
    addPlayer('red');
};
