export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 헤더 설정
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS 요청 처리 (사전 보안 검사)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 실제 실시간 분석 API 처리
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const { summonerName, tagLine } = await request.json();

        // 1단계: Riot API - PUUID 조회
        const userReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
        const userData = await userReq.json();
        if (!userData.puuid) throw new Error("소환사를 찾을 수 없습니다.");

        // 2단계: Riot API - 실시간 게임 정보 조회
        const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${userData.puuid}?api_key=${env.RIOT_API_KEY}`);
        if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
        const gameData = await gameReq.json();

        // 3단계: Gemini 3 Flash 모델 호출
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `너는 롤 프로 코치야. 블루팀(${gameData.participants.filter(p => p.teamId === 100).map(p => p.championId).join(", ")})과 레드팀(${gameData.participants.filter(p => p.teamId === 200).map(p => p.championId).join(", ")})의 조합을 분석해서 승리 전략을 짜줘. 답변은 한국어로 해줘.`
              }]
            }]
          })
        });

        const geminiData = await geminiRes.json();
        
        if (geminiData.error) {
            throw new Error(`Gemini API 오류: ${geminiData.error.message}`);
        }

        const strategy = geminiData.candidates[0].content.parts[0].text;

        return new Response(JSON.stringify({ strategy }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // API 요청이 아닐 경우 웹사이트 정적 파일 제공
    return env.ASSETS.fetch(request);
  }
};
