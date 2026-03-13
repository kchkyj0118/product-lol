export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summonerName, tagLine } = await request.json();

    const [cRes, rRes] = await Promise.all([
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json"),
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/runesReforged.json")
    ]);
    const champData = (await cRes.json()).data;
    const runeData = await rRes.json();
    const champMap = {}; Object.values(champData).forEach(c => { champMap[c.key] = { id: c.id, name: c.name }; });
    const runeMap = {}; runeData.forEach(tree => { tree.slots[0].runes.forEach(r => { runeMap[r.id] = r.icon; }); });

    const accReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accReq.json();
    if (!acc.puuid) throw new Error("해당 닉네임의 소환사를 찾을 수 없습니다.");

    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const game = await gameReq.json();

    // 포지션 추측 및 정렬 로직 (스펠 기반)
    const getPosScore = (p) => {
      if (p.spell1Id === 11 || p.spell2Id === 11) return 2; // 강타 들면 정글
      if (p.spell1Id === 12 || p.spell2Id === 12) return 1; // 텔 들면 탑 확률 높음
      return 3; // 나머지는 일단 미드/바텀/서폿
    };

    const processParticipants = (parts) => {
      return parts.map(p => {
        const c = champMap[p.championId] || { id: "Shaco", name: "알 수 없음" };
        return {
          summonerName: p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어"),
          champId: c.id,
          champKName: c.name,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          mainRuneIcon: runeMap[p.perks.perkIds[0]] || "",
          teamId: p.teamId,
          posScore: getPosScore(p)
        };
      }).sort((a, b) => a.posScore - b.posScore); // 간단 정렬
    };

    const sortedPlayers = processParticipants(game.participants);
    const teams = {
      Blue: sortedPlayers.filter(p => p.teamId === 100),
      Red: sortedPlayers.filter(p => p.teamId === 200)
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `당신은 롤 마스터 티어 분석가입니다. 
    우리팀: ${teams.Blue.map(p=>p.champKName).join(", ")}, 상대팀: ${teams.Red.map(p=>p.champKName).join(", ")}. 
    상대 조합의 파훼법과 우리 팀이 한타에서 집중해야 할 핵심 포인트를 한국어로 깔끔하게 분석해줘.`;
    
    const gRes = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const gData = await gRes.json();
    const strategy = gData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}