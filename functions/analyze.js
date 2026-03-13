export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
    const headers = { "Content-Type": "application/json" };
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 유저 & 게임 정보 가져오기
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      const account = await accRes.json();
      if (!account.puuid) return new Response(JSON.stringify({ error: "플레이어 없음" }), { status: 200, headers });
  
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      const game = await gameRes.json();
      if (!game.participants) return new Response(JSON.stringify({ error: "게임 중 아님" }), { status: 200, headers });
  
      // 2. 이미지 경로를 위한 데이터 드래곤 매핑 (중요)
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const ver = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      
      // ID(숫자)를 영어 이름(이미지 파일명)으로 변환하는 사전
      const idToIdName = {}; 
      for (const key in champData) { idToIdName[champData[key].key] = champData[key].id; }
  
      let myChampName = "";
      const pList = game.participants.map(p => {
        const cIdName = idToIdName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChampName = cIdName;
        return {
          nick: (p.riotIdGameName || cIdName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : ""),
          cName: cIdName, // 이제 'Aatrox' 같은 영어 이름이 들어감
          team: p.teamId,
          s: [p.spell1Id, p.spell2Id],
          r: p.perks.perkStyle // 메인 룬 스타일 ID
        };
      });
  
      // 3. AI 훈수 생성
      const prompt = `LoL 전문가 훈수. 내 챔피언: ${myChampName}. 
      블루: ${pList.filter(p=>p.team===100).map(p=>p.cName).join()}. 
      레드: ${pList.filter(p=>p.team===200).map(p=>p.cName).join()}. 
      [요약] 강해지는 타이밍 3줄. [상세] 구체적 운영법. (템/룬 추천 절대 금지)`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, ver, myChampName }), { status: 200, headers });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: "서버 오류" }), { status: 200, headers });
    }
  }