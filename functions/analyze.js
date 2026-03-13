export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  
  try {
    const { name, tag } = await request.json();
    
    // 1. Riot API 호출 및 기본 데이터 획득
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accRes.json();
    if (!acc.puuid) throw new Error("플레이어를 찾을 수 없습니다. 닉네임과 태그를 확인하세요.");

    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    const game = await gameRes.json();
    if (!game.participants) throw new Error("현재 게임 중이 아닙니다. 로딩 화면 진입 후 시도하세요.");

    // 2. 최신 데이터 드래곤 및 챔피언 매핑
    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const v = (await vRes.json())[0];
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`);
    const { data: cData } = await cRes.json();
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myChamp = "";
    const pList = game.participants.map(p => {
      const cName = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myChamp = cName;
      return { 
        nick: p.riotIdGameName || cName, 
        cName, 
        team: p.teamId, 
        s: [p.spell1Id, p.spell2Id], 
        r: p.perks.perkStyle 
      };
    });

    // 3. Gemini AI 훈수 생성 (op.gg, lol.ps 메타 반영 전문 프롬프트)
    const prompt = `LoL 프로 팀 분석관 모드. 주인공 챔피언: [${myChamp}]. 
    룬/템 추천 절대 금지. 
    [요약]: 상성 분석, 3레벨 타이밍 딜교, 정글 동선 설계 위주로 핵심 전략 딱 3줄 작성.
    [상세]: 탑, 정글, 미드 등 각 라인별 구체적인 운영법과 한타 포커싱 훈수 ("~해라" 체 사용).
    반드시 [상세] 라는 단어를 구분자로 사용하여 내용을 나누십시오.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST", 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!aiRes.ok) throw new Error("AI 분석 서버 응답 실패");
    const aiData = await aiRes.json();
    const fullText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "분석 데이터를 생성할 수 없습니다.";
    
    const parts = fullText.split('[상세]');
    const summary = parts[0].replace('[요약]', '').trim();
    const detail = parts[1] ? parts[1].trim() : "상세 분석 결과가 없습니다.";

    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myChamp }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers });
  }
}
