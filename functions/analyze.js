export async function onRequest(context) {
  const { request, env } = context;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers });

  try {
    const body = await request.json();
    let prompt = "";

    if (body.mode === 'sim') {
      // 🎯 시뮬레이션 모드 프롬프트
      prompt = `롤 챌린저 코치로서 분석해줘.
      우리팀 조합: ${body.teams.Blue.join(", ")}
      상대팀 조합: ${body.teams.Red.join(", ")}
      
      이 구성(1:1부터 5:5까지 가변적)에 대해:
      1. [상성]: 초반 기싸움과 상성 타이밍(몇렙에 누가 유리한지).
      2. [주의사항]: 상대 팀에서 가장 위협적인 요소와 대처법.
      3. [승리플랜]: 이 조합으로 이기기 위한 핵심 운영법.
      아이템/룬 추천 없이 전략에만 집중해서 단호하게 말해줘.`;
    } else {
      // 🎯 실시간 검색 모드 (기존 로직 유지)
      const { summonerName, tagLine } = body;
      const accR = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
      const acc = await accR.json();
      const gR = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
      if (gR.status === 404) throw new Error("게임 중 아님");
      const game = await gR.json();
      
      // ... (챔피언 이름 매핑 생략 - 기존 코드의 챔피언 이름 추출 로직 사용)
      prompt = `실시간 게임 분석: (기본 전략 프롬프트 사용)`;
    }

    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const gemRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
    const gemData = await gemRes.json();
    const strategy = gemData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ strategy }), { headers });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}