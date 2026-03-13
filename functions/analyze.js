export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // GET 요청 테스트용 (404 방지 확인용)
  if (request.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", message: "Analyze function is running" }), { headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  const API_KEY = env.RIOT_API_KEY;
  const GEMINI_KEY = env.GEMINI_API_KEY;

  if (!API_KEY || !GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "환경 변수(API_KEY)가 설정되지 않았습니다. Cloudflare 설정에서 등록해 주세요." }), { status: 200, headers });
  }

  try {
    const { name, tag } = await request.json();

    if (!name || !tag) {
      return new Response(JSON.stringify({ error: "닉네임과 태그를 정확히 입력해 주세요." }), { status: 200, headers });
    }

    // 1. Riot Account API
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
    if (!accRes.ok) {
      return new Response(JSON.stringify({ error: `플레이어를 찾을 수 없습니다. (ID 확인: ${accRes.status})` }), { status: 200, headers });
    }
    const account = await accRes.json();

    // 2. Spectator API
    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
    if (!gameRes.ok) {
      if (gameRes.status === 404) {
        return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다. 인게임 진입 1분 후 시도하세요." }), { status: 200, headers });
      }
      return new Response(JSON.stringify({ error: `게임 정보를 가져오지 못했습니다. (Status: ${gameRes.status})` }), { status: 200, headers });
    }
    const game = await gameRes.json();

    // 3. Data Dragon
    const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const ver = (await verRes.json())[0];
    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
    const champData = (await champRes.json()).data;
    
    const idToIdName = {};
    for (const key in champData) { idToIdName[champData[key].key] = champData[key].id; }

    let myChampName = "";
    const pList = game.participants.map(p => {
      const cIdName = idToIdName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myChampName = cIdName;
      return {
        nick: (p.riotIdGameName || cIdName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : ""),
        cName: cIdName,
        team: p.teamId,
        s: [p.spell1Id, p.spell2Id],
        r: p.perks.perkStyle
      };
    });

    // 4. Gemini AI
    const prompt = `LoL 전문가 훈수. 내 챔피언: ${myChampName}.
블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

훈수 지침:
1. 아이템, 룬 추천 금지.
2. [요약]: 강해지는 타이밍과 행동 3줄.
3. [상세]: 상성 분석 및 운영법을 구체적으로 '탑은 ~해라' 식으로 작성.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const aiData = await aiRes.json();
    if (!aiRes.ok) return new Response(JSON.stringify({ error: "AI 분석 실패" }), { status: 200, headers });
    
    const strategy = aiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ pList, strategy, ver, myChampName }), { status: 200, headers });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: `서버 오류: ${err.message}` }), { status: 200, headers });
  }
}
