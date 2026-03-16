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
        s: [p.spell1Id, p.spell2Id], // UI 아이콘 유지용
        r: p.perks.perkStyle        // UI 아이콘 유지용
      };
    });

    const teamDescription = pList.map(p => `${p.team === 100 ? '블루' : '레드'}: ${p.nick}(${p.cName})`).join(', ');

    // 2. 명령어 (지침 고도화)
    const prompt = `당신은 롤 1타 강사입니다. 반드시 **한국어**로만 대답하세요.
주인공: ${name} (${myC})
대진표: ${teamDescription}

반드시 아래 양식을 엄격히 지켜서 답변하세요. 양식을 어기면 시스템이 고장납니다.

[요약]
- 여기에 주인공 ${name}을 위한 실전 승리 전략 3줄 요약만 작성하세요. (룬, 아이템 언급 금지)

[상세]
- 여기에 상대 라이너와의 상성, 3레벨 타이밍, 구체적인 정글 동선 등을 ${name}님에게 훈수 두듯 작성하세요.`;

    // 3. AI 호출 (일관성을 위해 온도를 낮춤)
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
      })
    }).then(r => r.json());

    const fullText = ai.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 4. 파싱 로직 강화
    let summary = "분석 실패";
    let detail = "상세 정보가 없습니다.";

    if (fullText.includes("[상세]")) {
      const parts = fullText.split("[상세]");
      summary = parts[0].replace("[요약]", "").trim();
      detail = parts[1].trim();
    } else if (fullText.includes("상세:")) {
      const parts = fullText.split("상세:");
      summary = parts[0].replace("요약:", "").trim();
      detail = parts[1].trim();
    } else {
      summary = fullText;
    }
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: h }); 
  }
}
