export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summonerName, tagLine } = await request.json();

    // 1. 데이터 드래곤 로드
    const [cRes, rRes] = await Promise.all([
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json"),
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/runesReforged.json")
    ]);
    const champData = (await cRes.json()).data;
    const runeData = await rRes.json();
    const champMap = {}; Object.values(champData).forEach(c => { champMap[c.key] = { id: c.id, name: c.name }; });
    const runeMap = {}; runeData.forEach(tree => { tree.slots[0].runes.forEach(r => { runeMap[r.id] = r.icon; }); });

    // 2. PUUID 및 실시간 게임 조회
    const accReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accReq.json();
    if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다.");

    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const game = await gameReq.json();

    // 포지션 우선순위 정의
    const posOrder = { "TOP": 1, "JUNGLE": 2, "MIDDLE": 3, "BOTTOM": 4, "UTILITY": 5, "": 6 };

    // 3. 10명 데이터 정리 및 정렬
    const processTeams = (participants) => {
      return participants.map(p => {
        const c = champMap[p.championId] || { id: "Shaco", name: "알 수 없음" };
        return {
          summonerName: p.riotId ? p.riotId.split('#')[0] : (p.summonerId || "플레이어"), // 소환사 이름 추출
          champId: c.id,
          champKName: c.name,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          mainRuneIcon: runeMap[p.perks.perkIds[0]] || "",
          teamId: p.teamId,
          // 라이엇 스펙테이터 API는 포지션을 직접 주지 않으므로 주문/챔피언 기반 추측 로직이 필요하나, 
          // 여기서는 기본 제공 필드(있을 경우)를 사용하거나 기본 정렬을 유지합니다.
        };
      });
    };

    const allPlayers = processTeams(game.participants);
    const teams = {
      Blue: allPlayers.filter(p => p.teamId === 100),
      Red: allPlayers.filter(p => p.teamId === 200)
    };

    // 4. Gemini 분석
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `[롤 인게임 분석] 우리팀 조합: ${teams.Blue.map(p=>p.champKName)}, 상대팀 조합: ${teams.Red.map(p=>p.champKName)}. 승리를 위한 핵심 전략 3줄 요약.`;
    const gRes = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const gData = await gRes.json();
    const strategy = gData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}