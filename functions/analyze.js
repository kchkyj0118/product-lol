export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { summonerName, tagLine } = body;

    // 1. Riot API: 소환사 PUUID 조회
    const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const userData = await userReq.json();
    if (!userData.puuid) throw new Error("소환사를 찾을 수 없습니다.");

    // 2. Riot API: 실시간 게임 정보 조회
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const gameData = await gameReq.json();

    // 3. Gemini 3 Flash: 전략 분석 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const blueTeam = gameData.participants.filter(p => p.teamId === 100).map(p => p.championId).join(", ");
    const redTeam = gameData.participants.filter(p => p.teamId === 200).map(p => p.championId).join(", ");

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `너는 롤 프로 코치야. 현재 게임의 블루팀 챔피언 ID들(${blueTeam})과 레드팀 챔피언 ID들(${redTeam})을 분석해서, 각 팀의 상성과 초반 정글 동선, 핵심 승리 플랜을 한국어로 전문적으로 짜줘.`
          }]
        }]
      })
    });

    const resData = await geminiRes.json();
    if (resData.error) throw new Error(`Gemini 오류: ${resData.error.message}`);
    
    return new Response(JSON.stringify({ 
      strategy: resData.candidates[0].content.parts[0].text 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
