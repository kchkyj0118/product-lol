export async function onRequest(context) {
  const { request, env } = context;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers });

  try {
    const body = await request.json();
    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    let strategy = "", teams = null;

    if (body.mode === 'sim') {
      const bT = body.teams.Blue.map(p => `${p.pos}: ${p.champ}(${p.s1}/${p.s2})`).join(", ");
      const rT = body.teams.Red.map(p => `${p.pos}: ${p.champ}(${p.s1}/${p.s2})`).join(", ");
      const prompt = `롤 챌린저 코치. 우리:[${bT}], 상대:[${rT}]. 포지션과 스펠을 고려해 1.라인전상성 2.한타때 누가 누구를 마크해야 하는지 3.핵심 승리 플랜을 단호하게 설명해줘.`;
      const gRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
      const gData = await gRes.json();
      strategy = gData.candidates[0].content.parts[0].text;
    } else {
      const { name, tag } = body;
      const accR = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${env.RIOT_API_KEY}`);
      const acc = await accR.json();
      const gR = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`);
      if (gR.status === 404) throw new Error("게임 중 아님");
      const game = await gR.json();
      const cR = await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json");
      const cData = (await cR.json()).data;
      const cMap = {}; Object.values(cData).forEach(c => { cMap[c.key] = { id: c.id, name: c.name }; });
      const players = game.participants.map(p => {
        const c = cMap[p.championId] || { id: "Unknown", name: "알 수 없음" };
        const sN = p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어");
        return { summonerName:sN, champId:c.id, champKName:c.name, isMe:sN.includes(name), teamId:p.teamId, spell1:p.spell1Id, spell2:p.spell2Id };
      });
      teams = { Blue: players.filter(p=>p.teamId===100), Red: players.filter(p=>p.teamId===200) };
      const prompt = `실시간 분석. 우리:[${teams.Blue.map(p=>p.champKName)}], 상대:[${teams.Red.map(p=>p.champKName)}]. 상성 및 전략 요약.`;
      const gRes = await fetch(gUrl, { method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] }) });
      strategy = (await gRes.json()).candidates[0].content.parts[0].text;
    }
    return new Response(JSON.stringify({ strategy, teams }), { headers });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}