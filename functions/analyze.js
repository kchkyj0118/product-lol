export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { allies, enemies, myLine } = data;

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

    const systemPrompt = `
      당신은 세계 최고의 리그 오브 레전드(LoL) 전문 분석가이자 코치입니다. 
      최신 패치 노트, 챔피언 티어, 아이템 메타, 그리고 프로 경기 트렌드를 완벽하게 이해하고 있습니다.
      사용자에게 승리를 위한 구체적이고 실질적인 '승리 플랜'을 제공하는 것이 임무입니다.

      [분석 규칙]
      1. 초반 라인전(0~15분): 상성 분석 및 핵심 스킬 활용법, 와드 위치, 딜교환 타이밍 제안.
      2. 정글 개입: 아군 정글러의 동선 최적화 및 적 정글러의 위험 요소 경고.
      3. 중후반 운영(15분~): 오브젝트 관리(용, 바론), 사이드 운영 방식, 한타 포지셔닝 및 포커싱 대상.
      4. 내 라인(${myLine}) 집중 분석: 사용자의 라인 상황에 맞는 특별 조언.

      [응답 형식]
      - 반드시 한국어로 답변하세요.
      - 마크다운 형식을 사용하여 가독성을 높이세요.
      - 전문 용어를 사용하되 초보자도 이해할 수 있도록 명확하게 설명하세요.
      - 긍정적이고 자신감 넘치는 어조로 작성하세요.
    `;

    const userPrompt = `
      내 라인: ${myLine}
      우리 팀: ${allies.join(", ")}
      상대 팀: ${enemies.join(", ")}

      위 조합을 바탕으로 현재 패치 버전 기준의 최적의 승리 플랜을 짜줘.
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
