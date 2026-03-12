// Firebase Configuration (Empty placeholder - should be replaced with real config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const functions = firebase.functions();

// State
let selectedLane = null;

// DOM Elements
const laneButtons = document.querySelectorAll('.lane-btn');
const analyzeBtn = document.querySelector('#analyze-btn');
const loading = document.querySelector('#loading');
const resultArea = document.querySelector('#result-area');
const analysisContent = document.querySelector('#analysis-content');

// Lane Selection logic
laneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        laneButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLane = btn.dataset.lane;
    });
});

// Analyze button click handler
analyzeBtn.addEventListener('click', async () => {
    const allyInputs = document.querySelectorAll('#ally-inputs .champion-input');
    const enemyInputs = document.querySelectorAll('#enemy-inputs .champion-input');

    const allies = Array.from(allyInputs).map(input => input.value.trim()).filter(v => v !== "");
    const enemies = Array.from(enemyInputs).map(input => input.value.trim()).filter(v => v !== "");

    if (allies.length < 5 || enemies.length < 5) {
        alert("모든 챔피언(각 팀 5명)을 입력해주세요.");
        return;
    }

    if (!selectedLane) {
        alert("내 라인을 선택해주세요.");
        return;
    }

    // Show loading state
    resultArea.classList.remove('hidden');
    loading.classList.remove('hidden');
    analysisContent.innerHTML = "";
    analyzeBtn.disabled = true;

    try {
        const analyzeWinPlan = functions.httpsCallable('analyzeWinPlan');
        const result = await analyzeWinPlan({
            allies: allies,
            enemies: enemies,
            myLine: selectedLane
        });

        // Simple Markdown-like formatting (real projects should use a library like 'marked')
        const formattedText = result.data.text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        analysisContent.innerHTML = formattedText;
    } catch (error) {
        console.error("Analysis failed:", error);
        analysisContent.innerHTML = "분석 중 오류가 발생했습니다: " + error.message;
    } finally {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});
