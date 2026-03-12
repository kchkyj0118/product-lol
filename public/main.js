// ⚠️ 본인의 API KEY를 입력하세요.
const G_KEY = "발급받으신_GEMINI_KEY"; 

async function runGlobalAnalysis() {
    const myChamp = document.getElementById('my-champ').value;
    const s1 = document.getElementById('my-spell-1').value;
    const s2 = document.getElementById('my-spell-2').value;

    // 10명의 챔피언 정보 수집
    const myTeam = [
        myChamp,
        document.getElementById('my-team-2').value,
        document.getElementById('my-team-3').value,
        document.getElementById('my-team-4').value,
        document.getElementById('my-team-5').value
    ].filter(name => name).join(', ');

    const enemyTeam = [
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

    // 유저가 요청한 상세 프롬프트 구조 적용
    const prompt = `당신은 롤 프로팀 헤드 코치입니다.
    [아군 구성]: ${myTeam} (나는 ${myChamp}, 스펠: ${s1}/${s2})
    [적군 구성]: ${enemyTeam}
    [상황]: ${scale} 상황.

    분석 요청 사항:
    1. 양 팀의 한타 상성 (누가 더 한타가 유리한가?)
    2. 한타 시 내가 1순위로 노려야 할 적군 챔피언 (타겟팅 최우선순위)
    3. 우리 팀의 승리 플랜 (포지셔닝 및 스킬 연계 방법)
    4. 주의해야 할 적의 광역 CC기 또는 변수 스킬.

    *전문 용어를 섞어서 아주 상세하게 리포트하세요. 텍스트로만 답변하세요. 
    JSON, 좌표, 불필요한 기호(*, #)는 절대 포함하지 마세요.`;

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
