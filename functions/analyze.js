export async function onRequestPost(context) {
  // 1. 여기에 본인의 라이엇 API 키를 꼭 따옴표 사이에 넣으세요!
  const RIOT_API_KEY = "RGAPI-XXXX-XXXX-XXXX"; 

  try {
    const body = await context.request.json();
    const { summonerName, tagLine, isSim } = body;

    // 시뮬레이션 모드일 때는 그냥 보낸 데이터 그대로 보여줌
    if (isSim) {
      return new Response(JSON.stringify({ teams: body.teams, strategy: "조합 시뮬레이션 결과입니다." }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // [실시간 분석 시작]
    // Step 1: 닉네임+#태그로 PUUID 찾기
    const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
    const accountData = await accountRes.json();
    if (!accountData.puuid) throw new Error("사용자를 찾을 수 없습니다.");

    // Step 2: 현재 진행 중인 게임 정보 가져오기
    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}?api_key=${RIOT_API_KEY}`);
    if (gameRes.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const gameData = await gameRes.json();

    // Step 3: 10명의 데이터를 팀별로 정리
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const team = p.teamId === 100 ? 'Blue' : 'Red';
      teams[team].push({
        name: p.summonerName || summonerName, // 라이엇 정책에 따라 이름이 안 보일 수 있음
        champId: p.championId,
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        pos: "분석중"
      });
    });

    return new Response(JSON.stringify({
      teams: teams,
      strategy: `${summonerName}님의 게임을 실시간 분석 중입니다. 상대 조합의 핵심 챔피언을 견제하세요!`
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}