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
  
      // 3. 챔피언 이름 매핑 (Data Dragon 활용)
      const versionRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await versionRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      
      const idToName = {};
      Object.values(champData).forEach(c => { idToName[c.key] = c.id; });
  
      // 4. 팀 데이터 정리 (이미지 주소 및 닉네임 포함)
      const processParticipants = (p) => ({
        summonerName: p.summonerName || `${name}#${tag}`, // 닉네임
        championId: p.championId,
        championKey: idToName[p.championId] || "unknown",
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        mainRune: p.perks.perkStyle,
        subRune: p.perks.perkSubStyle
      });
  
      const blueTeam = game.participants.filter(p => p.teamId === 100).map(processParticipants);
      const redTeam = game.participants.filter(p => p.teamId === 200).map(processParticipants);
  
      // 5. Gemini 3 분석
      const prompt = `LoL 분석. 블루팀: ${blueTeam.map(p=>p.championKey).join()}, 레드팀: ${redTeam.map(p=>p.championKey).join()}. 승리 전략 3줄 요약.`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
  
      return new Response(JSON.stringify({ 
        blueTeam, 
        redTeam, 
        strategy: aiData.candidates[0].content.parts[0].text,
        version 
      }), { headers: { "Content-Type": "application/json" } });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }