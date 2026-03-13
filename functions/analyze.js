export async function onRequestPost(context) {
    const { request, env } = context;
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    try {
      const body = await request.json();
      const name = body.name;
      const tag = body.tag;
  
      // 1. 라이엇 계정 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) return new Response(JSON.stringify({ error: "플레이어를 찾을 수 없습니다." }), { status: 200 });
      const account = await accRes.json();
  
      // 2. 실시간 게임 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200 });
      const game = await gameRes.json();
  
      // 3. 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const version = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      // 4. 참가자 데이터 정리 (닉네임 표시)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id], r: p.perks.perkSubStyle };
      });
  
      // 5. 실전 훈수 프롬프트 (템/룬 제외, 상성 및 타이밍 강조)
      const prompt = `LoL 전문가로서 분석해줘. 내 챔피언: ${myChamp}.
      블루팀: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(",")}.
      레드팀: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(",")}.
      명령: 템/룬 추천 절대 금지. 
      1. [요약]: 상대보다 약한 구간과 내가 강해지는 정확한 레벨/타이밍, 핵심 행동 3줄.
      2. [상세]: 라인전 상성(피할 놈, 노릴 놈), 정글 동선, 갱킹 성공률 높은 라인 등 실전 훈수를 '탑은 ~해라' 식으로 구체적으로 작성.`;
  
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiData = await aiRes.json();
      const strategy = aiData.candidates[0].content.parts[0].text;
  
      return new Response(JSON.stringify({ pList, strategy, version, myChamp }), {
        headers: { "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: "서버 내부 오류가 발생했습니다." }), { status: 200 });
    }
  }