export async function onRequestPost(context) {
  const { request, env } = context;
  const h = { "Content-Type": "application/json; charset=utf-8" };
  
  try {
    const body = await request.json();
    const { type, name, tag, puuid, matchId } = body;

    // 1. 매치 리스트 가져오기
    if (type === 'GET_LIST') {
      if (!puuid) throw new Error("PUUID가 필요합니다.");
      const listRes = await fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10&api_key=${env.RIOT_API_KEY}`);
      const matchIds = await listRes.json();
      
      const summaryList = await Promise.all(matchIds.map(async (id) => {
        const detail = await fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
        const p = detail.info.participants.find(v => v.puuid === puuid);
        return { 
          id, 
          champion: p.championName, 
          win: p.win, 
          kills: p.kills, 
          deaths: p.deaths, 
          assists: p.assists,
          gameCreation: detail.info.gameCreation,
          gameMode: detail.info.gameMode
        };
      }));
      return new Response(JSON.stringify({ summaryList }), { status: 200, headers: h });
    }

    // 2. 상세 패배 원인 분석 (Deep Analysis)
    if (type === 'DEEP_ANALYZE') {
      if (!matchId || !puuid) throw new Error("매치 ID와 PUUID가 필요합니다.");
      
      const [matchData, timelineData] = await Promise.all([
        fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${env.RIOT_API_KEY}`).then(r => r.json()),
        fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline?api_key=${env.RIOT_API_KEY}`).then(r => r.json())
      ]);

      if (matchData.status || timelineData.status) {
        throw new Error(`Riot API Error: ${matchData.status?.message || timelineData.status?.message || "Unknown"}`);
      }

      const participant = matchData.info.participants.find(p => p.puuid === puuid);
      const championName = participant ? participant.championName : "Unknown";
      
      const stats = {
        kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
        damage: participant.totalDamageDealtToChampions,
        gold: participant.goldEarned,
        vision: participant.visionScore,
        killParticipation: ((participant.kills + participant.assists) / (matchData.info.teams.find(t => t.teamId === participant.teamId).objectives.champion.kills || 1) * 100).toFixed(1)
      };

      const frames = timelineData.info.frames;
      const criticalEvents = frames.flatMap(f => f.events).filter(e => 
        (e.type === 'CHAMPION_KILL' && (e.killerId === participant.participantId || e.victimId === participant.participantId)) ||
        (e.type === 'ELITE_MONSTER_KILL')
      );

      const prompt = `너는 리그 오브 레전드 최고 권위의 수석 데이터 분석관이다. 
인사말이나 서두는 생략하고 바로 결론부터 제시해라. 수치와 팩트 기반으로 분석해라.

분석 대상: ${championName} (${participant.win ? '승리' : '패배'})
데이터 요약: KDA ${stats.kda}, 가한 피해량 ${stats.damage}, 킬 관여율 ${stats.killParticipation}%
상세 사건 기록: ${JSON.stringify(criticalEvents.slice(0, 15))}

다음 3가지 섹션으로 보고서를 작성하라:
① 골드 변곡점 분석 (The Critical Moment)
② 스킬 교환 효율 (Skill Efficiency)
③ 승리 플랜 (Authority)

모든 문장은 냉철하고 전문가다운 톤을 유지하라.`;

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      }).then(r => r.json());

      if (aiResponse.error) {
        throw new Error(`AI API Error: ${aiResponse.error.message}`);
      }

      const analysis = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 분석 결과가 없습니다.";
      return new Response(JSON.stringify({ analysis }), { status: 200, headers: h });
    }

    // 3. 기존 실시간 게임 분석 (ACTIVE_GAME 또는 기본값)
    if (!name || !tag) throw new Error("유저 이름과 태그가 필요합니다.");

    const acc = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${env.RIOT_API_KEY}`).then(r => r.json());
    if (!acc.puuid) throw new Error("유저 정보를 찾을 수 없습니다.");

    const [game, v] = await Promise.all([
      fetch(`https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${acc.puuid}?api_key=${env.RIOT_API_KEY}`).then(r => r.json()),
      fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()).then(vs => vs[0])
    ]);

    if (!game.participants) {
      return new Response(JSON.stringify({ 
        error: "현재 게임 중이 아닙니다.", 
        puuid: acc.puuid,
        name: name 
      }), { status: 200, headers: h });
    }

    const cData = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`).then(r => r.json()).then(res => res.data);
    const idMap = {}; Object.values(cData).forEach(c => idMap[c.key] = c.id);

    let myC = "";
    const pList = game.participants.map(p => {
      const cn = idMap[p.championId] || "Unknown";
      if (p.puuid === acc.puuid) myC = cn;
      return { 
        nick: p.riotIdGameName || cn, 
        cName: cn, 
        team: p.teamId,
        s: [p.spell1Id, p.spell2Id],
        r: p.perks.perkStyle
      };
    });

    const teamDescription = pList.map(p => `${p.team === 100 ? '블루' : '레드'}: ${p.nick}(${p.cName})`).join(', ');

    const activePrompt = `너는 롤 1타 강사야. 반드시 한국어로 대답해. 인사말 없이 바로 결론만 말해.
    주인공: ${name} (${myC})
    대진표: ${teamDescription}

    [요약]
    - 실전 핵심 승리 전략 3줄 요약.

    [상세]
    - ${myC} 입장에서의 구체적인 상성 및 3레벨 타이밍 분석.
    - 가장 갱킹 성공 확률이 높은 라인 지목 및 그 이유.
    - 승리 플랜 및 교전 주의사항.`;

    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: activePrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.9 }
      })
    }).then(r => r.json());

    if (ai.error) {
      throw new Error(`AI API Error: ${ai.error.message}`);
    }

    const fullText = ai.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 분석 실패";
    
    let summary = fullText;
    let detail = "상세 분석을 가져오지 못했습니다.";

    if (fullText.includes("[상세]")) {
      const parts = fullText.split("[상세]");
      summary = parts[0].replace("[요약]", "").trim();
      detail = parts[1].trim();
    }
    
    return new Response(JSON.stringify({ pList, summary, detail, ver: v, myC, puuid: acc.puuid }), { status: 200, headers: h });

  } catch (e) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: h }); 
  }
}
