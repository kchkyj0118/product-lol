export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  
  try {
    const { name, tag } = await request.json();
    const RIOT_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;

    if (!RIOT_KEY || !GEMINI_KEY) {
      return new Response(JSON.stringify({ error: "서버 설정 오류 (API Key 누락)" }), { status: 200, headers });
    }

    // 1. 병렬 호출로 계정 및 버전 정보 획득
    const [accRes, vRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_KEY}`),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    ]);

    if (!accRes.ok) return new Response(JSON.stringify({ error: "플레이어를 찾을 수 없습니다." }), { status: 200, headers });
    const account = await accRes.json();
    const ver = (await vRes.json())[0];

    // 2. 게임 정보 및 챔피언 데이터 병렬 조회
    const [gameRes, cRes] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${RIOT_KEY}`),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`)
    ]);

    if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다. (로딩 완료 후 시도해주세요)" }), { status: 200, headers });
    const game = await gameRes.json();
    const { data: cData } = await cRes.json();

    const idToName = {};
    for (const k in cData) { idToName[cData[k].key] = cData[k].id; }

    let myC = "";
    const pListRaw = game.participants.map(p => {
      const n = idToName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myC = n;
      return { 
        nick: p.riotIdGameName || n, 
        cName: n, 
        team: p.teamId, 
        s: [p.spell1Id, p.spell2Id], 
        r: p.perks.perkStyle 
      };
    });

    // 3. AI 분석 (op.gg, lol.ps 스타일 페르소나 강화)
    const prompt = `당신은 op.gg와 lol.ps의 데이터를 기반으로 승리 전략을 도출하는 대한민국 최고의 LoL 전략 분석가입니다.
검색된 주인공: [${myC}]

블루팀: ${pListRaw.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
레드팀: ${pListRaw.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

[분석 명령]
1. 룬/템 추천은 절대 제외하십시오.
2. [${myC}] 챔피언의 특성을 고려하여 주인공 위주의 승리 공식을 짜십시오.
3. 특히 초반 정글 동선 설계 및 라인전 상성(예: 3레벨 타이밍 딜교, 선푸쉬 여부 등)을 아주 구체적으로 찝어주십시오.
4. 응답 형식 (반드시 준수):
   [정렬] 블루:탑,정글,미드,원딜,서폿 레드:탑,정글,미드,원딜,서폿
   [요약]
   - 1행: ${myC}가 게임을 터뜨려야 하는 핵심 타이밍
   - 2행: 현재 매치업에서의 라인전/정글 운영 핵심 팁
   - 3행: 한타 시 반드시 지켜야 할 승리 공식
   [상세]
   - 각 라인별 상성 분석 (누구를 노리고 피해야 하는지)
   - 초반 구체적인 행동 요령 (탑은 ~해라, 정글은 ~해라 식)`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!aiRes.ok) throw new Error("AI 분석 서버 응답 오류");
    const aiData = await aiRes.json();
    const fullText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 정렬 파싱 및 데이터 재배치
    let sortedPList = pListRaw;
    try {
      const sortMatch = fullText.match(/\[정렬\] 블루:(.*) 레드:(.*)/);
      if (sortMatch) {
        const bOrder = sortMatch[1].split(",").map(s => s.trim());
        const rOrder = sortMatch[2].split(",").map(s => s.trim());
        const sortByOrder = (list, order) => [...list].sort((a, b) => {
          const idxA = order.indexOf(a.cName);
          const idxB = order.indexOf(b.cName);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        sortedPList = [...sortByOrder(pListRaw.filter(p=>p.team===100), bOrder), ...sortByOrder(pListRaw.filter(p=>p.team===200), rOrder)];
      }
    } catch (e) {}

    // 요약과 상세 분리 로직 강화 (Sett 등 특정 챔피언 분석 실패 방지)
    const summary = fullText.split('[상세]')[0].split('[요약]')[1]?.trim() || "분석을 요약할 수 없습니다.";
    const detail = fullText.split('[상세]')[1]?.trim() || fullText.split('[요약]')[0]?.trim() || "상세 정보를 가져올 수 없습니다.";

    return new Response(JSON.stringify({ pList: sortedPList, summary, detail, ver, myC }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "실시간 데이터 분석 실패: " + e.message }), { status: 200, headers });
  }
}
