export async function onRequestPost(context) {
  // 1. 환경 변수 위치: onRequest 함수 안쪽 첫 줄에 배치
  const apiKey = context.env.GEMINI_API_KEY;

  try {
    const data = await context.request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!apiKey) {
      return new Response("API 키(GEMINI_API_KEY)가 설정되지 않았습니다.", { status: 500 });
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
    분석 모드: ${analysisMode}
    내 라인: ${myLine}
    최신 패치 기반의 승리 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n승리 플랜 분석 요청.`;

    // 2. API 호출 URL 수정: v1beta 강제 사용 및 모델명 확인
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
      const apiErrorMessage = result?.error?.message || "AI 응답 구조가 올바르지 않습니다.";
      return new Response(`Gemini API 오류: ${apiErrorMessage}`, { status: 500 });
    }

  } catch (error) {
    // 3. 예외 처리: 에러 정체를 바로 드러냄
    return new Response(error.message, { status: 500 });
  }
}
