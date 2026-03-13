export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    const headers = { "Content-Type": "application/json" };
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 유저 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) return new Response(JSON.stringify({ error: "플레이어 정보를 찾을 수 없습니다." }), { status: 200, headers });
      const account = await accRes.json();
  
      // 2. 게임 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });
      const game = await gameRes.json();
  
      // 3. 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const ver = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 4. 참가자 정리 (닉네임 포함)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id] };
      });
  
      // 5. 실전 훈수 프롬프트
      const prompt = `LoL 전문가 페르소나. 내 챔피언: ${myChamp}.
      블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
      레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}
      룬/템 추천 금지. 
      1. [요약]: 강해지는 레벨(타이밍)과 핵심 플레이 3줄.
      2. [상세]: 라인전 상성(피할 적, 노릴 적)을 '탑은 ~해라' 식으로 구체적 훈수.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, ver, myChamp }), { status: 200, headers });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: "서버 내부 오류: API 키 설정을 다시 확인하세요." }), { status: 200, headers });
    }
  }