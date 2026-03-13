export async function onRequestPost(context) {
  const { RIOT_API_KEY, GEMINI_API_KEY } = context.env;
  const { summonerName, tagLine } = await context.request.json();

  try {
      // 1. PUUID 조회
      const userRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
      const userData = await userRes.json();
      
      // 2. 현재 게임 데이터(10명 정보) 가져오기
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${RIOT_API_KEY}`);
      const gameData = await gameRes.json();

      // 3. 10명 데이터 정리 (챔피언, 룬, 스펠 ID 포함)
      const participants = gameData.participants.map(p => ({
          name: p.riotId || "Unknown",
          team: p.teamId === 100 ? 'Blue' : 'Red',
          champId: p.championId,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          perks: p.perks.perkIds[0] // 핵심 룬
      }));

      // 4. Gemini에게 승리 플랜 요청
      const aiPrompt = `LoL 분석: 내가 검색한 유저(${summonerName})를 중심으로, 양 팀의 10명 챔피언 조합을 보고 구체적인 승리 플랜(운영, 한타)을 짜줘. 데이터: ${JSON.stringify(participants)}`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
      });
      const aiResult = await aiRes.json();

      return new Response(JSON.stringify({ 
          participants, 
          strategy: aiResult.candidates[0].content.parts[0].text 
      }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
      return new Response(JSON.stringify({ error: "게임을 찾을 수 없거나 오류가 발생했습니다." }), { status: 200 });
  }
}