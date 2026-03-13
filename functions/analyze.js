export async function onRequestPost(context) {
  const RIOT_API_KEY = context.env.RIOT_API_KEY;
  const GEMINI_API_KEY = context.env.GEMINI_API_KEY;

  try {
      const body = await context.request.json();
      const { summonerName, tagLine } = body;

      // 1. 라이엇 계정 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
      const accData = await accRes.json();
      if(!accData.puuid) throw new Error("유저를 찾을 수 없습니다.");

      // 2. 현재 게임 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accData.puuid}?api_key=${RIOT_API_KEY}`);
      const gameData = await gameRes.json();
      if(!gameData.participants) throw new Error("현재 게임 중이 아닙니다.");

      const teams = { Blue: [], Red: [] };
      gameData.participants.forEach(p => {
          const side = p.teamId === 100 ? 'Blue' : 'Red';
          teams[side].push({ name: p.riotId || "Unknown", champId: p.championId });
      });

      // 3. Gemini AI 전략 생성
      const prompt = `LoL 분석: 블루팀(${teams.Blue.map(p=>p.champId)}) vs 레드팀(${teams.Red.map(p=>p.champId)}). 승리 전략 3줄 요약해줘.`;
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;

      return new Response(JSON.stringify({ teams, strategy }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
}