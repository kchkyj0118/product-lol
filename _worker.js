export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. CORS Preflight (브라우저 보안 허용)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. 실시간 게임 분석 API (/api/analyze)
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { summonerName, tagLine } = await request.json();

        // API 키 확인
        if (!env.GEMINI_API_KEY || !env.RIOT_API_KEY) {
          throw new Error("API 키 설정이 누락되었습니다.");
        }

        // [Step 1] 소환사 PUUID 가져오기
        const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
        if (!userReq.ok) return new Response(JSON.stringify({ error: "소환사를 찾을 수 없습니다." }), { 
          status: 404, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } 
        });
        const userData = await userReq.json();

        // [Step 2] 현재 게임 정보 가져오기
        const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${env.RIOT_API_KEY}`);
        if (gameReq.status === 404) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { 
          status: 404, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } 
        });
        const gameData = await gameReq.json();

        // [Step 3] 챔피언 데이터 매핑 (ID -> 한글 이름)
        const champDataRes = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
        const champJson = await champDataRes.json();
        const champMap = {};
        Object.values(champJson.data).forEach(c => { champMap[c.key] = c.name; });

        // 팀 구성 정리
        const targetPlayer = gameData.participants.find(p => p.puuid === userData.puuid);
        const myTeamId = targetPlayer.teamId;
        const myTeam = [];
        const enemyTeam = [];
        gameData.participants.forEach(p => {
          const name = champMap[p.championId] || "Unknown";
          if (p.teamId === myTeamId) myTeam.push(name);
          else enemyTeam.push(name);
        });

        // [Step 4] Gemini에게 프로급 전략 분석 요청
        const prompt = `
          너는 LoL 프로팀 코치야. 현재 실시간 게임 상황을 분석해서 짧고 강렬하게 승리 전략을 짜줘.
          우리 팀: ${myTeam.join(", ")}
          상대 팀: ${enemyTeam.join(", ")}
          
          분석 내용:
          1. 핵심 승리 플랜 (Win Condition)
          2. 한타 시 주의사항
          3. 추천 운영 방향 (오브젝트, 사이드)
        `;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const geminiData = await geminiRes.json();
        const strategy = geminiData.candidates[0].content.parts[0].text;

        return new Response(JSON.stringify({ strategy }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });
      }
    }

    // 3. 정적 파일 (HTML/CSS 등) 제공
    return env.ASSETS.fetch(request);
  }
};
