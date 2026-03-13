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

    // 1. 최신 챔피언 데이터 가져오기 (숫자 ID -> 이름 변환용)
    const champDataRes = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
    const champData = await champDataRes.json();
    const champMap = {};
    Object.values(champData.data).forEach(cha => {
      champMap[cha.key] = { name: cha.name, id: cha.id };
    });

    // 2. 라이엇 계정 PUUID 확인
    const accountReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const accountData = await accountReq.json();
    if (!accountData.puuid) throw new Error("소환사 정보를 찾을 수 없습니다.");

    // 3. 현재 인게임 정보 조회
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 해당 소환사는 게임 중이 아닙니다.");
    const gameData = await gameReq.json();

    // 4. 블루/레드 팀 데이터 정리 (진짜 챔피언 이름 매핑)
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const champInfo = champMap[p.championId] || { name: "알 수 없음", id: "Unknown" };
      const pInfo = { 
        name: p.summonerId, // 닉네임
        championName: champInfo.id, // 이미지용 영문 이름 (예: Aatrox)
        championKName: champInfo.name, // 분석용 한글 이름 (예: 아트록스)
        tag: tagLine 
      };
      p.teamId === 100 ? teams.Blue.push(pInfo) : teams.Red.push(pInfo);
    });

    // 5. Gemini 3 Flash Preview 분석
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `리그 오브 레전드 게임 분석가로서 조언해줘.
    우리 팀 구성: ${teams.Blue.map(p => p.championKName).join(", ")}
    상대 팀 구성: ${teams.Red.map(p => p.championKName).join(", ")}
    
    상대 팀의 조합 강점과 우리 팀이 주의해야 할 점을 분석해서 '한 문장 요약'과 '3가지 핵심 승리 플랜'을 한국어로 아주 깔끔하게 말해줘.`;

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