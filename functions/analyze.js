export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const body = await request.json();
      const name = body.name;
      const tag = body.tag;
  
      // 1. 계정 정보 조회
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
      const account = await accRes.json();
  
      // 2. 실시간 게임 조회
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gameRes.json();
  
      // 3. 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions = await verRes.json();
      const version = versions[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      // 4. 참가자 데이터 정리 (닉네임 추출 강화)
      let userChamp = "Unknown";
      const participants = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) userChamp = cName;
        
        // 실제 닉네임 구성: riotIdGameName#riotIdTagline
        let displayName = p.riotIdGameName ? p.riotIdGameName : cName;
        if (p.riotIdTagline) displayName += " #" + p.riotIdTagline;
  
        return {
          realName: displayName,
          championName: cName,
          teamId: p.teamId,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          subStyleId: p.perks.perkSubStyle
        };
      });
  
      const blueTeam = participants.filter(p => p.teamId === 100);
      const redTeam = participants.filter(p => p.teamId === 200);
  
      // 5. Gemini 분석 (3줄 요약과 상세 내용을 구분하도록 요청)
      const prompt = "LoL 전문 분석가. 내 챔피언: " + userChamp + ". " +
                     "블루팀: " + blueTeam.map(p => p.championName).join(", ") + ". " +
                     "레드팀: " + redTeam.map(p => p.championName).join(", ") + ". " +
                     "반드시 다음 형식을 지켜줘: " +
                     "[요약] 부분에 " + userChamp + " 중심 승리 전략 3줄 요약. " +
                     "[상세] 부분에 라인전과 한타 상세 운영법 작성.";
  
      const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const fullText = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, fullText, version, userChamp }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, headers: { "Content-Type": "application/json" } 
      });
    }
  }