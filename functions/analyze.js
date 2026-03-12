export async function onRequestPost(context) {
  const { request, env } = context;
  const GEMINI_API_KEY = env.GEMINI_API_KEY;

  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    // 1. 필수 데이터 검증
    if (!allies || !enemies || !myLine) {
      return new Response(JSON.stringify({ error: "필수 정보가 누락되었습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return new Response(JSON.stringify({ error: "API 키 설정이 필요합니다." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    // 2. 분석 모드별 프롬프트 구성
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

    const systemPrompt = `당신은 LoL 전문 분석가입니다. 다음 조건으로 분석하세요:
    - 분석 모드: ${modeInstruction}
    - 내 라인: ${myLine}
    - 반드시 한국어로 답변할 것 (Must answer in Korean)
    - 마크다운 형식 사용`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n최적의 승리 플랜을 알려줘.`;

    // 3. API 호출 규격 수정 (v1 및 gemini-1.5-flash 사용)
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const result = await response.json();

    // 4. 응답 구조 방어 및 에러 처리
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return new Response(JSON.stringify({ text: result.candidates[0].content.parts[0].text }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    } else {
      console.error("Gemini API Error Response:", JSON.stringify(result));
      const errorMessage = result?.error?.message || "AI 응답을 생성할 수 없습니다. 모델 설정이나 API 키를 확인해주세요.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

  } catch (error) {
    console.error("Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
