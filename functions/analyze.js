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
    if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다.");

    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const game = await gameReq.json();

    const processParticipants = (parts) => {
      return parts.map(p => {
        const c = champMap[p.championId] || { id: "Shaco", name: "알 수 없음" };
        const sName = p.riotId ? p.riotId.split('#')[0] : (p.summonerId || "플레이어");
        return {
          summonerName: sName,
          champId: c.id,
          champKName: c.name,
          spell1: p.spell1Id,
          spell2: p.spell2Id,
          mainRuneIcon: runeMap[p.perks.perkIds[0]] || "",
          teamId: p.teamId,
          isMe: sName === summonerName
        };
      });
    };

    const allPlayers = processParticipants(game.participants);
    const myInfo = allPlayers.find(p => p.isMe) || allPlayers[0];
    const teams = {
      Blue: allPlayers.filter(p => p.teamId === 100),
      Red: allPlayers.filter(p => p.teamId === 200)
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    
    // 🎯 아이템/룬 추천을 제외한 빡빡한 전략 프롬프트
    const prompt = `당신은 롤 챌린저 출신 코치입니다. 아이템이나 룬 추천은 절대 하지 마세요.
    오직 챔피언 상성과 스킬 타이밍, 팀 조합에 기반한 '운영 전략'만 제공합니다.

    검색 유저(주인공): ${myInfo.summonerName} (${myInfo.champKName})
    우리팀: ${teams.Blue.map(p=>p.champKName).join(", ")}
    상대팀: ${teams.Red.map(p=>p.champKName).join(", ")}

    다음 가이드라인에 맞춰 ${myInfo.summonerName}님을 위한 승리 시나리오를 써주세요:
    1. [초반/상성]: 아이템 얘기 빼고, 상대 라이너와의 순수 상성(예: 3렙 전엔 사려라, 6렙 궁 배우면 킬각이다 등)을 분석해줘.
    2. [동선/운영]: 현재 메타와 아군/적군 조합을 보고, 어느 라인을 키워야 승률이 높은지, 카운터 정글이나 로밍 동선을 어떻게 짤지 조언해줘.
    3. [한타]: 본인 챔피언의 역할을 정의해줘 (예: 상대 원딜 마크, 아군 케어, 진입 각 등).

    한국어로, 군더더기 없이 단호한 코치 말투로 답변하세요.`;

    const gRes = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const gData = await gRes.json();
    const strategy = gData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}