export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { summonerName, tagLine } = await request.json();

    // 1. Riot API: PUUID 조회
    const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const userData = await userReq.json();
    if (!userData.puuid) {
      return new Response(JSON.stringify({ error: "소환사를 찾을 수 없습니다." }), { status: 404, headers: corsHeaders });
    }

    // 2. Riot API: 실시간 게임 조회
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) {
      return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 404, headers: corsHeaders });
    }
    const gameData = await gameReq.json();

    // 3. Gemini 3 Flash 호출
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `너는 롤 프로 코치야. 블루팀(${gameData.participants.filter(p => p.teamId === 100).map(p => p.championId).join(",")}) vs 레드팀(${gameData.participants.filter(p => p.teamId === 200).map(p => p.championId).join(",")}) 조합을 분석해서 한국어로 승리 전략을 짜줘.` }]
        }]
      })
    });

    const resData = await geminiRes.json();
    const strategy = resData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}

// OPTIONS 요청 처리 (CORS)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
