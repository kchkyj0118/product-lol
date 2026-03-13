export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    
    // 시뮬레이션인지 실시간 분석인지 구분해서 데이터 추출
    let teams = body.isSim ? body.teams : null;

    // 만약 실시간 분석이면 라이엇 API 등을 통해 데이터를 가져오는 로직이 여기 들어갑니다.
    // 현재는 테스트를 위해 기본 구조를 잡아줍니다.
    if (!teams) {
      // 실시간 분석 요청 시 응답 구조 (에러 방지용 임시 데이터)
      teams = {
        Blue: [{ name: body.summonerName || "플레이어", cName: "챔피언", champId: "Aali", pos: "TOP", spell1: "SummonerFlash", spell2: "SummonerTeleport" }],
        Red: [{ name: "상대", cName: "챔피언", champId: "Garen", pos: "TOP", spell1: "SummonerFlash", spell2: "SummonerIgnite" }]
      };
    }

    // AI 전략 생성 (이 부분에 Gemini API 연결 로직이 들어갑니다)
    const strategy = body.isSim 
      ? "시뮬레이션 분석 결과: 조합의 밸런스가 좋습니다. 초반 라인전에 집중하세요."
      : `${body.summonerName}님의 게임을 분석한 결과, 상대 탑 가렌의 초반 압박을 주의해야 합니다.`;

    return new Response(JSON.stringify({
      teams: teams,
      strategy: strategy
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}