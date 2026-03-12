const lanes = ['탑', '정글', '미드', '원딜', '서포터'];
let currentMode = '5v5';

function initInputs() {
    const blueDiv = document.getElementById('blue-inputs');
    const redDiv = document.getElementById('red-inputs');
    blueDiv.innerHTML = ''; redDiv.innerHTML = '';

    lanes.forEach((lane, index) => {
        blueDiv.innerHTML += createInputGroup('blue', lane, index);
        redDiv.innerHTML += createInputGroup('red', lane, index);
    });
    updateView();
}

function createInputGroup(team, lane, index) {
    return `
        <div class="input-group" data-lane="${lane}">
            <input type="text" id="${team}-champ-${index}" placeholder="${lane} 챔피언">
            <select id="${team}-spell-${index}" class="spell-select">
                <option value="점멸">점멸</option>
                <option value="점화">점화</option>
                <option value="텔포">텔포</option>
                <option value="강타">강타</option>
                <option value="탈진">탈진</option>
                <option value="회복">회복</option>
                <option value="정화">정화</option>
            </select>
        </div>`;
}

function setMode(mode, event) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateView();
}

function updateView() {
    const myLane = document.getElementById('my-lane').value;
    const allGroups = document.querySelectorAll('.input-group');

    allGroups.forEach(group => {
        const lane = group.getAttribute('data-lane');
        group.classList.remove('hidden');

        if (currentMode === '1v1') {
            if (lane !== myLane) group.classList.add('hidden');
        } else if (currentMode === '2v2') {
            if (myLane === '원딜' || myLane === '서포터') {
                if (lane !== '원딜' && lane !== '서포터') group.classList.add('hidden');
            } else {
                if (lane !== myLane && lane !== '정글') group.classList.add('hidden');
            }
        }
    });
}

async function startAnalysis() {
    const myLane = document.getElementById('my-lane').value;
    const resultArea = document.getElementById('result');
    const loading = document.getElementById('loading');
    const content = document.getElementById('analysis-content');
    const btn = document.getElementById('analyze-btn');

    // Collect data
    const blueTeam = [];
    const redTeam = [];
    
    lanes.forEach((lane, i) => {
        const blueChamp = document.getElementById(`blue-champ-${i}`).value;
        const blueSpell = document.getElementById(`blue-spell-${i}`).value;
        const redChamp = document.getElementById(`red-champ-${i}`).value;
        const redSpell = document.getElementById(`red-spell-${i}`).value;
        
        if (blueChamp) blueTeam.push(`${lane}: ${blueChamp}(${blueSpell})`);
        if (redChamp) redTeam.push(`${lane}: ${redChamp}(${redSpell})`);
    });

    if (blueTeam.length === 0 || redTeam.length === 0) {
        alert("챔피언 이름을 입력해주세요.");
        return;
    }

    const prompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
분석 모드: ${currentMode}
내 라인: ${myLane}
우리팀 조합: ${blueTeam.join(", ")}
상대팀 조합: ${redTeam.join(", ")}
현재 메타와 상성을 고려하여 승리 플랜을 아주 구체적으로 분석해줘.`;

    // UI Feedback
    resultArea.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.innerHTML = '';
    btn.disabled = true;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();
        
        if (data.error) {
            content.innerHTML = `<span style="color: #ef4444;">오류: ${data.error}</span>`;
        } else {
            // Check for Gemini response structure
            let aiText = "";
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                aiText = data.candidates[0].content.parts[0].text;
            } else {
                aiText = JSON.stringify(data);
            }
            content.innerText = aiText;
        }
    } catch (e) {
        content.innerHTML = `<span style="color: #ef4444;">시스템 오류: ${e.message}</span>`;
    } finally {
        loading.classList.add('hidden');
        btn.disabled = false;
    }
}

// Initialize
window.onload = initInputs;
