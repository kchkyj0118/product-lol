export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 1. API 키 호출부: onRequest 함수 내부에서 선언
  const GEMINI_API_KEY = env.GEMINI_API_KEY;

  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!allies || !enemies || !myLine) {
      return new Response(JSON.stringify({ error: "팀 정보 또는 라인 정보가 누락되었습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    if (!GEMINI_API_KEY) {
      console.error("Cloudflare Environment Variable 'GEMINI_API_KEY' is missing.");
      return new Response(JSON.stringify({ error: "Gemini API 키가 설정되지 않았습니다. Cloudflare 설정에서 GEMINI_API_KEY를 확인해주세요." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    let modeSpecificInstruction = "";
    switch (analysisMode) {
      case "LANE":
        modeSpecificInstruction = `
          [집중 분석 모드: 우리 라인 1:1]
          - 상대 라인 챔피언과의 극초반 상성(1~6레벨)을 정밀 분석하세요.
          - 핵심 스킬의 쿨타임 체킹, 딜교환 이득 타이밍, 룬/아이템 선택 전략을 제시하세요.
          - 라인 관리법(프리징/푸쉬)을 상세히 조언하세요.
        `;
        break;
      case "SKIRMISH":
        modeSpecificInstruction = `
          [집중 분석 모드: 정글 포함 2:2 교전]
          - 우리 라인과 정글러의 시너지를 분석하세요.
          - 초반 바위게 교전, 역갱 타이밍, 2:2 교전 시 우선 포커싱 대상을 지정하세요.
          - 정글러의 동선에 따른 라인 지원 타이밍을 최적화하여 제안하세요.
        `;
        break;
      case "FULL":
      default:
        modeSpecificInstruction = `
          [집중 분석 모드: 전체 5:5 승리 플랜]
          - 팀 전체의 조합 밸런스 및 단계별(초반/중반/후반) 핵심 오브젝트 전략을 제시하세요.
          - 대규모 한타 시의 진형 형성 및 핵심 딜러 포커싱 전략을 포함하세요.
        `;
        break;
    }

    // 3. 한국어 강제 지시 추가
    const systemPrompt = `
      당신은 세계 최고의 리그 오브 레전드(LoL) 전문 분석가이자 코치입니다. 
      최신 패치 기반의 구체적인 '승리 플랜'을 제공하는 것이 임무입니다.

      ${modeSpecificInstruction}

      [기본 공통 분석 규칙]
      1. 초반 라인전 상성 분석.
      2. 정글 개입 및 위험 요소 조언.
      3. 중후반 운영 및 오브젝트 전략.
      4. 내 라인(${myLine}) 집중 조언.

      [응답 형식]
      - 반드시 한국어로 답변하세요. (무조건 한국어로 답변할 것)
      - 마크다운 형식을 사용하여 가독성을 높이세요.
    `;

    const userPrompt = `
      내 라인: ${myLine}
      우리 팀: ${allies.join(", ")}
      상대 팀: ${enemies.join(", ")}
      분석 모드: ${analysisMode}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
      })
    });

    const result = await response.json();

    // 2. 응답 구조 방어: 단계별 체크 (0번 인덱스 에러 방지)
    let aiText = "AI 응답을 가져오지 못했습니다.";
    
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = result.candidates[0].content.parts[0].text;
    } else {
      // 4. 로그 추가: 상세 에러 내용 기록
      console.error("Gemini API Unexpected Response Structure:", JSON.stringify(result));
      
      if (result?.error) {
          aiText = `Gemini API 오류: ${result.error.message || "알 수 없는 오류"}`;
      }
    }

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    // 4. 로그 추가: 런타임 에러 기록
    console.error("Cloudflare Function Runtime Error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "분석 서버 오류: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
