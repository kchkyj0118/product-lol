export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summonerName, tagLine } = await request.json();

    // 1. 데이터 드래곤(챔피언, 스펠, 룬) 정보 로드
    const [vRes, cRes, rRes] = await Promise.all([
      fetch("https://ddragon.leagueoflegends.com/api/versions.json"),
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json"),
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/runesReforged.json")
    ]);
    const version = (await vRes.json())[0];
    const champData = (await cRes.json()).data;
    const runeData = await rRes.json();

    const champMap = {}; Object.values(champData).forEach(c => { champMap[c.key] = { id: c.id, name: c.name }; });
    const runeMap = {}; runeData.forEach(tree => { tree.slots[0].runes.forEach(r => { runeMap[r.id] = r.icon; }); });

    // 2. 라이엇 API 호출 (계정 -> 게임 정보)
    const accReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accReq.json();
    if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다.");

    const gameReq = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gameReq.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const game = await gameReq.json();

    // 3. 10명 정보 정리
    const teams = { Blue: [], Red: [] };
    game.participants.forEach(p => {
      const c = champMap[p.championId] || { id: "Shaco", name: "알 수 없음" };
      const mainRuneId = p.perks.perkIds[0];
      const pInfo = {
        name: p.summonerId || "플레이어",
        champId: c.id,
        champKName: c.name,
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        mainRuneIcon: runeMap[mainRuneId] || "",
        tag: tagLine
      };
      p.teamId === 100 ? teams.Blue.push(pInfo) : teams.Red.push(pInfo);
    });

    // 4. Gemini 분석 (10명 정보를 모두 전달)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `[롤 인게임 분석] 우리팀: ${teams.Blue.map(p=>p.champKName)}, 상대팀: ${teams.Red.map(p=>p.champKName)}. 조합 우위와 구체적인 승리 전략을 한국어로 3문장 요약해줘.`;
    
    const gRes = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const gData = await gRes.json();
    const strategy = gData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}