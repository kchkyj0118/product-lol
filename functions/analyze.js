export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const body = await request.json();
      const { name, tag } = body;
  
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
      const account = await accRes.json();
  
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gameRes.json();
  
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      let myChamp = "Unknown";
      const participants = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        let displayName = p.riotIdGameName || cName;
        if (p.riotIdTagline) displayName += " #" + p.riotIdTagline;
        return { realName: displayName, championName: cName, teamId: p.teamId, spell1: p.spell1Id, spell2: p.spell2Id, subStyleId: p.perks.perkSubStyle };
      });
  
      const blueTeam = participants.filter(p => p.teamId === 100);
      const redTeam = participants.filter(p => p.teamId === 200);
  
      // AI 프롬프트 수정: 템/룬 제외, 구체적인 운영 타이밍 강조
      const prompt = "너는 op.gg, lol.ps 데이터를 꿰고 있는 롤 1타 강사야. 현재 게임 분석해줘.\n" +
                     "내 챔피언: " + myChamp + "\n" +
                     "블루팀: " + blueTeam.map(p => p.championName).join(", ") + "\n" +
                     "레드팀: " + redTeam.map(p => p.championName).join(", ") + "\n\n" +
                     "명령: 룬, 아이템 추천은 절대 하지 마. 대신 다음과 같이 전략을 짜.\n" +
                     "1. [요약]: 내 챔피언이 상대보다 강해지는 타이밍(레벨, 스킬 유무)과 지금 당장 해야 할 핵심 행동 3줄.\n" +
                     "2. [상세]: 라인별 상성 분석(누구를 피하고 누구를 노릴지), 정글 동선, 한타 시 포커싱 대상을 아주 구체적으로 '탑은 ~해라', '정글은 ~해라' 식으로 훈수 둬줘.";
  
      const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const fullText = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, fullText, version, myChamp }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  }