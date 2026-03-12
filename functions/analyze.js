export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY;

  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키 설정이 필요합니다." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    let modeInstruction = "";
    switch (analysisMode) {
      case "LANE":
        modeInstruction = "[1:1 라인전 집중 분석] 상성, 룬/템트리, 라인 관리법 중심";
        break;
      case "SKIRMISH":
        modeInstruction = "[2:2 소규모 교전 분석] 정글러 시너지, 역갱, 초반 바위게 싸움 중심";
        break;
      case "FULL":
      default:
        modeInstruction = "[5:5 전체 승리 플랜] 팀 조합 밸런스, 오브젝트 운영, 한타 포지셔닝 중심";
        break;
    }

    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다. 
    분석 모드: ${modeInstruction}
    내 라인: ${myLine}
    최신 패치 노트를 기반으로 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n최적의 승리 플랜을 알려줘.`;

    // 1. API 주소 및 모델명 수정 (v1 정식 버전 & gemini-1.5-flash-latest 사용)
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const result = await response.json();

    // 2. 응답 데이터 검증 및 방어 코드 (0번 인덱스 에러 방지)
    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text) {
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      console.error("Gemini API Error Response:", JSON.stringify(result));
      const errorMessage = result?.error?.message || "AI가 분석을 완료하지 못했습니다. 응답 구조를 확인해주세요.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Cloudflare Functions Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
