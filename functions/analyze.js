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

    // 2. 명령어 (사족 없이 핵심만 전달하도록 지시)
    const prompt = `너는 롤 1타 강사야. 반드시 한국어로 대답해.
    주인공: ${name} (${myC})
    대진표: ${teamDescription}

    인사말(반갑습니다, 학생 등)이나 "칠판 보세요", "집중하세요" 같은 불필요한 사족은 절대 하지 마. 
    감정적인 표현이나 서술형 미사여구를 빼고 오직 실전 전략과 핵심 데이터 분석 결과만 명확하게 전달해.

    [요약]
    - 실전 핵심 승리 전략 3줄 요약 (룬, 아이템 언급 금지).

    [상세]
    - ${myC} 입장에서의 구체적인 상성 및 3레벨 타이밍 분석.
    - 가장 갱킹 성공 확률이 높은 라인 지목 및 그 이유.
    - 승리를 위해 집중적으로 성장시켜야 할 핵심 아군 챔피언 선정 및 이유.
    - 교전 주의사항 및 주요 오브젝트 교전 전략.`;

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
