export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    // 헤더 설정 (CORS 및 JSON)
    const headers = { "Content-Type": "application/json" };
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 라이엇 계정 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) return new Response(JSON.stringify({ error: "플레이어를 찾을 수 없습니다." }), { status: 200, headers });
      const account = await accRes.json();
  
      // 2. 현재 게임 정보 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });
      const game = await gameRes.json();
  
      // 3. 최신 데이터 드래곤 정보
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 4. 참가자 리스트 정리 (닉네임 확실히 포함)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        // 닉네임 + 태그 조합
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkSubStyle };
      });
  
      // 5. 실전 훈수 프롬프트 (요청하신 상성/타이밍 중심)
      const prompt = `너는 롤 1타 강사야. 템/룬 추천은 절대 하지 마.
      내 챔피언: ${myChamp}
      블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
      레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}
      
      [훈수 명령]
      1. 요약: 상대보다 약한 시점과 강해지는 레벨(타이밍)을 찝어서 핵심 행동 3줄 작성.
      2. 상세: 라인전에서 피할 적과 노릴 적, 정글러라면 갱킹 가기 좋은 라인을 '탑은 ~해라' 식으로 아주 구체적으로 훈수 둬.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, version, myChamp }), { status: 200, headers });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: "서버 연결 오류" }), { status: 200, headers });
    }
  }