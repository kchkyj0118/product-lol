export async function onRequest(context) {
  const { request, env } = context;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers });

  try {
    const { summonerName, tagLine } = await request.json();
    const t = tagLine.replace('#', '').trim();

    const [cR, rR] = await Promise.all([
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json"),
      fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/runesReforged.json")
    ]);
    const cData = (await cR.json()).data;
    const rData = await rR.json();
    const cMap = {}; Object.values(cData).forEach(c => { cMap[c.key] = { id: c.id, name: c.name }; });
    const rMap = {}; rData.forEach(tree => { tree.slots[0].runes.forEach(r => { rMap[r.id] = r.icon; }); });

    const accR = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${t}?api_key=${env.RIOT_API_KEY}`);
    const acc = await accR.json();
    if (!acc.puuid) throw new Error("소환사 없음");

    const gR = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
    if (gR.status === 404) throw new Error("게임 중 아님");
    const game = await gR.json();

    const supports = ['Thresh','Lulu','Yuumi','Janna','Leona','Nautilus','Karma','Sona','Nami','Soraka','Rell','Milio','Alistar','Braum','Pyke','Senna','Bard','Renata'];
    const tops = ['Darius','Garen','Fiora','Jax','Camille','Renekton','Aatrox','Malphite','Ornn','Sion','KSante','Gwen','Mordekaiser'];

    const players = game.participants.map(p => {
      const c = cMap[p.championId] || { id: "Unknown", name: "알 수 없음" };
      const sN = p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어");
      let score = 3; 
      if (p.spell1Id === 11 || p.spell2Id === 11) score = 2;
      else if (p.spell1Id === 7 || p.spell2Id === 7) score = 4;
      else if (supports.includes(c.id)) score = 5;
      else if (p.spell1Id === 12 || p.spell2Id === 12) score = tops.includes(c.id) ? 1 : 3;
      return { summonerName:sN, champId:c.id, champKName:c.name, spell1:p.spell1Id, spell2:p.spell2Id, mainRuneIcon:rMap[p.perks.perkIds[0]]||"", teamId:p.teamId, isMe:sN.includes(summonerName), score };
    }).sort((a,b) => a.score - b.score);

    const teams = { Blue: players.filter(p=>p.teamId===100), Red: players.filter(p=>p.teamId===200) };
    const my = players.find(p=>p.isMe) || players[0];

    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `아이템/룬 금지. ${my.summonerName}(${my.champKName}) 중심 코칭. 우리:${teams.Blue.map(p=>p.champKName)}, 상대:${teams.Red.map(p=>p.champKName)}. 1.초반상성(타이밍) 2.운영(동선) 3.한타역할. 단호한 챌린저 말투로.`;
    
    const gemRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
    const gemData = await gemRes.json();
    const strategy = gemData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), { headers });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}