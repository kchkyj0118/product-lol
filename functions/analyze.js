export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summonerName, tagLine } = await request.json();

    // 1. 챔피언 데이터 (ID -> 이름 변환용)
    const champRes = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
    const champData = await champRes.json();
    const champMap = {};
    Object.values(champData.data).forEach(c => { champMap[c.key] = { id: c.id, name: c.name }; });

    // 2. 소환사 PUUID 조회
    const accReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accReq.json();
    if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다.");

    // 3. 인게임 데이터 조회
    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const game = await gameReq.json();

    // 4. 팀별 데이터 정리 (스펠 포함)
    const teams = { Blue: [], Red: [] };
    game.participants.forEach(p => {
      const c = champMap[p.championId] || { id: "Shaco", name: "알 수 없음" };
      const pInfo = {
        name: p.summonerId || summonerName, // 닉네임 안 깨지게 보정
        champId: c.id, 
        champName: c.name,
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        tag: tagLine
      };
      p.teamId === 100 ? teams.Blue.push(pInfo) : teams.Red.push(pInfo);
    });

    // 5. Gemini 분석
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `롤 분석가 모드: 우리팀(${teams.Blue.map(p=>p.champName)}), 상대팀(${teams.Red.map(p=>p.champName)}). 상대 핵심 챔피언 견제법과 우리팀 승리 플랜을 한국어로 짧고 굵게 3줄 요약해줘.`;

    const gRes = await fetch(geminiUrl, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const gData = await gRes.json();
    const strategy = gData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}