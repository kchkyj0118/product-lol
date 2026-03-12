// ⚠️ 본인의 Gemini API Key를 아래 G_KEY에 입력하세요.
const G_KEY = "여기에_제미나이_API_키를_넣으세요";

const lanes = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const spells = ["점멸", "강타", "점화", "텔포", "탈진", "유체화", "정화", "회복"];

// UI 자동 생성 (정글 선택 시 강타 로직 포함)
function initUI() {
    const blueSide = document.getElementById('blue-team-inputs');
    const redSide = document.getElementById('red-team-inputs');

    if (!blueSide || !redSide) return;

    lanes.forEach(lane => {
        // 블루 사이드 (스펠 선택 포함)
        const bRow = document.createElement('div');
        bRow.className = 'lane-row';
        const isJungle = lane === "JUNGLE";
        
        bRow.innerHTML = `
            <div class="lane-name">${lane}</div>
            <input type="text" class="b-name" placeholder="챔피언 명">
            <select class="b-s1">
                ${spells.map(s => `<option ${s==='점멸'?'selected':''}>${s}</option>`).join('')}
            </select>
            <select class="b-s2">
                ${spells.map(s => `<option ${isJungle && s==='강타'?'selected':''}>${s}</option>`).join('')}
            </select>
        `;
        blueSide.appendChild(bRow);

        // 레드 사이드 (이름만)
        const rRow = document.createElement('div');
        rRow.className = 'lane-row';
        rRow.innerHTML = `
            <div class="lane-name">${lane}</div>
            <input type="text" class="r-name" placeholder="챔피언 명">
        `;
        redSide.appendChild(rRow);
    });
}

async function startAnalysis() {
    const resultDiv = document.getElementById('result-display');
    const bNames = document.querySelectorAll('.b-name');
    const rNames = document.querySelectorAll('.r-name');
    const bS1s = document.querySelectorAll('.b-s1');
    const bS2s = document.querySelectorAll('.b-s2');
    
    let blueTeamData = [];
    let hasBlueChamp = false;
    lanes.forEach((lane, i) => {
        const name = bNames[i].value.trim();
        const s1 = bS1s[i].value;
        const s2 = bS2s[i].value;
        if (name) hasBlueChamp = true;
        blueTeamData.push(`${lane}: ${name || '미정'}(${s1}/${s2})`);
    });

    let redTeamData = [];
    let hasRedChamp = false;
    lanes.forEach((lane, i) => {
        const name = rNames[i].value.trim();
        if (name) hasRedChamp = true;
        redTeamData.push(`${lane}: ${name || '미정'}`);
    });

    if (!hasBlueChamp || !hasRedChamp) {
        alert("최소한 아군과 적군 각각 1명 이상의 챔피언을 입력해주세요!");
        return;
    }

    resultDiv.style.display = "block";
    resultDiv.innerText = "🌀 프로 코치가 팀 조합과 포지션별 상성을 분석 중입니다. 잠시만 기다려주세요...";

    const prompt = `당신은 롤 프로팀 수석 분석관입니다. 다음 데이터를 기반으로 아주 전문적인 리포트를 작성하세요.

    [아군 구성]: ${blueTeamData.join(', ')}
    [적군 구성]: ${redTeamData.join(', ')}

    요청 분석 사항:
    1. 라인별 주도권: 각 포지션별 상성 요약 및 주도권 예측.
    2. 정글 동선 제안: 우리 정글러가 초반에 주력해야 할 라인과 이유.
    3. 한타 핵심: 5대5 한타 시 우리 팀의 이상적인 진입 순서와 타겟팅 우선순위.
    4. 변수 대처: 적의 주요 스킬 중 가장 경계해야 할 것과 그 대처법.

    *전문적인 코칭 용어를 사용하고, JSON이나 불필요한 기호(*, #) 없이 깔끔한 텍스트로만 상세히 답변하세요.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${G_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // 데이터 정제 및 출력
        resultDiv.innerText = text
            .replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
            .replace(/[\*#]/g, '')
            .trim();

    } catch (error) {
        console.error(error);
        resultDiv.innerText = `❌ 분석 중 오류가 발생했습니다: ${error.message}\nAPI 키 입력 상태를 확인해 주세요.`;
    }
}

// 초기화 실행
window.onload = initUI;
