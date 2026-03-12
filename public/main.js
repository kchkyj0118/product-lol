// ⚠️ 본인의 Gemini API Key를 아래 G_KEY에 입력하세요.
const G_KEY = "여기에_제미나이_API_키를_넣으세요";

async function analyzeMatchup() {
    const resultDiv = document.getElementById('result-display');
    
    // 데이터 수집
    const myChamp = document.getElementById('my-1').value;
    const s1 = document.getElementById('s1-1').value;
    const s2 = document.getElementById('s1-2').value;

    const myTeamArr = [
        myChamp,
        document.getElementById('my-2').value,
        document.getElementById('my-3').value,
        document.getElementById('my-4').value,
        document.getElementById('my-5').value
    ].filter(n => n);

    const opTeamArr = [
        document.getElementById('op-1').value,
        document.getElementById('op-2').value,
        document.getElementById('op-3').value,
        document.getElementById('op-4').value,
        document.getElementById('op-5').value
    ].filter(n => n);

    if(!myChamp || opTeamArr.length === 0) { 
        alert("최소한 본인과 상대 챔피언은 입력해야 합니다!"); 
        return; 
    }

    const myTeam = myTeamArr.join(', ');
    const opTeam = opTeamArr.join(', ');
    const fightScale = document.getElementById('fight-scale').value;

    resultDiv.style.display = "block";
    resultDiv.innerText = "🌀 AI 코치가 팀 조합 상성을 분석 중입니다. 잠시만 기다려주세요...";

    const prompt = `당신은 롤 프로팀 헤드 코치입니다. 다음 상황을 아주 전문적으로 분석하세요.
    - 아군 조합: ${myTeam} (나: ${myChamp}, 스펠: ${s1}/${s2})
    - 적군 조합: ${opTeam}
    - 상황: ${fightScale} 한타 상황.

    [요청 분석 리포트]
    1. 팀 조합 상성 요약: 어느 쪽이 한타 기여도가 더 높은가?
    2. 타겟 우선순위: 한타 발생 시 내가 무조건 먼저 잡아야 할 적 핵심 챔피언 2명.
    3. 승리 전략: 우리 팀이 한타에서 이기기 위한 진입 시점과 포지셔닝.
    4. 주의 사항: 적의 위협적인 스킬 콤보와 대처법.

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
