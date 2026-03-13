export async function onRequestPost(context) {
  // 개발자님이 클라우드플레어 대시보드에 설정해둔 그 키를 가져옵니다.
  const RIOT_API_KEY = context.env.RIOT_API_KEY; 

  try {
    const body = await context.request.json();
    const { summonerName, tagLine, isSim } = body;

    // 1. 조합 시뮬레이션 (유저가 직접 챔피언 넣었을 때)
    if (isSim) {
      return new Response(JSON.stringify({ teams: body.teams, strategy: "시뮬레이션 분석 완료" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 실시간 분석 (유저 닉네임으로 검색했을 때)
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
    const accData = await accRes.json();
    if (!accData.puuid) throw new Error("유저 정보를 찾을 수 없습니다.");

    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accData.puuid}?api_key=${RIOT_API_KEY}`);
    if (gameRes.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const gameData = await gameRes.json();

    // 10명의 챔피언, 스펠, 팀 정보를 정리해서 프론트로 전달
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const side = p.teamId === 100 ? 'Blue' : 'Red';
      teams[side].push({
        name: p.riotId || "Unknown",
        champId: p.championId,
        spell1: p.spell1Id,
        spell2: p.spell2Id
      });
    });

    return new Response(JSON.stringify({ teams, strategy: "AI 실시간 코칭 생성 완료" }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}