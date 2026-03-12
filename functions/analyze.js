export async function onRequestPost(context) {
  // 1. API 키 호출부: context.env.GEMINI_API_KEY가 함수 내부 가장 첫 줄에 오도록 함
  const apiKey = context.env.GEMINI_API_KEY;

  try {
    const data = await context.request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키(GEMINI_API_KEY)가 설정되지 않았습니다. Cloudflare 대시보드를 확인해주세요." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
    분석 모드: ${analysisMode}
    내 라인: ${myLine}
    최신 패치 기반의 승리 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n승리 플랜 분석 요청.`;

    // 2. URL 버전: v1 엔드포인트 사용
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const result = await response.json();

    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text) {
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      // 상세 에러 내용을 반환하여 원인 파악 용이하게 수정
      const apiErrorMessage = result?.error?.message || "AI 응답 구조가 올바르지 않습니다.";
      return new Response(JSON.stringify({ error: `Gemini API 오류: ${apiErrorMessage}` }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    // 3. 에러 로그: 실제 에러 내용이 화면에 찍히도록 수정
    return new Response(JSON.stringify({ error: `서버 내부 오류: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
