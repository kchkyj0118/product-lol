export async function onRequestPost(context) {
  const { RIOT_API_KEY, GEMINI_API_KEY } = context.env;
  const { summonerName, tagLine } = await context.request.json();

  try {
      // 1. 유저 정보 가져오기 (Asia 서버)
      const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
      if (!accountRes.ok) return new Response(JSON.stringify({ error: `유저를 찾을 수 없습니다. (에러코드: ${accountRes.status})` }));
      const accountData = await accountRes.json();

      // 2. 실시간 게임 정보 가져오기 (KR 서버)
      // 중요: Spectator-v5는 kr.api.riotgames.com 주소를 사용해야 합니다.
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}?api_key=${RIOT_API_KEY}`);
      
      if (gameRes.status === 404) {
          return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다. (인게임 진입 후 1분 뒤 시도하세요)" }));
      } else if (!gameRes.ok) {
          return new Response(JSON.stringify({ error: `게임 정보를 가져오지 못했습니다. (라이엇 에러: ${gameRes.status})` }));
      }
      
      const gameData = await gameRes.json();

      // 3. 10명 데이터 정리
      const participants = gameData.participants.map(p => ({
          name: p.riotId || p.summonerId, // 닉네임
          team: p.teamId === 100 ? 'Blue' : 'Red',
          champId: p.championId,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          perk: p.perks.perkIds[0] // 핵심 룬
      }));

      // 4. Gemini AI 승리 플랜 ( participants 데이터를 문장으로 변환 )
      const prompt = `${summonerName} 중심으로 분석해줘. 우리팀/상대팀 조합: ${JSON.stringify(participants)}`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();

      return new Response(JSON.stringify({ 
          participants, 
          strategy: aiData.candidates[0].content.parts[0].text 
      }));

  } catch (err) {
      return new Response(JSON.stringify({ error: `서버 내부 오류: ${err.message}` }));
  }
}