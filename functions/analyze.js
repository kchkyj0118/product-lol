export async function onRequestPost(context) {
  const RIOT_API_KEY = context.env.RIOT_API_KEY;
  const GEMINI_API_KEY = context.env.GEMINI_API_KEY; // 설정하신 Gemini 키 사용

  try {
    const body = await context.request.json();
    const { summonerName, tagLine } = body;

    // [Step 1] 라이엇 API로 인게임 데이터 획득 (생략 - 기존 로직 유지)
    // ... (중략: 유저 10명 데이터를 teams 객체에 담는 과정) ...

    // [Step 2] AI에게 보낼 전략 질문지 작성
    const prompt = `리그오브레전드 실시간 매치 분석:
    우리팀: ${JSON.stringify(teams.Blue)}
    상대팀: ${JSON.stringify(teams.Red)}
    이 데이터를 바탕으로 승리를 위한 핵심 필승 전략 3가지를 알려줘.`;

    // [Step 3] Gemini AI 호출 (전략 생성)
    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const aiData = await aiRes.json();
    const strategy = aiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ teams, strategy }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
}