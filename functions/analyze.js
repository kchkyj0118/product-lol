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
    const prompt = `당신은 'op.gg', 'lol.ps', 'deeplol.gg'의 데이터를 완벽하게 학습한 리그 오브 레전드 승리 전략 전문가입니다.
    사용자가 입력한 팀 구성 정보를 바탕으로, 검색한 주인공 [${name}]의 챔피언 [${myC}] 관점에서 실전 훈수를 생성하십시오.

    [출력 규칙 - 반드시 지킬 것]

    1. 3줄 요약 (Summary):
    - 주인공 [${name}]의 [${myC}]가 이번 판에서 승리하기 위해 당장 실행해야 할 핵심 플레이 3가지만 적는다.
    - 룬 추천, 아이템 추천은 절대 하지 않는다. (공간 낭비 금지)

    2. 상세 분석 (Detail):
    - 주인공 [${name}]의 포지션에 따른 상대 라이너와의 3레벨 타이밍 상성, 정글러라면 카운터 정글링 및 갱킹 루트를 아주 구체적으로 찝어준다.
    - 예: "상대가 3렙 전에는 나보다 강하니 3렙 이후에 딜교 시도", "미드가 CC가 좋으니 미드 갱 추천"
    - "성장에 집중해라", "~해라" 체로 아주 구체적으로 작성한다.

    3. 톤앤매너:
    - 분석 실패 없이 확실하고 명확한 문장으로 출력한다.
    - 주인공 [${name}]의 이름을 언급하며 1타 강사처럼 조언한다.

    [제외 사항]
    - 룬 세팅, 템트리 정보는 절대 포함하지 마라. 오직 '플레이 전략'에만 집중하라.

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
