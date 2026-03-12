// ⚠️ 본인의 API KEY를 입력하세요.
const G_KEY = "발급받으신_GEMINI_KEY"; 

async function runProAnalysis() {
    const my = document.getElementById('myChamp').value;
    const op = document.getElementById('opChamp').value;
    const scale = document.getElementById('fightScale').value;
    const spell = document.getElementById('mySpell').value;
    const resultDiv = document.getElementById('analysis-result');
    const loading = document.getElementById('loading-bar');

    if(!my || !op) { 
        alert("챔피언을 모두 입력해주세요."); 
        return; 
    }

    loading.style.display = "block";
    resultDiv.style.display = "none";

    // 상세 프롬프트 (유저들이 감탄할 수 있게 구성)
    const prompt = `당신은 롤 프로팀 수석 코치입니다.
    데이터 분석: 내 챔피언 ${my}(${spell}) vs 상대 챔피언 ${op}
    상황: ${scale} 교전 상황.

    다음 항목을 아주 상세하고 전문적으로 분석하세요:
    1. [상성 분석] 초반 주도권과 스펠 유불리.
    2. [교전 핵심] ${scale} 발생 시 반드시 지켜야 할 포지셔닝과 스킬 콤보.
    3. [변수 차단] 상대 ${op}의 핵심 스킬 대처법.
    4. [최종 결론] 이 교전의 승률과 추천 행동 방향.

    *불필요한 데이터(JSON, 좌표)는 출력하지 말고 오직 전략 리포트만 작성하세요.`;

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
        
        // 마크다운 형식이나 불필요한 기호 정제 (JSON/좌표 regex 포함)
        resultDiv.innerText = text
            .replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
            .replace(/[\*#]/g, '')
            .trim();

    } catch (error) {
        console.error(error);
        loading.style.display = "none";
        resultDiv.style.display = "block";
        resultDiv.innerText = `분석 중 오류가 발생했습니다: ${error.message}\nAPI 키가 올바른지 확인해주세요.`;
    }
}
