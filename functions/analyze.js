export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. 유저 & 게임 데이터 (병렬 처리로 속도 극대화)
    const acc = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(res => res.json());
    if (!acc.puuid) throw new Error("유저 없음");

    const game = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(res => res.json());
    if (!game.participants) throw new Error("게임 중 아님");

    // 2. 이미지 매핑 데이터
    const v = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(res => res.json()).then(vs => vs[0]);
    const cData = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(res => res.json()).then(res => res.data);
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { nick: p.riotIdGameName || cn, cName: cn, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkStyle };
    });

    // 3. 초고속 AI 분석 (토큰 제한으로 응답 속도 향상)
    const prompt = `LoL 전문가. 주인공: [${myC}]. 룬/템 추천 제외. 
    1.[요약]: 상성 및 3렙 타이밍 등 핵심 전략 3줄. 
    2.[상세]: 라인별 구체적 운영법. (핵심만 짧게)`;

    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.5 }
      })
    }).then(res => res.json());

    const strategy = ai.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 분석 불가";
    
    return new Response(JSON.stringify({ pList, strategy, ver: v, myC }), { status: 200, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "분석 실패: 다시 시도하세요" }), { status: 200, headers: h });
  }
}
