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

    const text = await response.text();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `API 응답 에러: ${text}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `서버 오류: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
