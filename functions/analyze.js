export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summonerName, tagLine } = await request.json();
    const RIOT_API_KEY = env.RIOT_API_KEY;
    const GEMINI_API_KEY = env.GEMINI_API_KEY;

    if (!RIOT_API_KEY || !GEMINI_API_KEY) {
      throw new Error("API 키 설정이 누락되었습니다.");
    }

    // 1. 소환사 PUUID 조회 (Account-V1)
    const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
    const userData = await userReq.json();
    
    if (!userData || !userData.puuid) {
      return new Response(JSON.stringify({ error: "소환사 정보를 찾을 수 없습니다." }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" } 
      });
    }
    const puuid = userData.puuid;

    // 2. 실시간 게임 정보 조회 (Spectator-V5)
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${RIOT_API_KEY}`);
    if (gameReq.status === 404) {
      return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" } 
      });
    }
    const gameData = await gameReq.json();

    // 3. 상대 팀(Enemy Team) 정보 추출
    const myTeamId = gameData.participants.find(p => p.puuid === puuid).teamId;
    const enemies = gameData.participants.filter(p => p.teamId !== myTeamId);
    const enemyInfo = enemies.map(e => `챔피언 ID: ${e.championId}, 스펠: ${e.spell1Id}/${e.spell2Id}`).join('\n');

    // 4. Gemini 3 Flash Preview 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `
      너는 LoL 프로 팀 코치야. 현재 ${summonerName} 선수가 실시간 게임 중이야.
      상대 팀 정보는 다음과 같아:
      ${enemyInfo}

      이 상대 조합을 분석해서, 승리를 위해 ${summonerName} 선수가 이번 판에서 반드시 지켜야 할 핵심 전략 1가지를 한국어로 명확하게 짜줘.
    `;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const resData = await geminiRes.json();
    
    let strategy = "분석 결과를 가져오지 못했습니다.";
    if (resData.candidates && resData.candidates[0] && resData.candidates[0].content) {
      strategy = resData.candidates[0].content.parts[0].text;
    } else {
      console.error("Gemini Error:", resData);
      throw new Error(resData.error?.message || "Gemini 응답 구조 이상");
    }

    return new Response(JSON.stringify({ strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" } 
    });
  }
}
