export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. 데이터 수집 (병렬 처리로 속도 향상)
    const acc = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
    if (!acc.puuid) throw new Error("유저 정보를 찾을 수 없습니다.");

    const [game, v] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(r => r.json()),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()).then(vs => vs[0])
    ]);

    if (!game.participants) throw new Error("현재 게임 중이 아닙니다.");

    // 2. 챔피언 데이터 매핑
    const cData = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(r => r.json()).then(res => res.data);
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { nick: p.riotIdGameName || cn, cName: cn, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkStyle };
    });

    // 3. Gemini 3 Flash Preview 1타 강사 분석
    const prompt = `당신은 op.gg, lol.ps, deeplol 데이터를 기반으로 승리 전략을 짜주는 롤 1타 강사입니다. 
    분석의 주인공(검색 유저): [${myC}]
    블루팀 구성: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
    레드팀 구성: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

    [명령]
    1. 반드시 분석의 주인공인 [${myC}]의 시점에서 승리 전략을 작성하십시오.
    2. 룬 추천과 아이템 빌드 추천은 절대 하지 마십시오. (이미 유저가 선택한 상태임을 가정)
    3. [요약]: [${myC}]가 이번 게임에서 승리하기 위한 핵심 전략 딱 3줄 요약. (상성, 3렙 타이밍, 핵심 동선/마인드셋 포함)
    4. [상세]: 주인공의 포지션에 따른 라인전 디테일, 한타 포지셔닝, 오브젝트 주도권 활용법을 "~해라" 체로 아주 구체적으로 작성.
    5. 최신 메타(op.gg, lol.ps 기준)를 반영하여 주인공이 중후반 왕귀형인지, 초반 스노우볼형인지에 따른 성장 집중도를 명시하십시오.
    
    반드시 [요약]과 [상세] 구분자를 사용하여 내용을 나누십시오.`;

    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    }).then(r => r.json());

    const fullText = ai.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패: 데이터를 가져오지 못했습니다.";
    const parts = fullText.split('[상세]');
    const summary = parts[0].replace('[요약]', '').trim();
    const detail = parts[1] ? parts[1].trim() : "상세 분석 결과가 없습니다.";
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: h }); 
  }
}
