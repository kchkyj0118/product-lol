export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const { name, tag } = await request.json();
  
      // 1. PUUID 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      const account = await accRes.json();
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
  
      // 2. 인게임 정보 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      const game = await gameRes.json();
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
  
      // 3. 최신 데이터 드래곤 버전 및 챔피언 데이터 가져오기
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      Object.values(champData).forEach(c => { idToName[c.key] = c.id; });
  
      // 4. 참가자 데이터 정리 (닉네임, 챔피언명, 스펠, 룬)
      const processP = (p) => ({
        name: p.summonerName || `${name}#${tag}`,
        championName: idToName[p.championId] || "Unknown",
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        mainRune: p.perks.perkIds[0], // 핵심 룬
        subStyle: p.perks.perkSubStyle // 보조 룬 빌드
      });
  
      const blueTeam = game.participants.filter(p => p.teamId === 100).map(processP);
      const redTeam = game.participants.filter(p => p.teamId === 200).map(processP);
  
      // 5. Gemini 3 Flash Preview 분석
      const prompt = `LoL 분석. 블루팀: ${blueTeam.map(p=>p.championName).join()}, 레드팀: ${redTeam.map(p=>p.championName).join()}. 라인전 상성과 승리 전략 요약.`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, strategy, version }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, headers: { "Content-Type": "application/json" } 
      });
    }
  }