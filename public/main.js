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

    let prompt = `[현재 사용자의 라인: ${selectedLane}]\n\n우리팀 조합:\n`;
    
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

    prompt += `\n요청: ${selectedLane} 라이너인 사용자 입장에서 승리 플랜을 짜줘. 
    1. 3줄 핵심 요약 
    2. 상대 ${selectedLane}와의 맞라이전 디테일 (스펠 활용) 
    3. 전체 한타에서의 역할 
    4. 아이템 트리 추천. 아주 간결하고 예쁘게 대답해줘. [응답은 반드시 한국어로만 하세요]`;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
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
