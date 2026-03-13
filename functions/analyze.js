export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json" };
  
  try {
    const { name, tag } = await request.json();
    const RIOT_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;

    // [1단계: 병렬 호출] 계정 정보와 데이터 드래곤 버전을 동시에 가져옵니다.
    const [accRes, vRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_KEY}`),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    ]);

    const account = await accRes.json();
    const versions = await vRes.json();
    const ver = versions[0];

    if (!account.puuid) return new Response(JSON.stringify({ error: "라이엇 계정을 찾을 수 없습니다." }), { status: 200, headers });

    // [2단계: 병렬 호출] 실시간 게임 정보와 챔피언 데이터를 동시에 가져옵니다.
    const [gameRes, cRes] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${RIOT_KEY}`),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`)
    ]);

    const game = await gameRes.json();
    const { data: cData } = await cRes.json();

    if (!game.participants) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });

    // 챔피언 ID 매핑
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

    // [3단계: AI 분석] 검색된 유저(myC)를 주인공으로 한 전략 생성
    // lol.ps, op.gg 등의 데이터 스타일을 차용하도록 페르소나 강화
    const prompt = `당신은 lol.ps, op.gg, deeplol의 데이터를 분석하고 유튜브 메타 영상을 꿰고 있는 프로 팀 수석 분석가입니다.
검색한 주인공 챔피언: [${myC}]

블루팀: ${pListRaw.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
레드팀: ${pListRaw.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

명령:
1. 아이템 및 룬 추천은 절대 하지 마십시오.
2. 주인공인 [${myC}]의 시점에서 게임을 어떻게 터뜨려야 할지 분석하십시오.
3. 응답 형식을 반드시 지키십시오:
   [정렬] 블루:탑챔프,정글챔프,미드챔프,원딜챔프,서폿챔프 레드:탑챔프,정글챔프,미드챔프,원딜챔프,서폿챔프
   [요약]
   - 1행: ${myC}가 강해지는 타이밍 (레벨, 스킬 유무)
   - 2행: 라인전 핵심 운영법 (상성에 따른 딜교 타이밍)
   - 3행: 한타 또는 중후반 승리 공식
   [상세]
   - 라인별 상성 및 주의사항, 정글 동선 설계, 팀원과의 시너지, 한타 시 최우선 타겟팅 등 구체적인 훈수를 챌린저 급 시야로 작성하십시오.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const aiData = await aiRes.json();
    const fullText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 정렬 정보 파싱
    let sortedPList = pListRaw;
    try {
      const sortMatch = fullText.match(/\[정렬\] 블루:(.*) 레드:(.*)/);
      if (sortMatch) {
        const bOrder = sortMatch[1].split(",").map(s => s.trim());
        const rOrder = sortMatch[2].split(",").map(s => s.trim());
        const sortByOrder = (list, order) => [...list].sort((a, b) => (order.indexOf(a.cName) === -1 ? 99 : order.indexOf(a.cName)) - (order.indexOf(b.cName) === -1 ? 99 : order.indexOf(b.cName)));
        sortedPList = [...sortByOrder(pListRaw.filter(p=>p.team===100), bOrder), ...sortByOrder(pListRaw.filter(p=>p.team===200), rOrder)];
      }
    } catch (e) {}

    // 요약과 상세 분리
    const summary = fullText.split('[요약]')[1]?.split('[상세]')[0]?.trim() || "분석 완료";
    const detail = fullText.split('[상세]')[1]?.trim() || "상세 정보 없음";

    return new Response(JSON.stringify({ pList: sortedPList, summary, detail, ver, myC }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "분석 중 오류 발생: " + e.message }), { status: 200, headers });
  }
}
