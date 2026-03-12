export async function onRequestPost(context) {
  const { env } = context;
  const { allies, enemies, myRole } = await context.request.json();

  const prompt = `너는 최신 롤 메타와 상성을 완벽히 꿰고 있는 전문 코치다.
아군 챔피언: ${allies.join(', ')}
적군 챔피언: ${enemies.join(', ')}
내 라인: ${myRole}

위 조합을 분석하여 라인전 구도, 정글 동선 영향, 한타 위치 선정, 사이드 운영법을 포함한 구체적인 승리 플랜을 짜줘.
결과는 반드시 '초반', '중반', '후반' 세 파트로 나누어서 설명해줘.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const result = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '분석 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
