export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. 유저 및 게임 데이터 수집
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
        s: [p.spell1Id, p.spell2Id], // UI 아이콘 유지
        r: p.perks.perkStyle        // UI 아이콘 유지
      };
    });

    const teamDescription = pList.map(p => `${p.team === 100 ? '블루' : '레드'}: ${p.nick}(${p.cName})`).join(', ');

    // 2. 명령어 (내용을 충분히 쓰도록 지시)
    const prompt = `너는 롤 1타 강사야. 반드시 한국어로 대답해.
주인공: ${name} (${myC})
대진표: ${teamDescription}

반드시 아래 형식을 지켜. 중간에 끊기지 않게 끝까지 정성껏 써라. 상성, 동선, 3레벨 타이밍 등 아주 구체적으로 가르쳐줘.

[요약]
- 여기에 실전 승리 전략 3줄 요약만 작성해라. (룬, 아이템 언급 금지)

[상세]
- 여기에 주인공 ${name}님을 위한 아주 자세한 훈수를 작성해라.`;

    // 3. AI 호출 (토큰 제한 해제 및 온도 조절로 풍부한 답변 유도)
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 2048, // 글이 잘리지 않도록 확장
          topP: 0.9
        }
      })
    }).then(r => r.json());

    const fullText = ai.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 분석 실패";
    
    // 4. 안전한 파싱
    let summary = fullText;
    let detail = "상세 분석을 가져오지 못했습니다.";

    if (fullText.includes("[상세]")) {
      const parts = fullText.split("[상세]");
      summary = parts[0].replace("[요약]", "").trim();
      detail = parts[1].trim();
    } else if (fullText.includes("상세:")) {
      const parts = fullText.split("상세:");
      summary = parts[0].replace("요약:", "").trim();
      detail = parts[1].trim();
    }
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: h }); 
  }
}
