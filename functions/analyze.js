// analyze.js 내의 processParticipants 함수를 이 코드로 '완전 교체' 하세요.

const processParticipants = (parts) => {
  const supportChamps = ['Thresh', 'Lulu', 'Yuumi', 'Janna', 'Leona', 'Nautilus', 'Karma', 'Sona', 'Nami', 'Soraka', 'Rell', 'Milio', 'Alistar', 'Braum', 'Pyke', 'Senna', 'Bard', 'Renata'];
  const topChamps = ['Darius', 'Garen', 'Fiora', 'Jax', 'Camille', 'Renekton', 'Aatrox', 'Malphite', 'Ornn', 'Sion', 'K'Sante', 'Gwen', 'Mordekaiser'];

  return parts.map(p => {
    const c = champMap[p.championId] || { id: "Unknown", name: "알 수 없음" };
    const sName = p.riotId ? p.riotId.split('#')[0] : (p.summonerName || "플레이어");
    
    // 포지션 추측 알고리즘 시작
    let posScore = 3; // 기본값: 미드

    // 1순위: 스펠 기반 (가장 정확함)
    if (p.spell1Id === 11 || p.spell2Id === 11) posScore = 2; // 강타 = 정글
    else if (p.spell1Id === 7 || p.spell2Id === 7) posScore = 4; // 회복 = 원딜
    else if (supportChamps.includes(c.id)) posScore = 5; // 서폿 챔피언 리스트 포함 시
    else if (p.spell1Id === 12 || p.spell2Id === 12) {
      // 텔포를 들었는데 탑 챔피언이면 탑, 아니면 미드로 유지
      posScore = topChamps.includes(c.id) ? 1 : 3;
    }
    else if (topChamps.includes(c.id)) posScore = 1; // 텔포 없어도 전형적인 탑 챔프면 탑

    return {
      summonerName: sName,
      champId: c.id,
      champKName: c.name,
      spell1: p.spell1Id,
      spell2: p.spell2Id,
      mainRuneIcon: runeMap[p.perks.perkIds[0]] || "",
      teamId: p.teamId,
      isMe: sName.includes(summonerName),
      posScore: posScore // 계산된 점수
    };
  }).sort((a, b) => a.posScore - b.posScore); // 1~5점 순서대로 배치
};