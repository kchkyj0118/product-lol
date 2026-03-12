export async function onRequestPost(context) {
  // 2. 환경 변수: context.env.GEMINI_API_KEY 문장을 반드시 onRequest 함수 내부 첫 줄에 삽입
  const apiKey = context.env.GEMINI_API_KEY;

  try {
    const requestData = await context.request.json();
    const { allies, enemies, myLine, analysisMode } = requestData;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키(GEMINI_API_KEY)가 설정되지 않았습니다." }), { 
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
    분석 모드: ${analysisMode}
    내 라인: ${myLine}
    최신 패치 기반의 승리 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n승리 플랜 분석 요청.`;

    // 1. 모델 및 주소 고정: v1 주소에 gemini-1.5-flash 모델 조합
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    // 3. 강제 텍스트 확인: text()로 먼저 받아서 에러 발생 시 원문 출력
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("Gemini API Error Raw Text:", responseText);
      return new Response(JSON.stringify({ error: `Gemini API 오류 (${response.status}): ${responseText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const data = JSON.parse(responseText);

    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
      const aiText = data.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiText }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      return new Response(JSON.stringify({ error: `AI 응답 구조가 올바르지 않습니다: ${responseText}` }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Runtime Exception:", error.message);
    return new Response(JSON.stringify({ error: `서버 내부 에러: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
