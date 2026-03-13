export async function onRequestPost(context) {
  const { request, env } = context;
  const API_KEY = env.RIOT_API_KEY;
  const GEMINI_KEY = env.GEMINI_API_KEY;
  const headers = { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const { name, tag } = await request.json();

    // 1. Riot Account API
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
    if (!accRes.ok) {
      const errData = await accRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `플레이어를 찾을 수 없습니다. (Riot API: ${accRes.status})` }), { status: 200, headers });
    }
    const account = await accRes.json();

    // 2. Spectator API
    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
    if (!gameRes.ok) {
      if (gameRes.status === 404) {
        return new Response(JSON.stringify({ error: "현재 해당 플레이어는 게임 중이 아닙니다." }), { status: 200, headers });
      }
      return new Response(JSON.stringify({ error: `게임 정보를 가져오는데 실패했습니다. (Status: ${gameRes.status})` }), { status: 200, headers });
    }
    const game = await gameRes.json();

    // 3. Data Dragon (Version & Champion Data)
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
    const prompt = `리그오브레전드 전문가로서 현재 게임의 승리 전략을 분석해줘.
내 챔피언: ${myChampName}
블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

명령:
1. 아이템, 룬 추천은 절대 하지 마.
2. [요약]: 내 챔피언이 강해지는 타이밍과 핵심 행동 3줄 요약.
3. [상세]: 라인전 상성 분석 및 누구를 노리고 피해야 하는지 '탑은 ~해라' 식으로 아주 구체적인 훈수.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: `AI 분석 중 오류가 발생했습니다. (AI API: ${aiRes.status})` }), { status: 200, headers });
    }
    
    const aiData = await aiRes.json();
    const strategy = aiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ pList, strategy, ver, myChampName }), { status: 200, headers });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: `서버 내부 오류: ${err.message}` }), { status: 200, headers });
  }
}
