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

    // 3. 팀 정보를 텍스트로 변환 (AI가 읽을 수 있게)
    const teamInfo = pList.map(p => 
      `${p.team === 100 ? '[블루팀]' : '[레드팀]'} ${p.nick} (${p.cName})`
    ).join('\n');

    // 4. Gemini 1타 강사 프롬프트 (데이터 주입)
    const prompt = `
    당신은 'op.gg', 'lol.ps', 'deeplol.gg'의 데이터를 완벽하게 학습한 리그 오브 레전드 승리 전략 전문가입니다. 
    제공된 [게임 데이터]를 분석해서 주인공 [${name}]의 [${myC}] 관점에서 실무적인 승리 전략을 생성하십시오.

    [게임 데이터]
    ${teamInfo}

    [출력 규칙 - 반드시 지킬 것]
    1. 반드시 "[요약]"이라는 글자로 시작해서 주인공 [${name}]이 이번 판에서 승리하기 위해 실행해야 할 핵심 플레이 딱 3줄 요약을 적을 것. (아이템/룬 금지)
    2. 반드시 "[상세]"라는 글자로 시작해서 상세 분석을 적을 것. (상대 라이너와의 3레벨 타이밍 상성, 정글러라면 동선 및 갱킹 루트를 구체적으로 찝어줄 것)
    3. 주인공 [${name}]의 이름을 직접 언급하며 1타 강사처럼 조언할 것.
    4. 룬 세팅, 템트리 정보는 절대 포함하지 마라. 오직 '플레이 전략'에만 집중하라.

    [출력 예시]
    [요약]
    - 내용1
    - 내용2
    - 내용3
    [상세]
    ${name}님, 이번 판은 상대 라이너가 초반에 강하니... (이하 생략)`;

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
