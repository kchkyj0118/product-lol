export async function onRequest(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  // 모델명을 -latest까지 붙여서 더 명확하게 지정
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const body = await context.request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.prompt }] }]
      })
    });

    const resData = await response.text();
    if (!response.ok) {
      return new Response(`Gemini API Error: ${resData}`, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
      });
    }
    return new Response(resData, { 
      headers: { 'Content-Type': 'application/json; charset=UTF-8' } 
    });
  } catch (e) {
    return new Response(`Server Error: ${e.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
    });
  }
}
