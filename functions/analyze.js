export async function onRequest(context) {
  // 1. 환경 변수 참조: onRequest 함수 내부 최상단에서 선언
  const apiKey = context.env.GEMINI_API_KEY;
  const riotKey = context.env.RIOT_API_KEY; // 3. 라이엇 API 키도 동일한 방식으로 추출

  try {
    const requestData = await context.request.json();
    const prompt = requestData.prompt;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API Error: GEMINI_API_KEY is missing in context.env" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    // 2. 구글 API 주소: v1beta 버전 및 gemini-1.5-flash 모델 조합 강제 고정
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      // 4. 에러 출력: Gemini API Error: [내용] 형식으로 에러 전문 반환
      return new Response(JSON.stringify({ error: `Gemini API Error: ${responseText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    // 정상 응답 반환
    return new Response(responseText, {
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    // 예외 발생 시 에러 전문 출력
    return new Response(JSON.stringify({ error: `Gemini API Error: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
