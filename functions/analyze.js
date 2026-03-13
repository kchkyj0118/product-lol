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

    // 1. 라이엇 계정 PUUID 확인
    const accountReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const accountData = await accountReq.json();
    if (!accountData.puuid) throw new Error("소환사 정보를 찾을 수 없습니다.");

    // 2. 현재 인게임 정보(Spectator) 조회
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 해당 소환사는 게임 중이 아닙니다.");
    const gameData = await gameReq.json();

    // 3. 블루/레드 팀 데이터 정리
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const pInfo = { name: p.summonerName, championId: p.championId, tag: tagLine };
      p.teamId === 100 ? teams.Blue.push(pInfo) : teams.Red.push(pInfo);
    });

    // 4. Gemini 3 Flash Preview에 분석 요청
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `리그 오브 레전드 게임 분석:
    [우리 팀] ${JSON.stringify(teams.Blue)}
    [상대 팀] ${JSON.stringify(teams.Red)}
    
    상대 팀의 구성을 보고, 우리가 승리하기 위한 핵심 전략을 '한 문장 요약'과 '3가지 상세 포인트'로 한국어로 알려줘.`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const resData = await geminiRes.json();
    const strategy = resData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" } 
    });
  }
}