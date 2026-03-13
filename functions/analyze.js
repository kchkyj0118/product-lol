export async function onRequestPost(context) {
    const { request, env } = context;
    
    // 사진 2번에 설정하신 그 이름 그대로 가져옵니다.
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    const headers = { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    };
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 플레이어 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) return new Response(JSON.stringify({ error: "플레이어를 찾을 수 없습니다." }), { status: 200, headers });
      const account = await accRes.json();
  
      // 2. 현재 게임 정보
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });
      const game = await gameRes.json();
  
      // 3. 데이터 매핑용 정보
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 4. 참가자 리스트 (닉네임 확실히 추출)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkSubStyle };
      });
  
      // 5. 실전 훈수 프롬프트 (템/룬 제외, 상성/타이밍 강조)
      const prompt = `LoL 강사로서 훈수 둬. 내 챔피언: ${myChamp}.
      블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
      레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}
      명령: 룬/아이템 추천 금지.
      [요약]: 강해지는 정확한 레벨/타이밍과 핵심 행동 3줄.
      [상세]: 라인전에서 누구를 노리고 누구를 피할지 '탑은 ~해라' 식으로 구체적 훈수.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, version, myChamp }), { status: 200, headers });
  
    } catch (err) {
      // 500 에러로 페이지가 죽는 것을 방지
      return new Response(JSON.stringify({ error: "서버 연결에 문제가 있습니다. 설정을 확인해 주세요." }), { status: 200, headers });
    }
  }