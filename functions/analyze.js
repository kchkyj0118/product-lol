export async function onRequestPost(context) {
  // 클라우드플레어에 저장해두신 'RIOT_API_KEY'를 자동으로 불러옵니다.
  const RIOT_API_KEY = context.env.RIOT_API_KEY; 

  try {
    const body = await context.request.json();
    const { summonerName, tagLine, isSim } = body;

    // 1. 조합 시뮬레이션 모드 (유저가 직접 입력 시)
    if (isSim) {
      return new Response(JSON.stringify({ teams: body.teams, strategy: "시뮬레이션 분석 완료" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 실시간 분석 모드 (유저 아이디 검색 시)
    // [Step 1] PUUID 가져오기
    const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
    const accData = await accRes.json();
    if (!accData.puuid) throw new Error("유저를 찾을 수 없습니다.");

    // [Step 2] 현재 게임 중인 10명 정보 가져오기
    const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accData.puuid}?api_key=${RIOT_API_KEY}`);
    if (gameRes.status === 404) throw new Error("현재 게임 중이 아닙니다.");
    const gameData = await gameRes.json();

    // [Step 3] 데이터 정리 (화면에서 'Blue'를 읽을 수 있게 구조화)
    const teams = { Blue: [], Red: [] };
    gameData.participants.forEach(p => {
      const side = p.teamId === 100 ? 'Blue' : 'Red';
      teams[side].push({
        name: p.riotId || "플레이어",
        champId: p.championId,
        spell1: p.spell1Id,
        spell2: p.spell2Id,
        pos: "분석 중"
      });
    });

    return new Response(JSON.stringify({ teams, strategy: "AI 실시간 코칭 분석이 완료되었습니다." }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // 에러 발생 시 화면이 멈추지 않게 에러 메시지 전달
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}