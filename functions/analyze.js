export async function onRequestPost(context) {
  // 2. 환경 변수 추출: context.env.GEMINI_API_KEY를 함수 내부 최상단에 배치
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

    // 1. API 주소 고정 (v1beta + gemini-1.5-flash)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    // 3. JSON 파싱 방어: 텍스트로 먼저 받기
    const responseText = await response.text();
    if (!response.ok) {
      // 텍스트가 "Gemini..."로 시작하는 에러 메시지일 경우에도 에러를 던짐
      throw new Error(`Gemini API 오류 (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText); // 정상일 때만 파싱

    // 4. 결과 반환: JSON 형식을 완벽히 지켜서 반환
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
      const aiText = data.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: aiText }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      throw new Error("AI 응답 구조가 예상과 다릅니다.");
    }

  } catch (error) {
    // 에러 발생 시에도 JSON 형식으로 반환
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
