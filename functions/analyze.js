export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!allies || !enemies || !myLine) {
      return new Response(JSON.stringify({ error: "Missing team or lane information." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let modeSpecificInstruction = "";
    switch (analysisMode) {
      case "LANE":
        modeSpecificInstruction = `
          [집중 분석 모드: 우리 라인 1:1]
          - 상대 라인 챔피언과의 극초반 상성(1~6레벨)을 정밀 분석하세요.
          - 핵심 스킬의 쿨타임 체킹, 딜교환 이득 타이밍, 룬/아이템 선택 전략을 제시하세요.
          - 라인 프리징 혹은 푸쉬 타이밍 등 라인 관리법을 상세히 조언하세요.
        `;
        break;
      case "SKIRMISH":
        modeSpecificInstruction = `
          [집중 분석 모드: 정글 포함 2:2 교전]
          - 우리 라인과 정글러의 시너지를 분석하세요.
          - 초반 바위게 교전 가능성, 역갱 타이밍, 2:2 교전 시 우선 포커싱 대상을 지정하세요.
          - 정글러의 동선에 따른 라인 지원 타이밍을 최적화하여 제안하세요.
        `;
        break;
      case "FULL":
      default:
        modeSpecificInstruction = `
          [집중 분석 모드: 전체 5:5 승리 플랜]
          - 팀 전체의 조합 밸런스(포킹, 돌진, 유지력 등)를 평가하세요.
          - 단계별(초반/중반/후반) 팀 전체가 취해야 할 핵심 오브젝트 전략을 제시하세요.
          - 대규모 한타 시의 진형 형성 및 핵심 딜러 포커싱 전략을 포함하세요.
        `;
        break;
    }

    const systemPrompt = `
      당신은 세계 최고의 리그 오브 레전드(LoL) 전문 분석가이자 코치입니다. 
      최신 패치 노트, 챔피언 티어, 아이템 메타, 그리고 프로 경기 트렌드를 완벽하게 이해하고 있습니다.
      사용자에게 승리를 위한 구체적이고 실질적인 '승리 플랜'을 제공하는 것이 임무입니다.

      ${modeSpecificInstruction}

      [기본 공통 분석 규칙]
      1. 초반 라인전: 상성 분석 및 핵심 활용법.
      2. 정글 개입: 위험 요소 및 동선 조언.
      3. 중후반 운영: 오브젝트 및 한타 포지셔닝.
      4. 내 라인(${myLine}) 집중 조언.

      [응답 형식]
      - 반드시 한국어로 답변하세요.
      - 마크다운 형식을 사용하여 가독성을 높이세요.
      - 전문 용어를 사용하되 명확하게 설명하세요.
    `;

    const userPrompt = `
      내 라인: ${myLine}
      분석 모드: ${analysisMode}
      우리 팀: ${allies.join(", ")}
      상대 팀: ${enemies.join(", ")}

      위 정보를 바탕으로 최적의 승리 플랜을 분석해줘.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\n" + userPrompt }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    const aiText = result.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
