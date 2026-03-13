export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { mode, myTeam, enemyTeam } = await request.json();
        const API_KEY = env.GEMINI_API_KEY;

        if (!API_KEY) {
          return new Response(JSON.stringify({ error: "Cloudflare 대시보드에 GEMINI_API_KEY가 없습니다!" }), { 
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // Gemini API 호출을 위한 프롬프트 구성
        const prompt = `
          너는 리그 오브 레전드 최고의 전략 분석가야. 
          현재 상황: ${mode || "5대5"} (예: 1대1, 5대5)
          우리 팀: ${Array.isArray(myTeam) ? myTeam.join(", ") : myTeam}
          상대 팀: ${Array.isArray(enemyTeam) ? enemyTeam.join(", ") : enemyTeam}

          op.gg와 lol.ps의 최신 메타를 기반으로 다음을 분석해줘:
          1. 핵심 승리 플랜 (Win Condition)
          2. 초반/중반/후반 아이템 빌드 및 운영 전략
          3. 상대 팀 챔피언들에 대한 구체적인 카운터 방법
          
          답변은 사용자가 바로 실전에 적용할 수 있도록 명확하고 전문적으로 작성해줘.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) {
            return new Response(JSON.stringify({ error: data.error.message }), { 
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const strategyText = data.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ strategy: strategyText }), { 
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "서버 내부 오류: " + e.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};

