export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== "POST") return new Response("Not Found", { status: 404 });
  
    const { name, tag } = await request.json();
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      // 1. Account-v1: PUUID 가져오기
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      const account = await accRes.json();
      if (!account.puuid) throw new Error("플레이어를 찾을 수 없습니다.");
  
      // 2. Spectator-v5: 현재 게임 정보 가져오기
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      const game = await gameRes.json();
      if (!game.participants) throw new Error("현재 진행 중인 게임이 없습니다.");
  
      // 3. 포지션 정렬 (간단화된 로직)
      const sortOrder = { "TOP": 0, "JUNGLE": 1, "MIDDLE": 2, "BOTTOM": 3, "UTILITY": 4 };
      const processTeam = (teamId) => {
        return game.participants
          .filter(p => p.teamId === teamId)
          .map(p => ({
            summonerName: p.summonerName,
            championName: "Champion" + p.championId, // 실제 서비스 시 챔피언 ID-이름 매핑 필요
            teamPosition: p.teamPosition || "UNKNOWN"
          }));
          // .sort((a, b) => sortOrder[a.teamPosition] - sortOrder[b.position]); // 실제 포지션 데이터가 있을 때 활성화
      };
  
      const blueTeam = processTeam(100);
      const redTeam = processTeam(200);
  
      // 4. Gemini AI 분석
      const prompt = `리그오브레전드 랭크 게임 분석. 블루팀: ${blueTeam.map(p=>p.summonerName).join(', ')}, 레드팀: ${redTeam.map(p=>p.summonerName).join(', ')}. 이 조합의 승리 핵심 전략을 3문장으로 알려줘.`;
      
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, strategy }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }