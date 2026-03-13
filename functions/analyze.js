export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    const RIOT_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;

    // 병렬 데이터 수집
    const [acc, v] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_KEY}`).then(res => res.json()),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(res => res.json()).then(vs => vs[0])
    ]);

    if (!acc.puuid) throw new Error("유저 없음");

    const [game, cData] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${RIOT_KEY}`).then(res => res.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(res => res.json()).then(res => res.data)
    ]);

    if (!game.participants) throw new Error("게임 중 아님");

    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { nick: p.riotIdGameName || cn, cName: cn, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkStyle };
    });

    // 극한의 속도 최적화 프롬프트
    const prompt = `${myC} 중심 훈수. 1.요약: 상성/초반동선 핵심 3줄. 2.상세: 라인전/한타 주의점. 최대한 짧고 단호하게 반말로 해.`;

    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.5 }
      })
    }).then(res => res.json());

    const strategy = ai.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 부족";
    
    return new Response(JSON.stringify({ pList, strategy, ver: v, myC }), { status: 200, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "분석 불가: 다시 시도" }), { status: 200, headers: h });
  }
}
