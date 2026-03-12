// ⚠️ 본인의 API KEY를 입력하세요.
const G_KEY = "발급받으신_GEMINI_KEY"; 

async function runGlobalAnalysis() {
    const myChamp = document.getElementById('my-champ').value;
    const mySpell1 = document.getElementById('my-spell-1').value;
    const mySpell2 = document.getElementById('my-spell-2').value;
    
    const allies = [
        myChamp,
        document.getElementById('my-team-2').value,
        document.getElementById('my-team-3').value,
        document.getElementById('my-team-4').value,
        document.getElementById('my-team-5').value
    ].filter(name => name).join(', ');

    const enemies = [
        document.getElementById('op-champ-1').value,
        document.getElementById('op-champ-2').value,
        document.getElementById('op-champ-3').value,
        document.getElementById('op-champ-4').value,
        document.getElementById('op-champ-5').value
    ].filter(name => name).join(', ');

    const scale = document.getElementById('fight-scale').value;
    const resultDiv = document.getElementById('analysis-result');
    const loading = document.getElementById('loading-bar');

    if(!myChamp) { 
        alert("내 챔피언을 입력해주세요."); 
        return; 
    }

    loading.style.display = "block";
    resultDiv.style.display = "none";

    const prompt = `당신은 롤 프로팀 수석 분석관입니다. 다음 팀 조합을 바탕으로 ${scale} 상황에서의 승리 전략을 제시하세요.

    [팀 구성]
    - 아군: ${allies} (본인: ${myChamp} / 스펠: ${mySpell1}, ${mySpell2})
    - 적군: ${enemies}

    [분석 요청 항목]
    1. 조합 상성 분석 (이니시, 유지력, 포킹 등)
    2. 본인(${myChamp})의 핵심 역할과 한타 포지셔닝
    3. 반드시 마크해야 할 적군 핵심 챔피언과 대처법
    4. ${scale} 시 승리를 위한 결정적 한 수 (스킬 연계 등)

    *전문 용어를 사용하되, JSON/좌표/불필요한 기호는 생략하고 깔끔한 텍스트 리포트로 작성하세요.`;

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

        loading.style.display = "none";
        resultDiv.style.display = "block";
        
        // 정제 로직: JSON, 좌표, 마크다운 기호 제거
        resultDiv.innerText = text
            .replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
            .replace(/[\*#]/g, '')
            .trim();

    } catch (error) {
        console.error(error);
        loading.style.display = "none";
        resultDiv.style.display = "block";
        resultDiv.innerText = `분석 중 오류가 발생했습니다: ${error.message}\nAPI 키를 확인해주세요.`;
    }
}
