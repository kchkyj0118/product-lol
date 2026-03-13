export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const body = await request.json();
      const name = body.name;
      const tag = body.tag;
  
      // 1. 계정 정보 (PUUID) 조회
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      const account = await accRes.json();
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
  
      // 2. 실시간 게임 정보 조회
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      const game = await gameRes.json();
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
  
      // 3. 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions = await verRes.json();
      const version = versions[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      // 4. 참가자 리스트 생성 (PUUID로 실제 닉네임 매핑 시도)
      let userChampion = "플레이어";
      const participants = await Promise.all(game.participants.map(async (p) => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) userChampion = cName;
  
        // 실시간 게임 API의 summonerId로 닉네임 가져오기
        return {
          realName: p.summonerId ? (p.riotIdGameName || "소환사") : "소환사",
          championName: cName,
          teamId: p.teamId,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          subStyleId: p.perks.perkSubStyle
        };
      }));
  
      const blueTeam = participants.filter(p => p.teamId === 100);
      const redTeam = participants.filter(p => p.teamId === 200);
  
      // 5. Gemini AI 전략 생성 (요약+상세)
      const prompt = "LoL 분석가. [본인 챔피언: " + userChampion + "]. " +
                     "블루팀: " + blueTeam.map(p => p.championName).join() + ". " +
                     "레드팀: " + redTeam.map(p => p.championName).join() + ". " +
                     "1. " + userChampion + " 중심의 핵심 전략 3줄 요약. " +
                     "2. 라인전, 한타, 아이템 빌드를 포함한 상세 전략. " +
                     "두 구분을 명확히 해서 답변해줘.";
  
      const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + GEMINI_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const fullText = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, fullText, version, userChampion }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }