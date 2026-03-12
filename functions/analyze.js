export async function onRequest(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  try {
    const body = await context.request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.prompt }] }]
      })
    });

    const resData = await response.json(); // json으로 읽기
    
    if (!response.ok) {
      // 에러 내용을 글자로 변환해서 출력 (핵심!)
      return new Response(JSON.stringify({ error: (resData.error && resData.error.message) || JSON.stringify(resData.error) }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
      });
    }

    return new Response(JSON.stringify(resData), {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "코드 실행 에러: " + e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    });
  }
}
