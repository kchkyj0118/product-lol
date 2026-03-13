export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json" };
  try {
    const body = await request.json();
    const { name, tag } = body;
    if (!name || !tag) return new Response(JSON.stringify({ error: "닉네임과 태그를 입력하세요." }), { status: 200, headers });

    // 1. 유저 & 게임 조회 (에러 시 상세 메시지 반환)
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`);
    const account = await accRes.json();
    if (!account.puuid) return new Response(JSON.stringify({ error: "라이엇 계정을 찾을 수 없습니다." }), { status: 200, headers });

    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${env.RIOT_API_KEY}`);
    const game = await gameRes.json();
    if (!game.participants) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });

    // 2. 데이터 가공 로직
    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const ver = (await vRes.json())[0];
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
    const { data: cData } = await cRes.json();
    const idToName = {};
    for (const k in cData) { idToName[cData[k].key] = cData[k].id; }

    let myC = "";
    const pList = game.participants.map(p => {
      const n = idToName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myC = n;
      return { 
        nick: p.riotIdGameName || n, 
        cName: n, 
        team: p.teamId, 
        s: [p.spell1Id, p.spell2Id], 
        r: p.perks.perkStyle 
      };
    });

    // 3. 제미나이 분석
    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: `LoL 챌린저 훈수. 내 챔피언: ${myC}. 상대 라이너 상성 기반 운영법 3줄 요약.` }] }] })
    });
    const aiData = await aiRes.json();
    const strategy = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "분석 내용을 가져오지 못했습니다.";

    return new Response(JSON.stringify({ pList, strategy, ver, myC }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "서버 오류: " + e.message }), { status: 200, headers });
  }
}
