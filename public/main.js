// ⚠️ 여기에 본인의 API KEY를 입력해야 진짜로 작동합니다!
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

async function startAnalysis() {
    const myChamp = document.getElementById('my-champ').value;
    const opChamp = document.getElementById('op-champ').value;
    const pos = document.getElementById('user-position').value;
    const scale = document.getElementById('fight-scale').value;
    const spell = document.getElementById('my-spell').value;
    const display = document.getElementById('ai-content');
    const container = document.getElementById('result-display');

    if (!myChamp || !opChamp) { 
        alert("챔피언을 입력해주세요!"); 
        return; 
    }

    container.style.display = "block";
    display.innerHTML = "<b>🔥 프로 코치가 리플레이를 분석 중입니다...</b>";

    // Gemini에게 보낼 상세 프롬프트 (설명이 풍부해지는 비결)
    const prompt = `당신은 롤 프로팀 코치입니다. 다음 상황에 대해 아주 상세하고 전문적인 전략을 짜주세요.
    상황: ${pos} 포지션, 내 챔피언 ${myChamp}(${spell}) vs 상대 ${opChamp}.
    상황 종류: ${scale} 상황.
    
    답변 구성:
    1. 핵심 상성 요약
    2. ${scale} 시 구체적인 스킬 콤보 및 스펠 활용법
    3. 아이템 빌드 추천
    4. 주의해야 할 상대 스킬 및 대처법
    
    *결과에 JSON이나 좌표 데이터는 절대 포함하지 말고 깔끔한 텍스트로만 작성하세요.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // 텍스트 정제 및 출력
        display.innerText = text.replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '').trim();

    } catch (error) {
        console.error(error);
        display.innerText = `❌ 분석 중 오류가 발생했습니다: ${error.message}\nAPI 키가 올바른지 확인해주세요.`;
    }
}
