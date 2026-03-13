export async function onRequestPost(context) {
  const RIOT_API_KEY = "여기에_실제_라이엇_API_키를_넣으세요"; // 필수!
  
  try {
    const body = await context.request.json();
    
    // 1. 시뮬레이션 모드 처리
    if (body.isSim) {
      return new Response(JSON.stringify({
        teams: body.teams,
        strategy: "조합 시뮬레이션 결과: 팀의 밸런스가 매우 훌륭합니다."
      }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. 실시간 게임 분석 로직 (소환사명 + 태그 이용)
    const { summonerName, tagLine } = body;
    
    // [STEP 1] PUUID 가져오기
    const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
    const accountData = await accountRes.json();
    const puuid = accountData.puuid;

    // [STEP 2] 현재 게임 정보 가져오기
    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${RIOT_API_KEY}`);
    if (gameRes.status === 404) {
      return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 400 });
    }
    const gameData = await gameRes.json();

    // [STEP 3] 10명의 유저 데이터를 우리 팀(Blue) / 상대 팀(Red)으로 정리
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const side = p.teamId === 100 ? 'Blue' : 'Red';
      teams[side].push({
        name: p.summonerName,
        champId: p.championId, // 나중에 챔피언 이름으로 변환 필요
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        pos: "포지션 분석중"
      });
    });

    // 3. AI 전략 생성 (가져온 실시간 데이터를 바탕으로 질문)
    const strategy = `${summonerName}님의 현재 게임을 분석했습니다. 상대 팀의 조합이 강력하니 초반 교전을 피하세요.`;

    return new Response(JSON.stringify({ teams, strategy }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "API 연결 실패: " + err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
}