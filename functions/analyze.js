export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json" };
  try {
    const body = await request.json();
    const { name, tag } = body;
    if (!name || !tag) return new Response(JSON.stringify({ error: "닉네임과 태그를 입력하세요." }), { status: 200, headers });

    // 1. 유저 & 게임 조회
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`);
    const account = await accRes.json();
    if (!account.puuid) return new Response(JSON.stringify({ error: "라이엇 계정을 찾을 수 없습니다." }), { status: 200, headers });

    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${env.RIOT_API_KEY}`);
    const game = await gameRes.json();
    if (!game.participants) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });

    // 2. 데이터 가공 로직
    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const ver = (await vRes.json())[0];
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
    const { data: cData } = await cRes.json();
    const idToName = {};
    for (const k in cData) { idToName[cData[k].key] = cData[k].id; }

    // 포지션 정렬을 위한 맵 (탑, 정글, 미드, 원딜, 서폿 순)
    // Spectator API에서는 주문(Smite)이나 내부 데이터를 통해 유추해야 할 수도 있으나,
    // 기본적으로 제공되는 순서가 있다면 사용하고 아니면 보조 로직이 필요할 수 있습니다.
    // 여기서는 기본적으로 팀별로 나눈 후 Gemini에게 정렬을 맡기거나 수동 정렬을 시도합니다.
    
    let myC = "";
    const pListRaw = game.participants.map(p => {
      const n = idToName[p.championId] || "Unknown";
      if (p.puuid === account.puuid) myC = n;
      
      // 포지션 유추 로직 (임시: 스펠 기반)
      let roleScore = 0;
      if (p.spell1Id === 11 || p.spell2Id === 11) roleScore = 2; // JUNGLE
      
      return { 
        nick: p.riotIdGameName || n, 
        cName: n, 
        team: p.teamId, 
        s: [p.spell1Id, p.spell2Id], 
        r: p.perks.perkStyle,
        championId: p.championId,
        roleScore: roleScore
      };
    });

    // 3. 제미나이 분석 (정렬 포함 요청)
    const prompt = `LoL 챌린저 분석가. 내 챔피언: ${myC}. 
블루팀: ${pListRaw.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
레드팀: ${pListRaw.filter(p=>p.team===200).map(p=>p.cName).join(", ")}

명령:
1. 룬/템 추천 금지.
2. [요약]: 3줄 요약.
3. [상세]: 운영법 훈수.
4. [정렬]: 블루팀 5명과 레드팀 5명을 각각 '탑, 정글, 미드, 원딜, 서폿' 순서에 가장 적합하게 배치해서 챔피언 이름만 콤마로 구분해서 보내줘.
형식: [라인정렬] 블루:챔1,챔2,... 레드:챔3,챔4,...`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const aiData = await aiRes.json();
    const fullText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // AI가 정렬해준 정보를 바탕으로 pList 재정렬 시도
    let sortedPList = pListRaw;
    try {
      const lineMatch = fullText.match(/\[라인정렬\] 블루:(.*) 레드:(.*)/);
      if (lineMatch) {
        const blueOrder = lineMatch[1].split(",").map(s => s.trim());
        const redOrder = lineMatch[2].split(",").map(s => s.trim());
        
        const sortByOrder = (list, order) => {
          return [...list].sort((a, b) => {
            let idxA = order.indexOf(a.cName);
            let idxB = order.indexOf(b.cName);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
        };
        
        const blueSorted = sortByOrder(pListRaw.filter(p=>p.team===100), blueOrder);
        const redSorted = sortByOrder(pListRaw.filter(p=>p.team===200), redOrder);
        sortedPList = [...blueSorted, ...redSorted];
      }
    } catch (e) { console.error("Sorting error", e); }

    const strategy = fullText.split('[라인정렬]')[0].trim();

    return new Response(JSON.stringify({ pList: sortedPList, strategy, ver, myC }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "서버 오류: " + e.message }), { status: 200, headers });
  }
}
