export async function onRequestPost(context) {
    const { request, env } = context;
    
    // 사진에서 확인한 환경 변수 이름을 정확히 사용합니다.
    const API_KEY = env.RIOT_API_KEY;
    const GEMINI_KEY = env.GEMINI_API_KEY;
  
    const headers = { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    };
  
    try {
      const body = await request.json();
      if (!body.name || !body.tag) {
        return new Response(JSON.stringify({ error: "닉네임과 태그를 모두 입력하세요." }), { status: 200, headers });
      }
  
      // 1. 플레이어 PUUID 조회
      const accRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(body.name)}/${encodeURIComponent(body.tag)}?api_key=${API_KEY}`);
      if (!accRes.ok) return new Response(JSON.stringify({ error: "존재하지 않는 플레이어입니다." }), { status: 200, headers });
      const account = await accRes.json();
  
      // 2. 현재 게임 정보 조회
      const gameRes = await fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${account.puuid}?api_key=${API_KEY}`);
      if (!gameRes.ok) return new Response(JSON.stringify({ error: "현재 게임 중이 아닙니다." }), { status: 200, headers });
      const game = await gameRes.json();
  
      // 3. 최신 버전 및 챔피언 데이터 매핑
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const ver = (await verRes.json())[0];
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`);
      const champData = (await champRes.json()).data;
      const idToName = {};
      for (const key in champData) { idToName[champData[key].key] = champData[key].id; }
  
      // 4. 참가자 리스트 (닉네임 확실히 추출)
      let myChamp = "";
      const pList = game.participants.map(p => {
        const cName = idToName[p.championId] || "Unknown";
        if (p.puuid === account.puuid) myChamp = cName;
        const nick = (p.riotIdGameName || cName) + (p.riotIdTagline ? ` #${p.riotIdTagline}` : "");
        return { nick, cName, team: p.teamId, s: [p.spell1Id, p.spell2Id] };
      });
  
      // 5. 실전 훈수 프롬프트
      const prompt = `LoL 전문가로서 현재 게임의 승리 전략을 짜줘. 내 챔피언: ${myChamp}.
      블루팀 조합: ${pList.filter(p=>p.team===100).map(p=>p.cName).join(", ")}
      레드팀 조합: ${pList.filter(p=>p.team===200).map(p=>p.cName).join(", ")}
      
      [명령]
      - 룬과 아이템 추천은 절대 하지 마.
      - [요약]: 강해지는 타이밍(레벨)과 당장 해야 할 행동 3줄.
      - [상세]: 라인전 상성(피할 적, 노릴 적)과 한타 포커싱을 '탑은 ~해라' 식으로 구체적으로 작성해