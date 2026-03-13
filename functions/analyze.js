export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      // 413 오류 방지를 위해 필요한 값만 파싱
      const body = await request.json();
      const name = body.name;
      const tag = body.tag;
  
      // 1. 라이엇 계정 조회
      const accRes = await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + "?api_key=" + API_KEY);
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
      const account = await accRes.json();
  
      // 2. 실시간 게임 조회
      const gameRes = await fetch("https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/" + account.puuid + "?api_key=" + API_KEY);
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gameRes.json();
  
      // 3. 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/ko_KR/champion.json");
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 4. 참가자 데이터 정리
      let myChamp = "";
      const participants = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        // 닉네임#태그 확실히 추출
        const nick = p.riotIdGameName ? (p.riotIdGameName + " #" + (p.riotIdTagline || "")) : cName;
        return { nick, cName, teamId: p.teamId, s1: p.spell1Id, s2: p.spell2Id, rune: p.perks.perkSubStyle };
      });
  
      const blue = participants.filter(p => p.teamId === 100);
      const red = participants.filter(p => p.teamId === 200);
  
      // 5. 롤 1타 강사 페르소나 프롬프트 (템/룬 추천 절대 금지)
      const prompt = "너는 op.gg와 lol.ps의 데이터를 기반으로 승리 전략을 짜주는 롤 1타 강사야.\n" +
        "내 챔피언: " + myChamp + "\n" +
        "블루팀 조합: " + blue.map(p => p.cName).join(", ") + "\n" +
        "레드팀 조합: " + red.map(p => p.cName).join(", ") + "\n\n" +
        "명령:\n" +
        "1. 룬이나 아이템 추천은 절대 하지 마.\n" +
        "2. [요약]: 내 챔피언이 상대보다 강해지는 정확한 타이밍(예: 3렙까지 사리고 4렙부터 딜교)과 현재 판에서 내가 해야 할 핵심 행동을 딱 3줄로 작성해.\n" +
        "3. [상세]: 라인별 상성 분석(누구를 피하고 누구를 노릴지), 정글러라면 동선 설계, 한타 시 포커싱 대상을 아주 구체적으로 '탑은 ~해라', '미드는 ~해라' 식의 훈수를 둬줘.";
  
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