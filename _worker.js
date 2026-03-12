export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 분석 요청(/api/analyze)이 들어왔을 때만 실행
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { prompt } = await request.json();
        
        // 대시보드의 Secrets에서 키를 가져옴
        const API_KEY = env.GEMINI_API_KEY; 
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify({ 
          text: data.candidates[0].content.parts[0].text 
        }), {
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Worker Error: " + e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
      }
    }
    
    // 그 외 요청은 정적 파일(HTML) 응답
    return env.ASSETS.fetch(request);
  }
};
