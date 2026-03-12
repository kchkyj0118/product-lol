export async function onRequestPost(context) {
  // 3. 환경 변수 추출: context.env.GEMINI_API_KEY를 함수 내부 최상단에 배치
  const apiKey = context.env.GEMINI_API_KEY;

  try {
    const requestData = await context.request.json();
    const { allies, enemies, myLine, analysisMode } = requestData;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키(GEMINI_API_KEY)가 설정되지 않았습니다. Cloudflare 설정을 확인해주세요." }), { 
        status: 500, 
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다.
    분석 모드: ${analysisMode}
    내 라인: ${myLine}
    최신 패치 기반의 승리 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n승리 플랜 분석 요청.`;

    // 1 & 2. 모델 강제 변경 및 API 주소 고정 (gemini-pro 사용)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const responseText = await response.text();

    // 4. 철저한 예외 처리: response.ok가 아닐 경우 에러 메시지를 JSON으로 반환
    if (!response.ok) {
      console.error("Gemini API Error Response:", responseText);
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
      return new Response(JSON.stringify({ error: "AI 응답 형식이 올바르지 않습니다." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: `서버 내부 오류: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
