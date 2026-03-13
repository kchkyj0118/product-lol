export async function onRequestPost(context) {
  const { request, env } = context;
  const API_KEY = env.RIOT_API_KEY;
  const GEMINI_KEY = env.GEMINI_API_KEY;
  const headers = { "Content-Type": "application/json" };

  try {
    const { name, tag } = await request.json();

    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
    const account = await accRes.json();
    if (!account.puuid) return new Response(JSON.stringify({ error: "유저 찾기 실패" }), { status: 200, headers });

    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
    const game = await gameRes.json();
    if (!game.participants) return new Response(JSON.stringify({ error: "게임 중이 아님" }), { status: 200, headers });

    // 이미지 경로용 데이터 드래곤 호출
    const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const ver = (await verRes.json())[0];
    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
    const champData = (await champRes.json()).data;
    
    const idToIdName = {}; // { "24": "Jax" } 식으로 저장
    for (const key in champData) { idToIdName[champData[key].key] = champData[key].id; }

    let myChampName = "";
    const pList = game.participants.map(p => {
      const cIdName = idToIdName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myChampName = cIdName;
      return {
        nick: (p.riotIdGameName || cIdName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : ""),
        cName: cIdName, // 'Jax', 'Aatrox' 같은 영어 이름
        team: p.teamId,
        s: [p.spell1Id, p.spell2Id],
        r: p.perks.perkStyle
      };
    });

    const prompt = `LoL 전문가 훈수. 내 챔피언: ${myChampName}. 룬/템 추천 제외. [요약] 3줄, [상세] 운영법 훈수.`;
    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const aiData = await aiRes.json();
    const strategy = aiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ pList, strategy, ver, myChampName }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "서버 오류" }), { status: 200, headers });
  }
}
