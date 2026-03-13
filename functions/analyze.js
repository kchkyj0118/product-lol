export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { name, tag } = await request.json();
    
    // 1. Riot API 호출 (순차 호출로 안정성 확보)
    const acc = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
    if (!acc.puuid) throw new Error("라이엇 계정을 찾을 수 없습니다.");

    const game = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
    if (!game.participants) throw new Error("현재 해당 플레이어는 게임 중이 아닙니다.");

    // 2. 최신 버전 및 챔피언 데이터 매핑
    const v = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()).then(vs => vs[0]);
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(r => r.json());
    const cData = cRes.data;
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myChampName = "Unknown";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myChampName = cn;
      return { nick: p.riotIdGameName || cn, cName: cn, team: p.teamId };
    });

    // 3. Gemini 3 Flash Preview 호출 (초경량 프롬프트)
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({
        contents: [{ parts: [{ text: `리그오브레전드 전문가 분석. 내 챔피언: [${myChampName}]. 룬/템 추천 금지. 실전에서 바로 쓸 수 있는 승리 전략 3줄 요약과 라인별 구체적인 팁을 아주 짧고 단호하게 반말로 알려줘.` }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
      })
    }).then(r => r.json());

    const strategy = ai.candidates?.[0]?.content?.parts?.[0]?.text || "현재 메타 데이터를 불러올 수 없습니다. 게임에 집중하세요!";
    
    // 4. 클라이언트로 모든 데이터를 묶어서 전송 (변수명 myChamp 고정)
    return new Response(JSON.stringify({ pList, strategy, ver: v, myChamp: myChampName }), { status: 200, headers: h });
  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message || "분석 서버 연결 실패" }), { status: 200, headers: h }); 
  }
}
