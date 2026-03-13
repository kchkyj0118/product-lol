export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. CORS 처리를 위한 OPTIONS 요청 허용 (브라우저 보안)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. 실제 분석 요청 (POST /api/analyze) 처리
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { summonerName, tagLine } = await request.json();
        const GEMINI_API_KEY = env.GEMINI_API_KEY;
        const RIOT_API_KEY = env.RIOT_API_KEY;

        if (!GEMINI_API_KEY || !RIOT_API_KEY) {
          throw new Error("API 키(GEMINI or RIOT)가 설정되지 않았습니다.");
        }

        // --- Riot API: 소환사 정보 및 현재 게임 확인 ---
        const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
        if (!accountRes.ok) throw new Error("소환사를 찾을 수 없습니다. (이름/태그 확인)");
        const { puuid } = await accountRes.json();

        const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${RIOT_API_KEY}`);
        if (gameRes.status === 404) throw new Error("현재 진행 중인 게임이 없습니다.");
        if (!gameRes.ok) throw new Error("게임 정보를 가져오는데 실패했습니다.");
        const gameData = await gameRes.json();

        // 챔피언 이름 매핑 (Data Dragon)
        const champDataRes = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
        const champJson = await champDataRes.json();
        const champMap = {};
        Object.values(champJson.data).forEach(c => { champMap[c.key] = c.name; });

        // 팀 구성 정리
        const targetPlayer = gameData.participants.find(p => p.puuid === puuid);
        const myTeamId = targetPlayer.teamId;
        const myTeam = [];
        const enemyTeam = [];
        gameData.participants.forEach(p => {
          const name = champMap[p.championId] || "Unknown";
          if (p.teamId === myTeamId) myTeam.push(name);
          else enemyTeam.push(name);
        });

        // --- Gemini API: 프로급 전략 분석 생성 ---
        const prompt = `
          리그 오브 레전드 최고 수준의 분석가로서 답변해줘.
          상황: 현재 실시간 게임 진행 중.
          우리 팀 조합: ${myTeam.join(", ")}
          상대 팀 조합: ${enemyTeam.join(", ")}

          위 조합을 바탕으로:
          1. 우리 팀의 핵심 승리 플랜 (Win Condition)
          2. 한타 시 가장 경계해야 할 상대 스킬과 대처법
          3. 아군이 집중해야 할 운영 방향 (오브젝트, 사이드 푸시 등)
          
          답변은 한국어로 짧고 강렬하게, 핵심 위주로 500자 이내로 작성해줘.
        `;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const geminiData = await geminiRes.json();
        const strategyText = geminiData.candidates[0].content.parts[0].text;

        // 최종 결과 반환 (CORS 헤더 포함)
        return new Response(JSON.stringify({ strategy: strategyText }), { 
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          } 
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          }
        });
      }
    }

    // 3. API 요청이 아닐 경우 웹사이트 화면(Static Assets) 반환
    return env.ASSETS.fetch(request);
  }
};
