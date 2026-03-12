export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY;

  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키 설정이 필요합니다." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
    분석 모드: ${analysisMode}
    내 라인: ${myLine}
    최신 패치 기반의 승리 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n승리 플랜 분석 요청.`;

    // 1. API 호출 URL 수정: v1 엔드포인트 강제 고정
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const result = await response.json();

    // 2. 예외 처리 추가: candidates가 없으면 혼잡 메시지 반환
    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text) {
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      console.error("Gemini API Error or No Candidates:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "현재 분석 서버가 혼잡합니다. 잠시 후 다시 시도해주세요." }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Runtime Exception:", error.message);
    return new Response(JSON.stringify({ error: "현재 분석 서버가 혼잡합니다. 잠시 후 다시 시도해주세요." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
