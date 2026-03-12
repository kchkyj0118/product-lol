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

    // 1. 가장 표준적인 v1 / gemini-1.5-flash 조합 사용
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    let result = await response.json();

    // 2. 만약 v1에서 실패할 경우 v1beta로 자동 재시도 (철저한 방어)
    if (result.error && (result.error.status === "NOT_FOUND" || result.error.code === 404)) {
      console.warn("v1 API failed, retrying with v1beta...");
      const BETA_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(BETA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
        })
      });
      result = await response.json();
    }

    // 3. 최종 응답 데이터 검증 및 반환
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      console.error("Gemini API Error Final:", JSON.stringify(result));
      const errorDetail = result?.error?.message || "분석 결과를 생성할 수 없습니다.";
      return new Response(JSON.stringify({ error: `AI 오류: ${errorDetail}` }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: "시스템 오류: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
