export async function onRequest(context) {
  const { request, env } = context;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers });

  try {
    const body = await request.json();
    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    let strategy = "", teams = null;

    if (body.mode === 'sim') {
      const prompt = `롤 챌린저 코치 빙의. 아이템/룬 언급 금지. 우리조합:[${body.teams.Blue.join(",")}], 상대조합:[${body.teams.Red.join(",")}]. 1:1~5:5 상황에 맞춰 상성, 주의할 스킬, 승리 플랜을 단호하게 설명해줘.`;
      const gRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
      const gData = await gRes.json();
      strategy = gData.candidates[0].content.parts[0].text;
    } else {
      const { name, tag } = body;
      const accR = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${env.RIOT_API_KEY}`);
      const acc = await accR.json();
      if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다.");

      const gR = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
      if (gR.status === 404) throw new Error("현재 게임 중이 아닙니다.");
      const game = await gR.json();

      const cR = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
      const cData = (await cR.json()).data;
      const cMap = {}; Object.values(cData).forEach(c => { cMap[c.key] = { id: c.id, name: c.name }; });

      const supports = ['Thresh','Lulu','Yuumi','Leona','Nautilus','Karma','Sona','Soraka','Pyke','Senna'];
      const tops = ['Darius','Garen','Fiora','Jax','Renekton','Aatrox','Malphite','Sion'];

      const players = game.participants.map(p => {
        const c = cMap[p.championId] || { id: "Unknown", name: "알 수 없음" };
        const sN = p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어");
        let score = 3;
        if (p.spell1Id === 11 || p.spell2Id === 11) score = 2;
        else if (p.spell1Id === 7 || p.spell2Id === 7) score = 4;
        else if (supports.includes(c.id)) score = 5;
        else if (p.spell1Id === 12 || p.spell2Id === 12) score = tops.includes(c.id) ? 1 : 3;
        return { summonerName:sN, champId:c.id, champKName:c.name, isMe:sN.includes(name), score, teamId:p.teamId };
      }).sort((a,b) => a.score - b.score);

      teams = { Blue: players.filter(p=>p.teamId===100), Red: players.filter(p=>p.teamId===200) };
      const my = players.find(p=>p.isMe) || players[0];
      const prompt = `${my.summonerName}(${my.champKName}) 중심 실시간 코칭. 아이템/룬 언급 금지. 우리:[${teams.Blue.map(p=>p.champKName)}], 상대:[${teams.Red.map(p=>p.champKName)}]. 상성, 동선, 한타 역할을 단호하게 요약해줘.`;
      
      const gRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
      const gData = await gRes.json();
      strategy = gData.candidates[0].content.parts[0].text;
    }

    return new Response(JSON.stringify({ strategy, teams }), { headers });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}