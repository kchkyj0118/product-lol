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

    // 1. 소환사 확인
    const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const userData = await userReq.json();
    
    if (!userData || !userData.puuid) {
      return new Response(JSON.stringify({ error: "소환사 정보를 찾을 수 없습니다." }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=UTF-8" } 
      });
    }

    // 2. Gemini 1.5 Flash 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${summonerName} 선수의 플레이 스타일을 분석해서 롤 승리 전략을 한 문장으로 짜줘.` }] }]
      })
    });

    const resData = await geminiRes.json();
    
    // 데이터 구조 안전하게 추출 (reading '0' 방지)
    let strategy = "분석 결과를 가져오지 못했습니다.";
    if (resData.candidates && resData.candidates[0] && resData.candidates[0].content) {
      strategy = resData.candidates[0].content.parts[0].text;
    } else {
      console.error("Gemini Error Detail:", resData);
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
