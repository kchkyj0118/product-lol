// analyze.js 내부의 프롬프트 생성 부분 수정
const langPrefix = body.lang === 'en' ? "Answer in English." : "한국어로 답변해줘.";

if (body.mode === 'sim') {
  const prompt = `Role: Challenger LoL Coach. ${langPrefix} TeamA:[${body.teams.Blue.map(p=>p.champ)}], TeamB:[${body.teams.Red.map(p=>p.champ)}]. Analyze synergy and win conditions strictly.`;
  // ... 생략 ...
} else {
  // ... 생략 ...
  const prompt = `Role: Challenger LoL Coach. ${langPrefix} My Team:[${teams.Blue.map(p=>p.cName)}], Enemy:[${teams.Red.map(p=>p.cName)}]. Provide a short tactical summary for the current match.`;
  // ... 생략 ...
}