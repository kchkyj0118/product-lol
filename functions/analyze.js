export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
    const { gameData } = await request.json();
    const RIOT_API_KEY = env.RIOT_API_KEY;
    const GEMINI_API_KEY = env.GEMINI_API_KEY;
  
    // 1. 포지션 정렬 로직 (탑, 정글, 미드, 원딜, 서폿 순서)
    const sortParticipants = (participants) => {
      const roles = { TOP: 1, JUNGLE: 2, MIDDLE: 3, BOTTOM: 4, UTILITY: 5 };
      return [...participants].sort((a, b) => {
        // Riot API의 teamPosition 또는 소환사 주문(강타) 등으로 계산
        return (roles[a.teamPosition] || 99) - (roles[b.teamPosition] || 99);
      });
    };
  
    const blueTeam = sortParticipants(gameData.participants.filter(p => p.teamId === 100));
    const redTeam = sortParticipants(gameData.participants.filter(p => p.teamId === 200));
  
    // 2. Gemini API에 보낼 프롬프트 생성
    const prompt = `리그오브레전드 게임 분석해줘. 
    블루팀: ${blueTeam.map(p => p.championName).join(', ')}
    레드팀: ${redTeam.map(p => p.championName).join(', ')}
    각 라인별 상성과 승리 전략을 요약해줘.`;
  
    try {
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiResponse.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ blueTeam, redTeam, strategy }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }