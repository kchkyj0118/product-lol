export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 3. 환경 변수 확인: context.env.GEMINI_API_KEY
  const apiKey = env.GEMINI_API_KEY;

  try {
    const data = await request.json();
    const { allies, enemies, myLine, analysisMode } = data;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키 설정이 필요합니다. Cloudflare 대시보드에서 GEMINI_API_KEY를 설정해주세요." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    if (!allies || !enemies || !myLine) {
      return new Response(JSON.stringify({ error: "팀 정보 또는 라인 정보가 누락되었습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    // 4. 한국어 강제 프롬프트 구성
    const systemPrompt = `[응답은 반드시 한국어로만 하세요] 당신은 LoL 전문 분석가입니다. 
    분석 모드: ${analysisMode === 'LANE' ? '1:1 라인전' : analysisMode === 'SKIRMISH' ? '2:2 교전' : '5:5 전체 승리 플랜'}
    내 라인: ${myLine}
    최신 패치 노트를 기반으로 전략을 제시하세요.`;

    const userPrompt = `우리팀: ${allies.join(",")}\n상대팀: ${enemies.join(",")}\n최적의 승리 플랜을 알려줘.`;

    // 1. API 주소 고정 (v1beta 및 gemini-1.5-flash)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    const result = await response.json();

    // 2. 응답 데이터 검증 (try-catch 내에서 안전하게 처리)
    let aiText = "AI가 분석을 완료하지 못했습니다.";
    
    // 단계별 구조 체크 (data?.candidates?.[0]?.content?.parts?.[0]?.text)
    if (result && 
        result.candidates && 
        result.candidates[0] && 
        result.candidates[0].content && 
        result.candidates[0].content.parts && 
        result.candidates[0].content.parts[0] && 
        result.candidates[0].content.parts[0].text) {
      
      aiText = result.candidates[0].content.parts[0].text;
    } else {
      console.error("Gemini API Unexpected Response Structure:", JSON.stringify(result));
      if (result.error) {
          aiText = `Gemini API 오류: ${result.error.message || "알 수 없는 오류가 발생했습니다."}`;
      }
    }

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });

  } catch (error) {
    console.error("Cloudflare Functions Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}
