export async function onRequest(context) {
  // Cloudflare 금고에서 키를 가져옵니다.
  const apiKey = context.env.GEMINI_API_KEY;
  
  // 404 에러를 잡는 마법의 주소 (v1beta)
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

    const resText = await response.text();
    
    // 구글 서버 답변이 정상이 아닐 경우 에러 출력
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `구글 서버 답변: ${resText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
      });
    }

    return new Response(resText, {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: `서버 오류: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });
  }
}
