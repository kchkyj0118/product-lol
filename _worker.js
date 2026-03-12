export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { prompt } = await request.json();
        const API_KEY = env.GEMINI_API_KEY; 

        // 키가 비어있는지 서버 로그로 확인
        if (!API_KEY) {
          return new Response(JSON.stringify({ error: "Cloudflare 대시보드에 GEMINI_API_KEY가 없습니다!" }), { status: 500 });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        // 여기서 에러를 상세히 반환합니다.
        return new Response(JSON.stringify({ error: "서버 내부 오류: " + e.message }), { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
