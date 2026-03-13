export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const body = await request.json();
      const name = body.name;
      const tag = body.tag;
  
      // 1. PUUID 조회
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      const account = await accRes.json();
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
  
      // 2. 인게임 정보 조회
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      const game = await gameRes.json();
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
  
      // 3. 데이터 드래곤 정보 (버전 및 챔피언)
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions = await verRes.json();
      const version = versions[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      // 4. 참가자 데이터 정리
      const processP = (p) => {
        return {
          realName: p.summonerName || "플레이어",
          championName: idToName[p.championId] || "Unknown",
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          subStyleId: p.perks.perkSubStyle
        };
      };
  
      const blueTeam = game.participants.filter(p => p.teamId === 100).map(processP);
      const redTeam = game.participants.filter(p => p.teamId === 200).map(processP);
  
      // 5. Gemini 3 분석
      const prompt = "LoL 상성 분석. 블루팀(" + blueTeam.map(p => p.championName).join() + ") vs 레드팀(" + redTeam.map(p => p.championName).join() + "). 승리 전략 요약.";
      const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + GEMINI_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, strategy, version }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }