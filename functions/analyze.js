export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const { name, tag } = await request.json();
  
      // 1. 계정 정보 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      const account = await accRes.json();
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다.");
  
      // 2. 인게임 정보 조회 (여기서 10명의 정보를 가져옴)
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      const game = await gameRes.json();
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
  
      // 3. 데이터 드래곤 정보 (챔피언 이름 변환용)
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      Object.values(champData).forEach(c => { idToName[c.key] = c.id; });
  
      // 4. 참가자 데이터 정리 (p.summonerId 대신 p.puuid 기반 조회 등이 필요할 수 있으나, 일단 API가 주는 name 우선 사용)
      const processP = (p) => ({
        // ★ 중요: p.summonerName이 비어있으면 Riot ID를 찾기 위해 추가 호출이 필요할 수 있지만, 기본적으로 spectator API의 응답값을 사용합니다.
        realName: p.summonerName || "플레이어", 
        championName: idToName[p.championId] || "Unknown",
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        mainRuneId: p.perks.perkIds[0], 
        subStyleId: p.perks.perkSubStyle 
      });
  
      const blueTeam = game.participants.filter(p => p.teamId === 100).map(processP);
      const redTeam = game.participants.filter(p => p.teamId === 200).map(processP);
  
      // 5. Gemini 3 분석
      const prompt = `LoL 상성 분석. 블루팀(${blueTeam.map(p=>p.championName).join()}) vs 레드팀(${redTeam.map(p=>p.championName).join()}). 초반 라인전 주의점 요약.`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
  
      return new Response(JSON.stringify({ 
        blueTeam, redTeam, 
        strategy: aiData.candidates[0].content.parts[0].text, 
        version 
      }), { headers: { "Content-Type": "application/json" } });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }