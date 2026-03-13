export async function onRequestPost(context) {
  // 1. 환경 변수 우선순위 체크 (Production/Preview 모두 대응)
  const RIOT_API_KEY = context.env.RIOT_API_KEY;

  try {
    const body = await context.request.json();
    const { summonerName, tagLine, isSim } = body;

    // 기본 응답 구조 선언 (에러 시에도 이 구조를 반환하여 'Blue' 정의되지 않음 에러 방지)
    let resultData = {
      teams: {
        Blue: [],
        Red: []
      },
      strategy: "분석을 시작할 수 없습니다. 다시 시도해주세요."
    };

    // 2. 조합 시뮬레이션 모드 처리
    if (isSim) {
      return new Response(JSON.stringify({ teams: body.teams, strategy: "시뮬레이션 분석 완료" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. 실시간 분석 로직 (키가 있을 때만 실행)
    if (RIOT_API_KEY) {
      try {
        const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${RIOT_API_KEY}`);
        const accData = await accRes.json();

        if (accData.puuid) {
          const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${accData.puuid}?api_key=${RIOT_API_KEY}`);
          const gameData = await gameRes.json();

          if (gameData.participants) {
            resultData.teams = { Blue: [], Red: [] };
            gameData.participants.forEach(p => {
              const side = p.teamId === 100 ? 'Blue' : 'Red';
              resultData.teams[side].push({
                name: p.riotId || summonerName,
                champId: p.championId,
                spell1: p.spell1Id,
                spell2: p.spell2Id
              });
            });
            resultData.strategy = "실시간 매치 분석이 완료되었습니다.";
          } else {
            resultData.strategy = "현재 해당 유저는 게임 중이 아닙니다.";
          }
        }
      } catch (apiErr) {
        resultData.strategy = "라이엇 API 연결에 실패했습니다.";
      }
    } else {
      resultData.strategy = "서버 설정(API_KEY)이 완료되지 않았습니다.";
    }

    // 최종 응답 (어떤 경우에도 resultData.teams.Blue가 존재함)
    return new Response(JSON.stringify(resultData), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // 최후의 보루: 빈 팀 구조라도 보내서 프론트엔드 폭발 방지
    return new Response(JSON.stringify({ 
      teams: { Blue: [], Red: [] }, 
      error: err.message 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });
  }
}