export async function onRequest(context) {
  const { request, env } = context;
  const h = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=UTF-8" };
  if (request.method === "OPTIONS") return new Response(null, { headers: h });

  try {
    const body = await request.json();
    const gKey = env.GEMINI_API_KEY;
    const rKey = env.RIOT_API_KEY;
    let strategy = "", teams = null;

    if (body.mode === 'sim') {
      const prompt = `롤 챌린저 코치. 우리:[${body.teams.Blue.map(p=>p.champ)}], 상대:[${body.teams.Red.map(p=>p.champ)}]. 조합 상성과 승리 플랜을 아주 단호하게 설명해줘.`;
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gKey}`, {
        method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] })
      });
      const gData = await gRes.json();
      strategy = gData.candidates[0].content.parts[0].text;
    } else {
      const accR = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${body.name}/${body.tag}?api_key=${rKey}`);
      const acc = await accR.json();
      if (!acc.puuid) throw new Error("소환사를 찾을 수 없습니다. (이름/태그 확인)");

      const gR = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${rKey}`);
      if (gR.status === 404) throw new Error("현재 해당 소환사는 게임 중이 아닙니다.");
      const game = await gR.json();

      const cData = (await (await fetch("https://ddragon.leagueoflegends.com/cdn/14.5.1/data/ko_KR/champion.json")).json()).data;
      const cMap = {}; Object.values(cData).forEach(c => { cMap[c.key] = { id: c.id, name: c.name }; });

      const players = game.participants.map(p => {
        const c = cMap[p.championId] || { id: "Unknown", name: "알 수 없음" };
        const sN = p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어");
        return { name:sN, champId:c.id, cName:c.name, isMe:sN.includes(body.name), teamId:p.teamId, s1:p.spell1Id, s2:p.spell2Id };
      });

      teams = { Blue: players.filter(p=>p.teamId===100), Red: players.filter(p=>p.teamId===200) };
      const prompt = `실시간 코칭. 우리:[${teams.Blue.map(p=>p.cName)}], 상대:[${teams.Red.map(p=>p.cName)}]. 현재 구도의 핵심 전략만 요약해줘.`;
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gKey}`, {
        method:'POST', body:JSON.stringify({ contents:[{parts:[{text:prompt}]}] })
      });
      strategy = (await gRes.json()).candidates[0].content.parts[0].text;
    }

    return new Response(JSON.stringify({ strategy, teams }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: h });
  }
}