export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  
  try {
    const { name, tag } = await request.json();
    const RIOT_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;

    // [병렬 호출 1] 계정 정보와 데이터 드래곤 버전 동시 조회
    const [accRes, vRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_KEY}`),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    ]);

    const account = await accRes.json();
    const ver = (await vRes.json())[0];

    if (!account.puuid) return new Response(JSON.stringify({ error: "존재하지 않는 유저입니다." }), { status: 200, headers });

    // [병렬 호출 2] 게임 정보와 챔피언 데이터 동시 조회
    const [gameRes, cRes] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${RIOT_KEY}`),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`)
    ]);

    const game = await gameRes.json();
    const { data: cData } = await cRes.json();

    if (!game.participants) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });

    const idToName = {};
    for (const k in cData) { idToName[cData[k].key] = cData[k].id; }

    let myC = "";
    const pList = game.participants.map(p => {
      const n = idToName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myC = n;
      // 유저 닉네임 우선 추출
      const userNick = p.riotIdGameName || n;
      return { 
        nick: userNick, 
        cName: n, 
        team: p.teamId, 
        s: [p.spell1Id, p.spell2Id], 
        r: p.perks.perkStyle 
      };
    });

    // [AI 프롬프트] 1타 강사 모드, 라인별 구체적 훈수
    const prompt = `당신은 lol.ps, op.gg 메타를 완벽 분석한 LoL 1타 강사입니다. 
    주인공 챔피언: [${myC}]
    블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
    레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

    명령:
    1. 룬과 아이템 추천은 절대 하지 마십시오.
    2. [요약]: [${myC}]가 강해지는 타이밍과 당장 실천해야 할 핵심 플레이 3줄 요약.
    3. [상세]: 라인별 상성 및 주의사항을 '탑은 ~해라', '정글은 ~해라' 식으로 아주 구체적으로 작성.
    구분자 [상세]를 반드시 사용하여 요약과 상세를 나누십시오.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const aiData = await aiRes.json();
    const fullText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패";
    
    const [summaryPart, detailPart] = fullText.split('[상세]');
    const summary = summaryPart.replace('[요약]', '').trim();
    const detail = detailPart ? detailPart.trim() : "상세 분석을 생성하지 못했습니다.";

    return new Response(JSON.stringify({ pList, summary, detail, ver, myC }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "분석 오류: " + e.message }), { status: 200, headers });
  }
}
