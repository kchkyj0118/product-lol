export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 계정 및 게임 조회 (최소 정보만 사용)
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      if (!accRes.ok) throw new Error("플레이어 미발견");
      const account = await accRes.json();
  
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      if (!gameRes.ok) throw new Error("게임 중이 아님");
      const game = await gameRes.json();
  
      // 2. 데이터 매핑용 최신 버전 및 챔피언 정보
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 3. 참가자 정보 압축 (닉네임 확실히 추출)
      let myChamp = "";
      const pData = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        return {
          nick: (p.riotIdGameName || cName) + (p.riotIdTagline ? " #" + p.riotIdTagline : ""),
          cName: cName,
          t: p.teamId,
          s: [p.spell1Id, p.spell2Id],
          r: p.perks.perkSubStyle
        };
      });
  
      const blue = pData.filter(p => p.t === 100);
      const red = pData.filter(p => p.t === 200);
  
      // 4. 상성 훈수 프롬프트 (템/룬 추천 절대 금지)
      const prompt = "LoL 분석가 페르소나. 내 챔피언: " + myChamp + ". " +
        "블루: " + blue.map(p => p.cName).join(",") + ". 레드: " + red.map(p => p.cName).join(",") + ". " +
        "아이템/룬 금지. 1.[요약]에 강해지는 타이밍과 행동 3줄. 2.[상세]에 라인상성, 동선, 한타 훈수 구체적으로 작성해줘.";
  
      const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blue, red, strategy, version, myChamp }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, headers: { "Content-Type": "application/json" } 
      });
    }
  }