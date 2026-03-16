export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. 데이터 수집
    const acc = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
    if (!acc.puuid) throw new Error("유저 정보를 찾을 수 없습니다.");

    const [game, v] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(r => r.json()),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()).then(vs => vs[0])
    ]);

    if (!game.participants) throw new Error("현재 게임 중이 아닙니다.");

    const cData = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(r => r.json()).then(res => res.data);
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { 
        nick: p.riotIdGameName || cn, 
        cName: cn, 
        team: p.teamId,
        s: [p.spell1Id, p.spell2Id], // UI 유지용
        r: p.perks.perkStyle        // UI 유지용
      };
    });

    // 핵심 수정: AI에게 줄 팀 정보 텍스트화
    const teamDescription = pList.map(p => `${p.team === 100 ? '블루' : '레드'}: ${p.nick}(${p.cName})`).join(', ');

    // 2. Gemini 명령어 (프롬프트 고도화)
    const prompt = `당신은 'op.gg', 'lol.ps', 'deeplol.gg' 데이터를 완벽 학습한 롤 1타 강사입니다. 반드시 한국어로만 답변하세요.
    주인공: ${name} (${myC})
    팀 정보: ${teamDescription}

    [규칙]
    1. "[요약]" 섹션에 주인공 ${name}을 위한 핵심 전략 3줄 요약. (룬/템 언급 절대 금지)
    2. "[상세]" 섹션에 라인전 상성, 3레벨 타이밍, 동선 등 상세 훈수.
    3. 주인공 ${name}님의 이름을 직접 언급하며 1타 강사처럼 말할 것.
    4. 반드시 [상세] 라는 글자를 구분자로 포함해라.`;

    // 3. AI 호출 (성능이 더 좋은 gemini-3-flash-preview 유지 혹은 1.5-flash 선택 가능)
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
      })
    }).then(r => r.json());

    const fullText = ai.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패";
    const parts = fullText.split('[상세]');
    const summary = parts[0].replace('[요약]', '').trim();
    const detail = parts[1] ? parts[1].trim() : "상세 정보가 없습니다.";
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: h }); 
  }
}
