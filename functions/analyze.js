export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const { name, tag } = await request.json();
      if (!name || !tag) throw new Error("이름과 태그가 없습니다.");
  
      // 1. 계정 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) throw new Error("존재하지 않는 플레이어입니다.");
      const account = await accRes.json();
  
      // 2. 게임 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gameRes.json();
  
      // 3. 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const ver = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const k in champData) { idToName[champData[k].key] = champData[k].id; }
  
      // 4. 참가자 정리 (실제 닉네임 표시)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkSubStyle };
      });
  
      // 5. 실전 훈수 프롬프트 (템/룬 제외, 상성과 타이밍 중심)
      const prompt = `LoL 분석 전문가. 내 챔피언: ${myChamp}. 
      블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join()}. 
      레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join()}. 
      명령: 룬/템 추천 금지. 
      [요약]: 강해지는 타이밍(레벨)과 핵심 행동 3줄. 
      [상세]: 상성 분석 및 누구를 노리고 피할지 '탑은 ~해라' 식으로 구체적 훈수.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, ver, myChamp }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 200, // 400 에러를 방지하기 위해 응답은 성공으로 보내고 에러 메시지를 전달
        headers: { "Content-Type": "application/json" } 
      });
    }
  }