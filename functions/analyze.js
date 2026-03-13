export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const { name, tag } = await request.json();
  
      // 1. PUUID 조회 (Riot Account API)
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) throw new Error("플레이어를 찾을 수 없습니다. (닉네임/태그 확인)");
      const account = await accRes.json();
  
      // 2. 인게임 정보 조회 (Spectator API)
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gameRes.json();
  
      // 3. 팀별 챔피언 데이터 추출 및 포지션 정렬 (가정: 순서대로 들어옴)
      const blueTeam = game.participants.filter(p => p.teamId === 100);
      const redTeam = game.participants.filter(p => p.teamId === 200);
  
      // 4. Gemini 3 Flash Preview 분석 호출
      const prompt = `리그오브레전드 게임 분석. 
      블루팀 챔피언: ${blueTeam.map(p => p.championId).join(', ')}
      레드팀 챔피언: ${redTeam.map(p => p.championId).join(', ')}
      각 라인별 상성과 블루팀 입장에서의 승리 전략을 아주 핵심만 요약해줘.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
  
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, strategy }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }