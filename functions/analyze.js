export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. Riot API 호출 (병렬 처리로 속도 최적화)
    const [acc, v] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(res => res.json()),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(res => res.json()).then(vs => vs[0])
    ]);

    if (!acc.puuid) throw new Error("유저 정보를 찾을 수 없습니다.");

    const [game, cData] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(res => res.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(res => res.json()).then(res => res.data)
    ]);

    if (!game.participants) throw new Error("현재 게임 중이 아닙니다.");

    // 2. 챔피언 데이터 매핑
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { 
        nick: p.riotIdGameName || cn, 
        cName: cn, 
        team: p.teamId,
        s: [p.spell1Id, p.spell2Id],
        r: p.perks.perkStyle
      };
    });

    // 3. Gemini 3 Flash Preview 호출
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `리그오브레전드 전문가 분석. 내 챔피언: [${myC}]. 룬/템 추천 금지. 
        1. [요약]: 상성 분석 및 3레벨 타이밍 핵심 운영 전략 3줄.
        2. [상세]: 라인전 디테일 및 한타 시 포지셔닝 훈수 ("~해라" 체 사용).
        반드시 [상세] 라는 구분자를 사용하여 내용을 나누십시오.` }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      })
    }).then(res => res.json());

    const txt = ai.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패: 모델 응답 없음";
    
    // 요약과 상세 분리
    const parts = txt.split('[상세]');
    const summary = parts[0].replace('[요약]', '').trim();
    const detail = parts[1] ? parts[1].trim() : "상세 분석 내용을 생성하지 못했습니다.";
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: `오류 발생: ${e.message}` }), { status: 200, headers: h }); 
  }
}
