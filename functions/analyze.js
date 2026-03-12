export async function onRequest(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    // 구글 서버가 에러를 뱉었을 경우 처리
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `구글 서버 답변: ${responseText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
      });
    }
    // 정상일 때만 JSON으로 반환
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
