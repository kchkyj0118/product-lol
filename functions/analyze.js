export async function onRequestPost(context) {
  const RIOT_API_KEY = context.env.RIOT_API_KEY;
  const GEMINI_API_KEY = context.env.GEMINI_API_KEY;

  try {
    const body = await context.request.json();
    
    // 1. 라이엇 데이터 가져오기 (생략 - 기존 로직과 동일하게 작동)
    // ... 실제 배포본에는 제가 이전에 드린 fetch 로직이 들어가야 합니다 ...
    
    // 2. 가짜 데이터 대신 AI 전략 포함 응답
    const mockTeams = {
      Blue: [{name: body.summonerName, champId: 86}], // 테스트용 가렌
      Red: [{name: "상대", champId: 1}]
    };

    // Gemini API 호출하여 전략 가져오기
    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "롤 인게임 조합을 분석해서 이길 수 있는 전략 3문장으로 알려줘." }] }] })
    });
    const aiData = await aiRes.json();
    const strategy = aiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams: mockTeams, strategy }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
}