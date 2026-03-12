async function startAnalysis() {
    const position = document.getElementById('user-position').value;
    const matchup = document.getElementById('matchup-input').value;
    const display = document.getElementById('result-display');

    if (!matchup) {
        alert("매치업을 입력해주세요!");
        return;
    }

    display.style.display = "block";
    display.innerText = "🌀 AI 코치가 게임 데이터를 정밀 분석 중입니다...";

    try {
        // 여기에 파이어베이스/제미나이 API 호출 로직 연결
        const response = await fetchAIResponse(position, matchup);
        
        // [핵심] 데이터 정제 로직 적용
        // 1. JSON 형태 { } 제거
        // 2. [ ] 리스트 형태 제거
        // 3. (123, 456) 같은 좌표값 제거
        const cleanText = response
            .replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '') 
            .replace(/\(\d+,\s*\d+\)/g, '')
            .replace(/["']/g, '') // 불필요한 따옴표 제거
            .trim();

        display.innerText = cleanText || "분석 결과가 비어 있습니다. 다시 시도해 주세요.";

    } catch (error) {
        display.innerText = "❌ 분석 중 오류가 발생했습니다. 터미널의 Firebase 연결 상태를 확인하세요.";
    }
}

// 실제 API 연동 시 이 부분을 수정 (지금은 테스트용 응답)
async function fetchAIResponse(pos, match) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`"${pos} ${match} 분석 리포트: 
            라인전에서는 상대의 주요 스킬이 빠진 타이밍을 노리세요. 
            현재 메타에서는 2코어 타이밍이 가장 강력합니다.
            { "status": "success", "coord": [150, 200] }"`); // 정제 전 예시 데이터
        }, 1500);
    });
}
