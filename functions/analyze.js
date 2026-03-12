export async function onRequest(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  // 구글 공식 문서의 최신 정식(Stable) 주소와 모델명 조합으로 고정
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const body = await context.request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.prompt }] }]
      })
    });

    const responseText = await response.text();

    // 에러 발생 시 원문을 한글 메시지와 함께 반환
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `구글 서버 응답 오류: ${responseText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
      });
    }

    // 정상 응답 반환
    return new Response(responseText, {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `서버 내부 오류: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });
  }
}
// Triggering functions activation
