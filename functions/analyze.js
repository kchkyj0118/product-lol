export async function onRequest(context) {
  const { request, env } = context;

  // 브라우저 보안(CORS) 허용 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 1. 사전 검사(OPTIONS) 요청 처리
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. 오직 POST 요청만 허용
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { summonerName, tagLine } = await request.json();

    // Riot API 호출 (PUUID 조회)
    const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const userData = await userReq.json();
    if (!userData.puuid) throw new Error("소환사 정보를 찾을 수 없습니다.");

    // Riot API 호출 (실시간 게임 조회)
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    if (!gameReq.ok) throw new Error("게임 정보를 가져오는데 실패했습니다.");
    const gameData = await gameReq.json();

    // Gemini 3 Flash 호출
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `너는 롤 프로 코치야. 블루팀(${gameData.participants.filter(p => p.teamId === 100).map(p => p.championId).join(",")})과 레드팀(${gameData.participants.filter(p => p.teamId === 200).map(p => p.championId).join(",")})의 조합을 보고 승리 전략을 짜줘. 한국어로 전문적으로 분석해줘.` }]
        }]
      })
    });

    const resData = await geminiRes.json();
    if (resData.error) throw new Error(`Gemini 오류: ${resData.error.message}`);
    
    const strategy = resData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
