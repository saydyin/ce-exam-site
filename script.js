// ======================
// CONFIGURATION
// ======================
const SECTIONS = {
    AMSTHEC: {
        name: "AMSTHEC",
        title: "Mathematics, Surveying & Transportation Engineering",
        total: 75,
        time: 5 * 60 * 60, // 5 hours in seconds
        topics: [
            "Algebra", "Trigonometry", "Geometry", "Calculus",
            "Differential Equations", "Probability", "Surveying",
            "Transportation Engineering", "Highway Design"
        ]
    },
    HPGE: {
        name: "HPGE",
        title: "Hydraulics & Geotechnical Engineering",
        total: 50,
        time: 4 * 60 * 60, // 4 hours in seconds
        topics: [
            "Fluid Mechanics", "Hydraulics", "Hydrology", "Geology",
            "Soil Mechanics", "Foundation Engineering", "Earthworks",
            "Retaining Structures", "Slope Stability"
        ]
    },
    PSAD: {
        name: "PSAD",
        title: "Structural Design & Construction",
        total: 75,
        time: 5 * 60 * 60, // 5 hours in seconds
        topics: [
            "Steel Design", "Concrete Design", "Wood Design",
            "Structural Analysis", "Construction Methods",
            "Construction Materials", "Project Management",
            "Building Codes", "Seismic Design"
        ]
    }
};
const SECTION_REQUIREMENTS = {
    AMSTHEC: { total: 75 },
    HPGE: { total: 50 },
    PSAD: { total: 75 }
};
const SECTION_WEIGHTS = {
    AMSTHEC: 0.35,
    HPGE: 0.30,
    PSAD: 0.35
};
const PRC_INSTRUCTIONS = [
    "Read each question carefully.",
    "Choose the best answer from the given choices.",
    "Shade the corresponding letter on your answer sheet.",
    "Avoid erasures. Make sure of your answer before shading.",
    "Do not use any electronic devices during the examination.",
    "You are not allowed to leave the room once the exam has started."
];
const MOTIVATIONAL_QUOTES = [
    "The secret of getting ahead is getting started.",
    "Believe you can and you're halfway there.",
    "It does not matter how slowly you go as long as you do not stop.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "The future belongs to those who believe in the beauty of their dreams."
];

// ======================
// STATE MANAGEMENT
// ======================
let appState = {
    view: 'loading',
    settings: JSON.parse(localStorage.getItem('examSettings')) || {
        theme: 'light',
        fontSize: 'medium',
        autoSave: true,
        navigationMode: 'scroll',
        showTimer: true,
        showProgress: true,
        randomizeQuestions: true,
        showDifficulty: true
    },
    answers: JSON.parse(localStorage.getItem('examAnswers')) || {},
    results: JSON.parse(localStorage.getItem('examResults')) || {},
    currentSection: null,
    timeLeft: 0,
    timerInterval: null,
    examQuestions: [],
    reviewingSection: null,
    fullQuestionBank: [],
    isPaused: false,
    firstWrongIndex: null,
    flaggedQuestions: JSON.parse(localStorage.getItem('examFlagged')) || {},
    questionNotes: JSON.parse(localStorage.getItem('examNotes')) || {},
    questionTimes: JSON.parse(localStorage.getItem('examTimes')) || {},
    questionDifficulty: JSON.parse(localStorage.getItem('examDifficulty')) || {},
    performanceData: JSON.parse(localStorage.getItem('performanceData')) || {},
    customExam: JSON.parse(localStorage.getItem('customExam')) || {
        sections: ['AMSTHEC', 'HPGE', 'PSAD'],
        randomize: true,
        difficulty: 'all',
        questionCount: 100,
        timeLimit: 4 * 60 * 60
    },
    autoSaveEnabled: true,
    currentStepIndex: 0
};

// ======================
// ENHANCED QUESTION GROUPING LOGIC
// ======================

async function loadQuestionBank() {
    try {
        const response = await fetch('question_bank.json');
        if (!response.ok) {
            throw new Error(`Failed to load question bank: ${response.status}`);
        }
        const questionBank = await response.json();
        console.log(`Loaded ${questionBank.length} questions from question bank`);
        
        // Convert difficulty numbers to strings and add missing fields
        questionBank.forEach(q => {
            // Convert difficulty number to string
            if (q.difficulty === 1) q.difficulty = 'easy';
            else if (q.difficulty === 2) q.difficulty = 'medium';
            else if (q.difficulty === 3) q.difficulty = 'hard';
            else q.difficulty = 'medium'; // default
            
            // Add missing id if not present
            if (!q.id) {
                q.id = `${q.section}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Add explanation if missing
            if (!q.explanation) {
                q.explanation = "Refer to the solution for detailed explanation.";
            }
            
            // Add topic if missing (extract from stem or use section)
            if (!q.topic) {
                // Try to extract topic from stem or use section
                const stemLower = q.stem.toLowerCase();
                if (stemLower.includes('calculus') || stemLower.includes('derivative')) q.topic = 'Calculus';
                else if (stemLower.includes('algebra')) q.topic = 'Algebra';
                else if (stemLower.includes('trigonometry') || stemLower.includes('angle')) q.topic = 'Trigonometry';
                else if (stemLower.includes('geometry')) q.topic = 'Geometry';
                else if (stemLower.includes('probability')) q.topic = 'Probability';
                else if (stemLower.includes('surveying')) q.topic = 'Surveying';
                else if (stemLower.includes('fluid') || stemLower.includes('hydraulics')) q.topic = 'Fluid Mechanics';
                else if (stemLower.includes('soil') || stemLower.includes('geotechnical')) q.topic = 'Soil Mechanics';
                else if (stemLower.includes('concrete') || stemLower.includes('steel')) q.topic = 'Structural Design';
                else q.topic = q.section; // Fallback to section name
            }
        });
        
        appState.fullQuestionBank = questionBank;
        
        // Log question counts for debugging
        console.log("=== QUESTION BANK STATISTICS ===");
        Object.keys(SECTIONS).forEach(sectionName => {
            const sectionQuestions = appState.fullQuestionBank.filter(q => q.section === sectionName);
            console.log(`${sectionName}: ${sectionQuestions.length} questions available`);
            
            // Log group information
            const groups = {};
            sectionQuestions.forEach(q => {
                const groupId = q.group_id || 'standalone';
                if (!groups[groupId]) groups[groupId] = 0;
                groups[groupId]++;
            });
            
            console.log(`${sectionName} groups:`, groups);
        });
        
        return questionBank;
    } catch (error) {
        console.error('Error loading question bank:', error);
        appState.fullQuestionBank = getFallbackQuestions();
        return appState.fullQuestionBank;
    }
}

function getQuestionsForSection(sectionName) {
    if (!appState.fullQuestionBank || appState.fullQuestionBank.length === 0) {
        console.warn('Question bank not loaded, using fallback questions');
        return getSampleQuestions(sectionName);
    }
    
    // Get questions for this section
    let sectionQuestions = appState.fullQuestionBank.filter(q => q.section === sectionName);
    
    // Apply difficulty filter if in custom exam mode
    if (appState.view === 'custom-exam' && appState.customExam.difficulty !== 'all') {
        sectionQuestions = sectionQuestions.filter(q => q.difficulty === appState.customExam.difficulty);
    }
    
    // Process questions with enhanced grouping logic
    const processedQuestions = processQuestionsWithEnhancedGrouping(sectionQuestions, sectionName);
    
    // Apply custom exam question count if applicable, otherwise use section requirement
    const requiredTotal = (appState.view === 'custom-exam') 
        ? Math.min(processedQuestions.length, appState.customExam.questionCount) 
        : SECTION_REQUIREMENTS[sectionName].total;
    
    // Ensure we don't exceed available questions
    const finalQuestions = processedQuestions.slice(0, requiredTotal);
    
    console.log(`${sectionName}: Using ${finalQuestions.length} questions (requested: ${requiredTotal}, available: ${sectionQuestions.length})`);
    console.log(`${sectionName} final group distribution:`, getGroupDistribution(finalQuestions));
    
    return finalQuestions;
}

// Enhanced grouping logic that prevents situation questions in the last positions
function processQuestionsWithEnhancedGrouping(questions, sectionName) {
    // Group questions by group_id
    const groups = {};
    const standaloneQuestions = [];
    
    questions.forEach((question, index) => {
        const groupId = question.group_id || null;
        
        if (groupId) {
            if (!groups[groupId]) {
                groups[groupId] = [];
            }
            groups[groupId].push({...question, originalIndex: index});
        } else {
            standaloneQuestions.push({...question, originalIndex: index});
        }
    });
    
    console.log(`Grouping for ${sectionName}:`, {
        totalGroups: Object.keys(groups).length,
        groupSizes: Object.values(groups).map(g => g.length),
        standaloneQuestions: standaloneQuestions.length
    });
    
    // Process each group to ensure situation question is first
    Object.values(groups).forEach(group => {
        // Sort group to ensure situation question is first
        group.sort((a, b) => {
            const aIsSituation = a.stem.trim().toLowerCase().startsWith('situation');
            const bIsSituation = b.stem.trim().toLowerCase().startsWith('situation');
            
            if (aIsSituation && !bIsSituation) return -1;
            if (!aIsSituation && bIsSituation) return 1;
            return 0;
        });
        
        // Add "Situation:" prefix if missing from the first question
        const firstQuestion = group[0];
        if (!firstQuestion.stem.trim().toLowerCase().startsWith('situation')) {
            const firstSentence = firstQuestion.stem.split(/[.!?]/)[0]?.trim() || 'Problem';
            firstQuestion.stem = `Situation: ${firstSentence}. ${firstQuestion.stem}`;
        }
    });
    
    // Get total number of questions for this section
    const totalQuestions = SECTION_REQUIREMENTS[sectionName]?.total || questions.length;
    
    // Separate groups by size for strategic placement
    const smallGroups = []; // 1-2 questions
    const mediumGroups = []; // 3 questions  
    const largeGroups = []; // 4+ questions
    
    Object.values(groups).forEach(group => {
        if (group.length >= 4) {
            largeGroups.push(group);
        } else if (group.length === 3) {
            mediumGroups.push(group);
        } else {
            smallGroups.push(group);
        }
    });
    
    // Apply randomization if enabled
    const shouldRandomize = appState.settings.randomizeQuestions || 
        (appState.view === 'custom-exam' && appState.customExam.randomize);
    
    if (shouldRandomize) {
        shuffleArray(smallGroups);
        shuffleArray(mediumGroups);
        shuffleArray(largeGroups);
        shuffleArray(standaloneQuestions);
    }
    
    // Build the final question list with strategic placement
    let finalQuestions = [];
    
    // Phase 1: Place large groups first (they need most space)
    largeGroups.forEach(group => {
        finalQuestions = finalQuestions.concat(group);
    });
    
    // Phase 2: Place medium groups
    mediumGroups.forEach(group => {
        finalQuestions = finalQuestions.concat(group);
    });
    
    // Phase 3: Place small groups
    smallGroups.forEach(group => {
        finalQuestions = finalQuestions.concat(group);
    });
    
    // Phase 4: Place standalone questions
    finalQuestions = finalQuestions.concat(standaloneQuestions);
    
    // Ensure no situation questions are in the last few positions
    finalQuestions = preventSituationInLastPositions(finalQuestions, totalQuestions);
    
    console.log(`Final question distribution for ${sectionName}:`, getGroupDistribution(finalQuestions));
    
    return finalQuestions;
}

function preventSituationInLastPositions(questions, totalQuestions) {
    const situationQuestions = [];
    const nonSituationQuestions = [];
    
    // Separate situation and non-situation questions
    questions.forEach(q => {
        if (q.stem.trim().toLowerCase().startsWith('situation')) {
            situationQuestions.push(q);
        } else {
            nonSituationQuestions.push(q);
        }
    });
    
    console.log(`Situation questions: ${situationQuestions.length}, Non-situation: ${nonSituationQuestions.length}`);
    
    // Calculate safe positions (avoid last 2-3 questions depending on group size)
    let safeZoneSize;
    if (totalQuestions <= 50) {
        // For HPGE (50 questions): avoid last 2 questions
        safeZoneSize = 2;
    } else {
        // For AMSTHEC and PSAD (75 questions): avoid last 2-3 questions
        // For groups of 4+, avoid last 3 questions
        const hasLargeGroups = questions.some(q => {
            const groupSize = questions.filter(q2 => q2.group_id === q.group_id).length;
            return groupSize >= 4;
        });
        safeZoneSize = hasLargeGroups ? 3 : 2;
    }
    
    const safeZoneStart = totalQuestions - safeZoneSize;
    
    console.log(`Safe zone: last ${safeZoneSize} questions (positions ${safeZoneStart + 1}-${totalQuestions})`);
    
    // Check if any situation questions are in the unsafe zone
    const unsafeSituationQuestions = [];
    const safeSituationQuestions = [];
    
    // We need to simulate the final positions
    let currentPosition = 0;
    const finalOrder = [];
    
    // First pass: place all questions and identify unsafe ones
    questions.forEach(q => {
        if (currentPosition >= safeZoneStart && q.stem.trim().toLowerCase().startsWith('situation')) {
            unsafeSituationQuestions.push({question: q, position: currentPosition});
        } else {
            finalOrder.push(q);
        }
        currentPosition++;
    });
    
    // If there are unsafe situation questions, we need to rearrange
    if (unsafeSituationQuestions.length > 0) {
        console.log(`Found ${unsafeSituationQuestions.length} situation questions in unsafe positions`);
        
        // Move unsafe situation questions to safe positions
        unsafeSituationQuestions.forEach(unsafe => {
            // Find a safe position to swap with (preferably early in the exam)
            let swapIndex = -1;
            for (let i = 0; i < safeZoneStart; i++) {
                const candidate = finalOrder[i];
                if (candidate && !candidate.stem.trim().toLowerCase().startsWith('situation')) {
                    // Ensure we're not breaking a group
                    const candidateGroupId = candidate.group_id;
                    if (!candidateGroupId || 
                        (candidateGroupId && finalOrder.filter(q => q.group_id === candidateGroupId).length === 1)) {
                        swapIndex = i;
                        break;
                    }
                }
            }
            
            if (swapIndex !== -1) {
                // Perform the swap
                const temp = finalOrder[swapIndex];
                finalOrder[swapIndex] = unsafe.question;
                // Add the swapped question to the end
                finalOrder.push(temp);
                console.log(`Moved situation question from position ${unsafe.position + 1} to position ${swapIndex + 1}`);
            } else {
                // If no safe swap found, just add to the end (this shouldn't happen often)
                finalOrder.push(unsafe.question);
                console.warn(`Could not find safe position for situation question, placed at end`);
            }
        });
        
        return finalOrder;
    }
    
    return questions;
}

function getGroupDistribution(questions) {
    const distribution = {};
    questions.forEach(q => {
        const groupId = q.group_id || 'standalone';
        if (!distribution[groupId]) {
            distribution[groupId] = 0;
        }
        distribution[groupId]++;
    });
    return distribution;
}

// Helper function: Fisher-Yates shuffle
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ======================
// UTILITY FUNCTIONS
// ======================
function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function saveState() {
    localStorage.setItem('examAnswers', JSON.stringify(appState.answers));
    localStorage.setItem('examResults', JSON.stringify(appState.results));
    localStorage.setItem('examSettings', JSON.stringify(appState.settings));
    localStorage.setItem('examFlagged', JSON.stringify(appState.flaggedQuestions));
    localStorage.setItem('examNotes', JSON.stringify(appState.questionNotes));
    localStorage.setItem('examTimes', JSON.stringify(appState.questionTimes));
    localStorage.setItem('examDifficulty', JSON.stringify(appState.questionDifficulty));
    localStorage.setItem('performanceData', JSON.stringify(appState.performanceData));
    localStorage.setItem('customExam', JSON.stringify(appState.customExam));
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) {
        screen.classList.remove('hidden');
        appState.view = screenId;
        if (screenId === 'main-menu') {
            renderMainMenu();
        } else if (screenId === 'instructions') {
            renderInstructions();
        } else if (screenId === 'exam') {
            renderExam();
        } else if (screenId === 'settings') {
            renderSettingsScreen();
        } else if (screenId === 'results') {
            // Auto-scroll to top when showing results
            window.scrollTo(0, 0);
            renderResultsScreen();
        } else if (screenId === 'review') {
            // Handled by showReviewScreen()
        } else if (screenId === 'custom-exam') {
            renderCustomExamBuilder();
        }
    }
}

// ======================
// TIMER & QUESTION LOADING
// ======================
function loadQuestionsForSection(sectionName) {
    const savedKey = `examQuestions_${sectionName}`;
    const savedQuestions = localStorage.getItem(savedKey);
    let sectionQuestions;
    if (savedQuestions) {
        sectionQuestions = JSON.parse(savedQuestions);
    } else {
        sectionQuestions = getQuestionsForSection(sectionName);
        localStorage.setItem(savedKey, JSON.stringify(sectionQuestions));
    }
    appState.examQuestions = sectionQuestions;
    appState.currentStepIndex = 0;
    
    if (!appState.answers[sectionName]) {
        appState.answers[sectionName] = new Array(sectionQuestions.length).fill(null);
    }
    if (!appState.isPaused) {
        appState.timeLeft = SECTIONS[sectionName]?.time || appState.customExam.timeLimit;
    } else {
        // Restore previous time if paused
        const savedTime = localStorage.getItem(`examTime_${sectionName}`);
        if (savedTime) {
            appState.timeLeft = parseInt(savedTime);
        }
    }
    // Initialize question times
    if (!appState.questionTimes[sectionName]) {
        appState.questionTimes[sectionName] = new Array(sectionQuestions.length).fill(0);
    }
    // Initialize flagged questions
    if (!appState.flaggedQuestions[sectionName]) {
        appState.flaggedQuestions[sectionName] = new Array(sectionQuestions.length).fill(false);
    }
    // Initialize notes
    if (!appState.questionNotes[sectionName]) {
        appState.questionNotes[sectionName] = new Array(sectionQuestions.length).fill('');
    }
    // Initialize difficulty ratings
    if (!appState.questionDifficulty[sectionName]) {
        appState.questionDifficulty[sectionName] = new Array(sectionQuestions.length).fill('medium');
    }
    // Initialize performance data
    if (!appState.performanceData[sectionName]) {
        appState.performanceData[sectionName] = {
            difficultyDistribution: {
                easy: 0,
                medium: 0,
                hard: 0
            },
            topicPerformance: {},
            answerPatterns: {
                commonMistakes: []
            }
        };
    }
    if (document.getElementById('exam-timer')) {
        document.getElementById('exam-timer').textContent = formatTime(appState.timeLeft);
    }
    if (!appState.isPaused) {
        startTimer();
    }
}

function startTimer() {
    clearInterval(appState.timerInterval);
    if (appState.isPaused) return;
    let lastQuestionTime = Date.now();
    appState.timerInterval = setInterval(() => {
        appState.timeLeft--;
        if (document.getElementById('exam-timer')) {
            document.getElementById('exam-timer').textContent = formatTime(appState.timeLeft);
        }
        if (appState.timeLeft <= 0) {
            clearInterval(appState.timerInterval);
            submitExam();
        }
        // Track time spent on current question
        const currentQuestionIndex = getCurrentQuestionIndex();
        if (currentQuestionIndex !== -1) {
            const now = Date.now();
            const timeSpent = Math.floor((now - lastQuestionTime) / 1000);
            lastQuestionTime = now;
            if (!appState.questionTimes[appState.currentSection]) {
                appState.questionTimes[appState.currentSection] = new Array(appState.examQuestions.length).fill(0);
            }
            appState.questionTimes[appState.currentSection][currentQuestionIndex] += timeSpent;
            saveState();
        }
    }, 1000);
}

function getCurrentQuestionIndex() {
    if (appState.settings.navigationMode === 'step') {
        return appState.currentStepIndex;
    } else {
        const questionCards = document.querySelectorAll('.question-card');
        if (questionCards.length > 0) {
            const firstVisible = Array.from(questionCards).find(card => {
                const rect = card.getBoundingClientRect();
                return rect.top >= 0 && rect.top <= window.innerHeight;
            });
            if (firstVisible) {
                return parseInt(firstVisible.id.split('-')[1]);
            }
        }
    }
    return -1;
}

function pauseTimer() {
    clearInterval(appState.timerInterval);
    appState.isPaused = true;
    saveState();
    // Save remaining time for this section
    if (appState.currentSection) {
        localStorage.setItem(`examTime_${appState.currentSection}`, appState.timeLeft.toString());
    }
}

// ======================
// RESET
// ======================
function resetExam() {
    if (!confirm('Are you sure you want to reset all exam data? This cannot be undone.')) return;
    clearInterval(appState.timerInterval);
    appState.answers = {};
    appState.results = {};
    appState.timeLeft = 0;
    appState.currentSection = null;
    appState.isPaused = false;
    appState.firstWrongIndex = null;
    appState.flaggedQuestions = {};
    appState.questionNotes = {};
    appState.questionTimes = {};
    appState.questionDifficulty = {};
    appState.performanceData = {};
    appState.customExam = {
        sections: ['AMSTHEC', 'HPGE', 'PSAD'],
        randomize: true,
        difficulty: 'all',
        questionCount: 100,
        timeLimit: 4 * 60 * 60
    };
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examResults');
    localStorage.removeItem('examSettings');
    localStorage.removeItem('examFlagged');
    localStorage.removeItem('examNotes');
    localStorage.removeItem('examTimes');
    localStorage.removeItem('examDifficulty');
    localStorage.removeItem('performanceData');
    localStorage.removeItem('customExam');
    Object.keys(SECTIONS).forEach(sectionName => {
        localStorage.removeItem(`examQuestions_${sectionName}`);
        localStorage.removeItem(`examTime_${sectionName}`);
    });
    showScreen('main-menu');
}

// ======================
// CUSTOM EXAM BUILDER
// ======================
function renderCustomExamBuilder() {
    const container = document.querySelector('#screen-custom-exam .container');
    container.innerHTML = `
        <div class="card">
            <h1 class="section-title">🎯 Create Custom Exam</h1>
            
            <!-- Quick Presets -->
            <div class="mb-6">
                <h2 class="text-lg font-bold mb-3">Quick Presets</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <button type="button" class="btn btn-secondary preset-btn" data-questions="50" data-time="3">
                        🎯 Mini Exam (50Q, 3H)
                    </button>
                    <button type="button" class="btn btn-secondary preset-btn" data-questions="100" data-time="4">
                        📝 Standard (100Q, 4H)
                    </button>
                    <button type="button" class="btn btn-secondary preset-btn" data-questions="150" data-time="5">
                        ⏱️ Full Length (150Q, 5H)
                    </button>
                </div>
            </div>

            <!-- Section Selection -->
            <div class="mb-6">
                <h2 class="text-lg font-bold mb-3">Sections to Include</h2>
                <div class="section-card grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors section-option">
                        <input type="checkbox" id="amsthec-include" class="mr-3 transform scale-125" checked>
                        <div>
                            <div class="font-semibold">📚 AMSTHEC</div>
                            <div class="text-sm text-gray-600">75 questions available</div>
                        </div>
                    </label>
                    <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors section-option">
                        <input type="checkbox" id="hpge-include" class="mr-3 transform scale-125" checked>
                        <div>
                            <div class="font-semibold">📐 HPGE</div>
                            <div class="text-sm text-gray-600">50 questions available</div>
                        </div>
                    </label>
                    <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors section-option">
                        <input type="checkbox" id="psad-include" class="mr-3 transform scale-125" checked>
                        <div>
                            <div class="font-semibold">🧱 PSAD</div>
                            <div class="text-sm text-gray-600">75 questions available</div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Exam Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Question Count -->
                <div>
                    <h2 class="text-lg font-bold mb-3">Number of Questions</h2>
                    <div class="section-card">
                        <input type="range" id="question-count" min="10" max="200" value="${appState.customExam.questionCount}" class="w-full mb-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Questions:</span>
                            <span id="question-count-value" class="font-bold text-lg">${appState.customExam.questionCount}</span>
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10</span>
                            <span>200</span>
                        </div>
                    </div>
                </div>

                <!-- Time Limit -->
                <div>
                    <h2 class="text-lg font-bold mb-3">Time Limit</h2>
                    <div class="section-card">
                        <input type="range" id="time-limit" min="1" max="10" value="${Math.floor(appState.customExam.timeLimit / 3600)}" class="w-full mb-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Hours:</span>
                            <span id="time-limit-value" class="font-bold text-lg">${Math.floor(appState.customExam.timeLimit / 3600)} hours</span>
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1H</span>
                            <span>10H</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Exam Options -->
            <div class="mb-6">
                <h2 class="text-lg font-bold mb-3">Exam Options</h2>
                <div class="section-card space-y-3">
                    <label class="flex items-center justify-between p-2">
                        <span>Randomize Question Order</span>
                        <input type="checkbox" id="randomize-questions" class="transform scale-125" ${appState.customExam.randomize ? 'checked' : ''}>
                    </label>
                    <label class="flex items-center justify-between p-2">
                        <span>Show Timer During Exam</span>
                        <input type="checkbox" id="include-timer" class="transform scale-125" checked>
                    </label>
                    <div class="flex items-center justify-between p-2">
                        <span>Difficulty Level</span>
                        <select id="difficulty-filter" class="btn btn-secondary btn-sm">
                            <option value="all" ${appState.customExam.difficulty === 'all' ? 'selected' : ''}>All Levels</option>
                            <option value="easy" ${appState.customExam.difficulty === 'easy' ? 'selected' : ''}>Easy Only</option>
                            <option value="medium" ${appState.customExam.difficulty === 'medium' ? 'selected' : ''}>Medium Only</option>
                            <option value="hard" ${appState.customExam.difficulty === 'hard' ? 'selected' : ''}>Hard Only</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Summary & Create -->
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <h3 class="font-bold mb-2">Exam Summary</h3>
                <div id="exam-summary" class="text-sm">
                    <!-- Dynamically updated -->
                </div>
            </div>

            <div class="action-buttons flex flex-col sm:flex-row gap-3">
                <button type="button" id="btn-custom-exam-back" class="btn btn-secondary flex-1">← Back to Main Menu</button>
                <button type="button" id="btn-create-custom-exam" class="btn btn-primary flex-1">🚀 Create Custom Exam</button>
            </div>
        </div>
    `;

    // Initialize values
    updateCustomExamSummary();
    
    // Event listeners for sliders
    document.getElementById('question-count').oninput = function() {
        document.getElementById('question-count-value').textContent = this.value;
        updateCustomExamSummary();
    };
    
    document.getElementById('time-limit').oninput = function() {
        const hours = parseInt(this.value);
        document.getElementById('time-limit-value').textContent = `${hours} hour${hours > 1 ? 's' : ''}`;
        updateCustomExamSummary();
    };

    // Section checkboxes
    document.querySelectorAll('.section-option input[type="checkbox"]').forEach(checkbox => {
        checkbox.onchange = updateCustomExamSummary;
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.onclick = function() {
            const questions = this.dataset.questions;
            const time = this.dataset.time;
            
            document.getElementById('question-count').value = questions;
            document.getElementById('question-count-value').textContent = questions;
            document.getElementById('time-limit').value = time;
            document.getElementById('time-limit-value').textContent = `${time} hour${time > 1 ? 's' : ''}`;
            
            updateCustomExamSummary();
        };
    });

    // Other controls
    document.getElementById('difficulty-filter').onchange = updateCustomExamSummary;
    document.getElementById('randomize-questions').onchange = updateCustomExamSummary;

    // Button actions
    document.getElementById('btn-custom-exam-back').onclick = () => showScreen('main-menu');
    document.getElementById('btn-create-custom-exam').onclick = createCustomExam;
}

function updateCustomExamSummary() {
    const sections = [];
    if (document.getElementById('amsthec-include').checked) sections.push('AMSTHEC');
    if (document.getElementById('hpge-include').checked) sections.push('HPGE');
    if (document.getElementById('psad-include').checked) sections.push('PSAD');
    
    const questionCount = parseInt(document.getElementById('question-count').value);
    const timeLimit = parseInt(document.getElementById('time-limit').value);
    const difficulty = document.getElementById('difficulty-filter').value;
    const randomize = document.getElementById('randomize-questions').checked;
    
    let summary = '';
    
    if (sections.length === 0) {
        summary = '<div class="text-red-600">Please select at least one section</div>';
    } else {
        summary = `
            <div class="grid grid-cols-2 gap-2">
                <div><strong>Sections:</strong></div>
                <div>${sections.join(', ')}</div>
                
                <div><strong>Questions:</strong></div>
                <div>${questionCount} total</div>
                
                <div><strong>Time:</strong></div>
                <div>${timeLimit} hour${timeLimit > 1 ? 's' : ''}</div>
                
                <div><strong>Difficulty:</strong></div>
                <div>${difficulty === 'all' ? 'All levels' : difficulty}</div>
                
                <div><strong>Order:</strong></div>
                <div>${randomize ? 'Randomized' : 'Sequential'}</div>
            </div>
        `;
    }
    
    document.getElementById('exam-summary').innerHTML = summary;
}

function createCustomExam() {
    const sections = [];
    if (document.getElementById('amsthec-include').checked) sections.push('AMSTHEC');
    if (document.getElementById('hpge-include').checked) sections.push('HPGE');
    if (document.getElementById('psad-include').checked) sections.push('PSAD');
    
    if (sections.length === 0) {
        alert('Please select at least one section for your custom exam.');
        return;
    }

    // Update appState with current settings
    appState.customExam.sections = sections;
    appState.customExam.questionCount = parseInt(document.getElementById('question-count').value);
    appState.customExam.timeLimit = parseInt(document.getElementById('time-limit').value) * 3600;
    appState.customExam.difficulty = document.getElementById('difficulty-filter').value;
    appState.customExam.randomize = document.getElementById('randomize-questions').checked;

    // Create a combined exam from selected sections
    let allQuestions = [];
    let totalQuestions = 0;
    appState.customExam.sections.forEach(sectionName => {
        const sectionQuestions = getQuestionsForSection(sectionName);
        allQuestions = allQuestions.concat(sectionQuestions.map(q => ({...q, section: sectionName})));
        totalQuestions += sectionQuestions.length;
    });
    
    // Apply custom exam question count
    allQuestions = allQuestions.slice(0, appState.customExam.questionCount);
    
    // Set up exam state
    appState.currentSection = 'CUSTOM';
    appState.examQuestions = allQuestions;
    appState.timeLeft = appState.customExam.timeLimit;
    
    // Initialize answer tracking
    appState.answers.CUSTOM = new Array(allQuestions.length).fill(null);
    appState.flaggedQuestions.CUSTOM = new Array(allQuestions.length).fill(false);
    appState.questionNotes.CUSTOM = new Array(allQuestions.length).fill('');
    appState.questionTimes.CUSTOM = new Array(allQuestions.length).fill(0);
    
    // Start the exam
    saveState();
    showScreen('exam');
    startTimer();
}

// ======================
// MAIN MENU
// ======================
function renderMainMenu() {
    const completedCount = Object.keys(appState.results).length;
    document.getElementById('progress-text').textContent = `${completedCount}/3 sections completed`;
    const grid = document.getElementById('section-grid');
    grid.innerHTML = '';
    Object.values(SECTIONS).forEach((section, idx) => {
        const isCompleted = appState.results[section.name] !== undefined;
        const isPaused = appState.isPaused && appState.currentSection === section.name;
        const score = isCompleted ? appState.results[section.name].score_pct : null;
        const card = document.createElement('div');
        card.className = 'section-card';
        // Determine button text and class
        let buttonText = '';
        let buttonClass = '';
        let timerDisplay = '';
        if (isCompleted) {
            buttonText = 'Review Section';
            buttonClass = 'btn-secondary';
        } else if (isPaused) {
            buttonText = 'Continue Section';
            buttonClass = 'btn-primary';
            const timeDisplay = formatTime(appState.timeLeft);
            timerDisplay = `<p class="paused-timer" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted-light)">⏳ Time left: ${timeDisplay}</p>`;
        } else {
            buttonText = 'Start Section';
            buttonClass = 'btn-primary';
        }
        card.innerHTML = `
            <div class="section-card-header">
                <h2 class="section-card-title">
                    <span>${['📚','📐️','🧱'][idx % 3]}</span>
                    ${section.name}
                </h2>
                ${isCompleted ? `<span class="section-card-score">${score.toFixed(1)}%</span>` : ''}
            </div>
            <p class="section-card-description">${section.title}</p>
            ${timerDisplay}
            <button type="button" class="btn ${buttonClass} btn-full" data-action="${isCompleted ? 'review' : (isPaused ? 'continue' : 'start')}" data-section="${section.name}">
                ${buttonText}
            </button>
            ${isCompleted ? `
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${score}%"></div>
                </div>
            ` : ''}
        `;
        grid.appendChild(card);
    });
    // Add event listeners
    document.querySelectorAll('[data-action="start"], [data-action="continue"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionName = e.target.dataset.section;
            appState.currentSection = sectionName;
            showScreen('instructions');
        });
    });
    document.querySelectorAll('[data-action="review"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionName = e.target.dataset.section;
            showReviewScreen(sectionName);
        });
    });
    // Set up other buttons
    document.getElementById('btn-custom-exam').addEventListener('click', () => showScreen('custom-exam'));
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btn-download-pdf').addEventListener('click', generateOfflinePDF);
    document.getElementById('btn-reset').addEventListener('click', resetExam);
}

// ======================
// INSTRUCTIONS SCREEN
// ======================
function renderInstructions() {
    const section = SECTIONS[appState.currentSection] || { title: 'Custom Exam', total: appState.customExam.questionCount, time: appState.customExam.timeLimit };
    document.getElementById('instruction-section-title').textContent = section.title;
    const instrList = document.getElementById('prc-instructions');
    instrList.innerHTML = '';
    [...PRC_INSTRUCTIONS,
        `This section has <strong>${section.total} questions</strong>.`,
        `You have <strong>${section.time / 3600} hours</strong> to complete this section.`
    ].forEach(instr => {
        const li = document.createElement('li');
        li.innerHTML = instr;
        instrList.appendChild(li);
    });
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    document.getElementById('motivational-quote').textContent = `"${quote}"`;
    // Set up button actions
    document.getElementById('btn-instructions-back').onclick = () => showScreen('main-menu');
    document.getElementById('btn-start-exam').onclick = () => {
        if (!appState.isPaused) {
            loadQuestionsForSection(appState.currentSection);
        }
        appState.isPaused = false;
        showScreen('exam');
        startTimer();
    };
}

// ======================
// EXAM SCREEN
// ======================
function renderExam() {
    const section = appState.currentSection === 'CUSTOM' 
        ? { title: 'Custom Exam' } 
        : SECTIONS[appState.currentSection];
    const totalQuestions = appState.examQuestions.length;
    document.getElementById('exam-section-title').textContent = section.title;
    document.getElementById('exam-progress').textContent = `Question 1 of ${totalQuestions}`;
    
    // Apply theme and font size
    document.body.className = `${appState.settings.theme} font-${appState.settings.fontSize} nav-${appState.settings.navigationMode}`;
    
    // Show/hide step navigation based on mode
    const stepNav = document.getElementById('step-navigation');
    if (appState.settings.navigationMode === 'step') {
        stepNav.classList.remove('hidden');
    } else {
        stepNav.classList.add('hidden');
    }
    
    const container = document.getElementById('exam-questions-container');
    container.innerHTML = '';
    
    // Render all questions
    appState.examQuestions.forEach((question, index) => {
        const userAnswer = appState.answers[appState.currentSection][index];
        const isFlagged = appState.flaggedQuestions[appState.currentSection]?.[index] || false;
        const timeSpent = appState.questionTimes[appState.currentSection]?.[index] || 0;
        const formattedTime = timeSpent > 0 
            ? `(${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s)` 
            : '';
        
        // Convert difficulty number to string for display
        const difficultyNum = question.difficulty;
        let difficultyLevel = 'medium';
        if (difficultyNum === 1) difficultyLevel = 'easy';
        else if (difficultyNum === 3) difficultyLevel = 'hard';
        
        const questionCard = document.createElement('div');
        questionCard.className = `question-card ${isFlagged ? 'flagged-question' : ''}`;
        questionCard.id = `question-${index}`;
        
        if (appState.settings.navigationMode === 'step') {
            if (index === appState.currentStepIndex) {
                questionCard.classList.add('active-question');
            } else {
                questionCard.classList.add('hidden');
            }
        }
        
        questionCard.innerHTML = `
            <div class="question-header">
                <div style="flex: 1; min-width: 0;">
                    <p class="question-number">
                        Question ${index + 1}
                        ${isFlagged ? '<span class="flagged-indicator" aria-label="Flagged"></span>' : ''}
                        <span class="difficulty-badge difficulty-${difficultyLevel}" aria-label="${difficultyLevel} difficulty">
                            ${difficultyLevel.charAt(0).toUpperCase()}
                        </span>
                    </p>
                    ${question.group_id ? `<p class="question-group">Situation Group: ${question.group_id}</p>` : ''}
                    <p class="time-spent">${formattedTime}</p>
                </div>
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}" loading="lazy"></div>` : ''}
            <div class="choices-container">
                ${question.choices.map((choice, choiceIndex) => {
                    const letter = String.fromCharCode(65 + choiceIndex);
                    const isSelected = userAnswer === letter;
                    return `<button type="button" class="choice-btn ${isSelected ? 'selected' : ''}" data-question="${index}" data-choice="${letter}" aria-label="Option ${letter}: ${choice.trim()}">
                        <span class="choice-letter">${letter}.</span>
                        <span>${choice.trim()}</span>
                    </button>`;
                }).join('')}
            </div>
            <div class="question-actions">
                <button type="button" class="btn btn-secondary btn-sm toggle-flag" data-question="${index}">
                    ${isFlagged ? 'Remove Flag' : 'Flag Question'}
                </button>
                <button type="button" class="btn btn-secondary btn-sm show-note" data-question="${index}">
                    Add Note
                </button>
            </div>
            <div class="note-container hidden" data-note="${index}">
                <div class="note-header">
                    <span>Notes</span>
                    <button type="button" class="btn btn-sm btn-primary save-note" data-question="${index}">Save</button>
                </div>
                <textarea class="note-textarea" placeholder="Enter your notes here..." aria-label="Notes for question ${index + 1}">${appState.questionNotes[appState.currentSection]?.[index] || ''}</textarea>
            </div>
        `;
        container.appendChild(questionCard);
    });
    
    // Set up event listeners
    setupExamEventListeners();
    
    // Update step navigation buttons
    updateStepNavigation();
}

function setupExamEventListeners() {
    // Add event listeners for choices
document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const btnEl = e.target.closest('.choice-btn');
        const questionIndex = parseInt(btnEl.dataset.question);
        const choice = btnEl.dataset.choice;
        selectAnswer(questionIndex, choice);
        
        // Visual feedback
        const questionCard = document.getElementById(`question-${questionIndex}`);
        questionCard.querySelectorAll('.choice-btn').forEach(choiceBtn => {
            choiceBtn.classList.remove('selected');
        });
        btnEl.classList.add('selected');
        
        // Auto-save
        if (appState.settings.autoSave) {
            saveState();
        }
        
        // Auto-advance in step mode OR auto-scroll in scroll mode
        if (appState.settings.navigationMode === 'step') {
            setTimeout(() => {
                navigateStep(1);
            }, 300);
        } else {
            // Auto-scroll to next question in scroll mode - Enhanced version
            setTimeout(() => {
                const nextQuestionIndex = questionIndex + 1;
                if (nextQuestionIndex < appState.examQuestions.length) {
                    const nextQuestionCard = document.getElementById(`question-${nextQuestionIndex}`);
                    if (nextQuestionCard) {
                        // More reliable scrolling method
                        nextQuestionCard.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                        
                        // Additional offset for fixed header
                        setTimeout(() => {
                            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                            const header = document.querySelector('.exam-header');
                            const headerHeight = header ? header.offsetHeight : 60;
                            window.scrollTo({
                                top: currentScroll - headerHeight - 10,
                                behavior: 'auto'
                            });
                        }, 100);
                    }
                }
            }, 300);
        }
    });
});
    
    // Add flagging functionality
    document.querySelectorAll('.toggle-flag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.dataset.question);
            const isFlagged = !appState.flaggedQuestions[appState.currentSection][questionIndex];
            appState.flaggedQuestions[appState.currentSection][questionIndex] = isFlagged;
            saveState();
            
            // Update UI
            const questionCard = document.getElementById(`question-${questionIndex}`);
            if (isFlagged) {
                questionCard.classList.add('flagged-question');
                btn.textContent = 'Remove Flag';
            } else {
                questionCard.classList.remove('flagged-question');
                btn.textContent = 'Flag Question';
            }
        });
    });
    
    // Add note-taking functionality
    document.querySelectorAll('.show-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.dataset.question);
            const noteContainer = document.querySelector(`.note-container[data-note="${questionIndex}"]`);
            noteContainer.classList.toggle('hidden');
        });
    });
    
    document.querySelectorAll('.save-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.dataset.question);
            const textarea = document.querySelector(`.note-container[data-note="${questionIndex}"] textarea`);
            const note = textarea.value;
            if (!appState.questionNotes[appState.currentSection]) {
                appState.questionNotes[appState.currentSection] = new Array(appState.examQuestions.length).fill('');
            }
            appState.questionNotes[appState.currentSection][questionIndex] = note;
            saveState();
            
            // Show confirmation
            const btnText = btn.textContent;
            btn.textContent = 'Saved!';
            setTimeout(() => {
                btn.textContent = btnText;
            }, 1000);
        });
    });
    
    // Add image zoom functionality
    document.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });
    
    // Button actions
    document.getElementById('btn-pause-resume').onclick = () => {
        if (appState.isPaused) {
            appState.isPaused = false;
            startTimer();
            document.getElementById('btn-pause-resume').innerHTML = `
                <svg class="icon" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
                </svg> Pause
            `;
        } else {
            pauseTimer();
            document.getElementById('btn-pause-resume').innerHTML = `
                <svg class="icon" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                </svg> Resume
            `;
        }
    };
    
    document.getElementById('btn-submit-exam').onclick = showSubmitConfirmation;
    
    // Step navigation
    document.getElementById('btn-prev-step').onclick = () => navigateStep(-1);
    document.getElementById('btn-next-step').onclick = () => navigateStep(1);
    
    // Keyboard navigation for step mode
    if (appState.settings.navigationMode === 'step') {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                navigateStep(1);
            } else if (e.key === 'ArrowLeft') {
                navigateStep(-1);
            } else if (e.key === 'f' || e.key === 'F') {
                // Flag current question (F key)
                const currentIndex = appState.currentStepIndex;
                const flagBtn = document.querySelector(`.toggle-flag[data-question="${currentIndex}"]`);
                if (flagBtn) flagBtn.click();
            }
        });
    }
}

function selectAnswer(questionIndex, choice) {
    if (appState.currentSection === null) return;
    appState.answers[appState.currentSection][questionIndex] = choice;
    if (appState.settings.autoSave) {
        saveState();
    }
}

function navigateStep(direction) {
    const newIndex = appState.currentStepIndex + direction;
    if (newIndex >= 0 && newIndex < appState.examQuestions.length) {
        // Hide current question
        const currentCard = document.getElementById(`question-${appState.currentStepIndex}`);
        if (currentCard) {
            currentCard.classList.add('hidden');
            currentCard.classList.remove('active-question');
        }
        
        // Show new question
        appState.currentStepIndex = newIndex;
        const newCard = document.getElementById(`question-${newIndex}`);
        if (newCard) {
            newCard.classList.remove('hidden');
            newCard.classList.add('active-question');
            newCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Update progress
        document.getElementById('exam-progress').textContent = `Question ${newIndex + 1} of ${appState.examQuestions.length}`;
        
        // Update navigation buttons
        updateStepNavigation();
    }
}

function updateStepNavigation() {
    const prevBtn = document.getElementById('btn-prev-step');
    const nextBtn = document.getElementById('btn-next-step');
    
    prevBtn.disabled = appState.currentStepIndex === 0;
    nextBtn.disabled = appState.currentStepIndex === appState.examQuestions.length - 1;
    
    if (appState.currentStepIndex === appState.examQuestions.length - 1) {
        nextBtn.textContent = 'Submit Exam';
        nextBtn.onclick = showSubmitConfirmation;
    } else {
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => navigateStep(1);
    }
}

function jumpToFirstUnanswered() {
    const sectionName = appState.currentSection;
    const answers = appState.answers[sectionName];
    const firstUnansweredIndex = answers.findIndex(answer => answer === null);
    if (firstUnansweredIndex === -1) {
        alert("All questions have been answered!");
        return;
    }
    
    if (appState.settings.navigationMode === 'step') {
        appState.currentStepIndex = firstUnansweredIndex;
        renderExam();
    } else {
        const targetEl = document.getElementById(`question-${firstUnansweredIndex}`);
        if (targetEl) {
            const header = document.querySelector('.exam-header');
            const headerHeight = header ? header.offsetHeight : 60;
            const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - headerHeight - 10;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    }
}

// ======================
// SUBMIT EXAM - DOUBLE CONFIRMATION
// ======================
function showSubmitConfirmation() {
    const sectionName = appState.currentSection;
    const answers = appState.answers[sectionName];
    const totalQuestions = appState.examQuestions.length;
    
    // Count unanswered questions
    const unansweredCount = answers.filter(answer => answer === null).length;
    const answeredCount = totalQuestions - unansweredCount;
    
    // First confirmation - show unanswered questions warning
    const firstModal = document.createElement('div');
    firstModal.className = 'modal-overlay';
    firstModal.innerHTML = `
        <div class="modal-content confirm-modal" style="max-width: 500px;">
            <h2>📋 Submission Review</h2>
            
            <div class="submission-stats mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded">
                <div class="text-center mb-3">
                    <div class="text-2xl font-bold text-yellow-600">${unansweredCount} Unanswered</div>
                    <div class="text-sm text-gray-600">out of ${totalQuestions} total questions</div>
                </div>
                
                <div class="progress-bar-container mb-2">
                    <div class="progress-bar-fill" style="width: ${(answeredCount/totalQuestions)*100}%"></div>
                </div>
                <div class="flex justify-between text-sm">
                    <span>Answered: ${answeredCount}</span>
                    <span>Unanswered: ${unansweredCount}</span>
                </div>
            </div>

            ${unansweredCount > 0 ? `
                <div class="unanswered-warning mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded">
                    <div class="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                        <span>⚠️</span>
                        <strong>You have unanswered questions!</strong>
                    </div>
                    <p class="text-sm">You haven't answered ${unansweredCount} question(s). These will be marked as wrong.</p>
                </div>
            ` : `
                <div class="completed-warning mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded">
                    <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span>✅</span>
                        <strong>All questions answered!</strong>
                    </div>
                </div>
            `}

            <p class="mb-4 text-gray-600 dark:text-gray-400">
                Are you sure you want to proceed with submission? You cannot change answers after submitting.
            </p>

            <div class="modal-buttons">
                <button type="button" class="btn btn-secondary" id="btn-review-first">Review Questions</button>
                <button type="button" class="btn btn-primary" id="btn-confirm-submit">Proceed to Final Confirmation</button>
            </div>
        </div>
    `;

    document.body.appendChild(firstModal);

    // Review questions button - jump to first unanswered
    firstModal.querySelector('#btn-review-first').addEventListener('click', () => {
        document.body.removeChild(firstModal);
        jumpToFirstUnanswered();
    });

    // Proceed to final confirmation
    firstModal.querySelector('#btn-confirm-submit').addEventListener('click', () => {
        document.body.removeChild(firstModal);
        showFinalConfirmation(unansweredCount, totalQuestions);
    });

    // Close on overlay click
    firstModal.addEventListener('click', (e) => {
        if (e.target === firstModal) {
            document.body.removeChild(firstModal);
        }
    });
}

// Final confirmation modal
function showFinalConfirmation(unansweredCount, totalQuestions) {
    const finalModal = document.createElement('div');
    finalModal.className = 'modal-overlay';
    finalModal.innerHTML = `
        <div class="modal-content confirm-modal" style="max-width: 450px;">
            <div class="text-center mb-4">
                <div class="text-3xl mb-2">🚨</div>
                <h2>Final Confirmation</h2>
            </div>

            <div class="final-warning mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-center">
                <div class="text-red-600 dark:text-red-400 font-bold text-lg mb-2">
                    This is your last chance to review!
                </div>
                <p class="text-sm">
                    ${unansweredCount > 0 
                        ? `${unansweredCount} unanswered question(s) will be marked as wrong.` 
                        : 'All questions have been answered.'}
                </p>
            </div>

            <p class="text-center mb-4 text-gray-600 dark:text-gray-400">
                Once submitted, you cannot change your answers. Your exam will be graded immediately.
            </p>

            <div class="modal-buttons">
                <button type="button" class="btn btn-secondary" id="btn-go-back">Go Back</button>
                <button type="button" class="btn btn-danger" id="btn-final-submit">
                    🎯 Yes, Submit My Exam
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(finalModal);

    // Go back button - returns to first confirmation
    finalModal.querySelector('#btn-go-back').addEventListener('click', () => {
        document.body.removeChild(finalModal);
        showSubmitConfirmation();
    });

    // Final submit button
    finalModal.querySelector('#btn-final-submit').addEventListener('click', () => {
        document.body.removeChild(finalModal);
        submitExam();
    });

    // Close on overlay click
    finalModal.addEventListener('click', (e) => {
        if (e.target === finalModal) {
            document.body.removeChild(finalModal);
            showSubmitConfirmation(); // Go back to first confirmation
        }
    });
}

function submitExam() {
    clearInterval(appState.timerInterval);
    const sectionName = appState.currentSection;
    const questions = appState.examQuestions;
    const answers = appState.answers[sectionName];
    let correctCount = 0;
    const wrongAnswers = [];
    const topicPerformance = {};
    
    // Initialize topic performance tracking
    const section = sectionName === 'CUSTOM' ? { topics: [] } : SECTIONS[sectionName];
    if (section.topics) {
        section.topics.forEach(topic => {
            topicPerformance[topic] = {
                total: 0,
                correct: 0
            };
        });
    }
    
    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        
        // Track topic performance
        if (section.topics && question.topic && topicPerformance[question.topic]) {
            topicPerformance[question.topic].total++;
            if (isCorrect) topicPerformance[question.topic].correct++;
        }
        
        if (isCorrect) {
            correctCount++;
        } else {
            wrongAnswers.push({
                number: index + 1,
                stem: question.stem,
                user_answer: userAnswer,
                correct_answer: question.correct_answer,
                choices: question.choices,
                explanation: question.explanation,
                figure: question.figure,
                group_id: question.group_id,
                time_spent: appState.questionTimes[sectionName][index],
                flagged: appState.flaggedQuestions[sectionName][index],
                notes: appState.questionNotes[sectionName][index],
                difficulty: question.difficulty,
                topic: question.topic
            });
        }
    });
    
    if (wrongAnswers.length > 0) {
        appState.firstWrongIndex = wrongAnswers[0].number - 1;
    } else {
        appState.firstWrongIndex = null;
    }
    
    const score_pct = (correctCount / questions.length) * 100;
    appState.results[sectionName] = {
        score_pct,
        correct: correctCount,
        total: questions.length,
        wrong: wrongAnswers,
        timestamp: new Date().toISOString(),
        topicPerformance: topicPerformance
    };
    
    appState.isPaused = false;
    saveState();
    showScreen('results');
}

// ======================
// RESULTS SCREEN
// ======================
function renderResultsScreen() {
    const sectionName = appState.currentSection;
    const result = appState.results[sectionName];
    const section = sectionName === 'CUSTOM' 
        ? { title: 'Custom Exam' } 
        : SECTIONS[sectionName];
    const passed = result.score_pct >= 70;
    
    // Update results elements
    document.getElementById('results-section-title').textContent = section.title;
    document.getElementById('score-message').textContent = passed 
        ? 'Congratulations! You Passed!' 
        : 'Review Required. You Did Not Pass.';
    document.getElementById('results-score').className = `score ${passed ? 'pass' : 'fail'}`;
    document.getElementById('results-score').textContent = `${result.score_pct.toFixed(1)}%`;
    document.getElementById('total-questions').textContent = result.total;
    document.getElementById('correct-answers').textContent = result.correct;
    document.getElementById('wrong-answers').textContent = result.total - result.correct;
    
    // Show/hide wrong answers section
    const wrongAnswersSection = document.getElementById('wrong-answers-section');
    if (result.wrong.length > 0) {
        wrongAnswersSection.classList.remove('hidden');
        const wrongAnswersList = document.getElementById('wrong-answers-list');
        wrongAnswersList.innerHTML = '';
        result.wrong.forEach(wrong => {
            let choicesHtml = '';
            wrong.choices.forEach((choice, index) => {
                const letter = String.fromCharCode(65 + index);
                const isCorrect = letter === wrong.correct_answer;
                const isUser = letter === wrong.user_answer && !isCorrect;
                const bgClass = isCorrect ? 'bg-green-100' : (isUser ? 'bg-red-100' : '');
                const borderClass = isCorrect ? 'border-green-500' : (isUser ? 'border-red-500' : 'border-gray-200');
                choicesHtml += `
                    <div class="choice-btn ${bgClass} ${borderClass}">
                        <span class="choice-letter">${letter}.</span>
                        <span>${choice.trim()}</span>
                    </div>
                `;
            });
            const wrongCard = document.createElement('div');
            wrongCard.className = 'wrong-answer-card';
            wrongCard.innerHTML = `
                <div class="question-header">
                    <p class="question-number">Question ${wrong.number}</p>
                    ${wrong.group_id ? `<p class="question-group">Situation Group: ${wrong.group_id}</p>` : ''}
                </div>
                <p class="question-stem whitespace-pre-wrap">${wrong.stem}</p>
                ${wrong.figure ? `<div class="question-image"><img src="${wrong.figure}" alt="Figure for question ${wrong.number}" data-figure="${wrong.figure}"></div>` : ''}
                <div class="choices-container">${choicesHtml}</div>
                <div class="answer-comparison">
                    <p class="user-answer">Your Answer: ${wrong.user_answer || "Not Answered"}</p>
                    <p class="correct-answer">Correct Answer: ${wrong.correct_answer}</p>
                    ${wrong.explanation ? `<div class="explanation"><p class="explanation-title">Explanation:</p><p class="whitespace-pre-wrap">${wrong.explanation}</p></div>` : ''}
                </div>
                <div class="question-meta mt-4 flex justify-between items-center">
                    <div class="meta-info text-sm text-gray-600">
                        <div>Time spent: ${Math.floor(wrong.time_spent / 60)}m ${wrong.time_spent % 60}s</div>
                        <div>Difficulty: <span class="difficulty-badge difficulty-${wrong.difficulty}">${wrong.difficulty}</span></div>
                    </div>
                </div>
                ${wrong.notes ? `
                    <div class="note-container mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <strong>Your Note:</strong> ${wrong.notes}
                    </div>
                ` : ''}
            `;
            wrongAnswersList.appendChild(wrongCard);
        });
    } else {
        wrongAnswersSection.classList.add('hidden');
    }
    
    // Set up button actions
    document.getElementById('btn-results-main-menu').onclick = () => showScreen('main-menu');
    document.getElementById('btn-review-section').onclick = () => showReviewScreen(sectionName);
}

// ======================
// REVIEW SCREEN
// ======================
function showReviewScreen(sectionName) {
    const questions = localStorage.getItem(`examQuestions_${sectionName}`);
    if (!questions) {
        alert("Exam questions not found for review.");
        return;
    }
    appState.examQuestions = JSON.parse(questions);
    appState.reviewingSection = sectionName;
    appState.answers[sectionName] = appState.answers[sectionName] || new Array(appState.examQuestions.length).fill(null);
    const section = sectionName === 'CUSTOM' 
        ? { title: 'Custom Exam' } 
        : SECTIONS[sectionName];
    
    // Update screen elements
    document.getElementById('review-section-title').textContent = section.title;
    document.getElementById('review-progress').textContent = `Reviewing all ${appState.examQuestions.length} questions`;
    
    // Set up filters
    const filterSelect = document.getElementById('review-filter');
    filterSelect.value = 'all';
    filterSelect.onchange = applyReviewFilters;
    const difficultySelect = document.getElementById('review-difficulty');
    difficultySelect.value = 'all';
    difficultySelect.onchange = applyReviewFilters;
    const searchInput = document.getElementById('review-search');
    searchInput.value = '';
    searchInput.oninput = applyReviewFilters;
    
    // Render questions
    renderReviewQuestions();
    
    // Set up button actions
    document.getElementById('btn-review-back').onclick = () => showScreen('main-menu');
    
    // Show the screen
    showScreen('review');
}

function renderReviewQuestions() {
    const sectionName = appState.reviewingSection;
    const answers = appState.answers[sectionName];
    const container = document.getElementById('review-questions-container');
    container.innerHTML = '';
    const filter = document.getElementById('review-filter').value;
    const difficulty = document.getElementById('review-difficulty').value;
    const searchTerm = document.getElementById('review-search').value.toLowerCase();
    
    appState.examQuestions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        const isAnswered = userAnswer !== null;
        const flagged = appState.flaggedQuestions[sectionName]?.[index] || false;
        const notes = appState.questionNotes[sectionName]?.[index] || '';
        const timeSpent = appState.questionTimes[sectionName]?.[index] || 0;
        
        // Convert difficulty number to string for display
        const difficultyNum = question.difficulty;
        let difficultyLevel = 'medium';
        if (difficultyNum === 1) difficultyLevel = 'easy';
        else if (difficultyNum === 3) difficultyLevel = 'hard';
        
        // Apply filters
        if (filter === 'correct' && !isCorrect) return;
        if (filter === 'wrong' && (isCorrect || !isAnswered)) return;
        if (filter === 'skipped' && isAnswered) return;
        if (filter === 'flagged' && !flagged) return;
        if (difficulty !== 'all' && difficultyLevel !== difficulty) return;
        // Apply search
        const searchMatch = question.stem.toLowerCase().includes(searchTerm) ||
                          question.choices.some(c => c.toLowerCase().includes(searchTerm));
        if (searchTerm && !searchMatch) return;
        
        let resultIndicator = '❓ Skipped';
        let indicatorColor = 'var(--warning-color)';
        if (isAnswered) {
            resultIndicator = isCorrect ? '✅ Correct' : '❌ Wrong';
            indicatorColor = isCorrect ? 'var(--success-color)' : 'var(--danger-color)';
        }
        
        let choicesHtml = '';
        question.choices.forEach((choice, choiceIndex) => {
            const letter = String.fromCharCode(65 + choiceIndex);
            const isChoiceCorrect = letter === question.correct_answer;
            const isChoiceUser = letter === userAnswer;
            let choiceClass = '';
            if (isChoiceCorrect) {
                choiceClass = 'bg-green-100 border-green-500';
            } else if (isChoiceUser) {
                choiceClass = 'bg-red-100 border-red-500';
            }
            choicesHtml += `
                <button type="button" class="choice-btn ${choiceClass}" disabled>
                    <span class="choice-letter">${letter}.</span>
                    <span>${choice.trim()}</span>
                </button>
            `;
        });
        
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-question-card';
        reviewCard.id = `review-question-${index}`;
        reviewCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    <span class="difficulty-badge difficulty-${difficultyLevel}">${difficultyLevel.charAt(0).toUpperCase()}</span>
                    ${question.group_id ? `<p class="question-group">Situation Group: ${question.group_id}</p>` : ''}
                    <p class="result-indicator" style="font-weight: bold; margin-top: 0.25rem; color: ${indicatorColor}">${resultIndicator}</p>
                    <p class="time-spent">Time spent: ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s</p>
                </div>
                ${flagged ? `<span class="flagged-indicator"></span>` : ''}
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}"></div>` : ''}
            <div class="choices-container">${choicesHtml}</div>
            <div class="answer-comparison" style="margin-top: 1.5rem;">
                <p class="correct-answer">Correct Answer: ${question.correct_answer}</p>
                ${isAnswered ? `<p class="user-answer">Your Answer: ${userAnswer}</p>` : ''}
            </div>
            ${question.explanation ? `<div class="explanation"><p class="explanation-title">Explanation:</p><p class="whitespace-pre-wrap">${question.explanation}</p></div>` : ''}
            ${notes ? `<div class="note-container">
                <div class="note-header">
                    <span>Notes</span>
                </div>
                <p>${notes}</p>
            </div>` : ''}
        `;
        
        container.appendChild(reviewCard);
    });
    
    // Add image zoom functionality
    document.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });
}

function applyReviewFilters() {
    renderReviewQuestions();
}

// ======================
// SETTINGS SCREEN
// ======================
function renderSettingsScreen() {
    // Apply current settings
    document.querySelectorAll('.theme-switcher button').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.id === `theme-${appState.settings.theme}`) {
            btn.classList.add('selected');
        }
    });
    document.querySelectorAll('.font-switcher button').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.id === `font-${appState.settings.fontSize}`) {
            btn.classList.add('selected');
        }
    });
    document.querySelectorAll('.nav-mode-switcher button').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.id === `nav-${appState.settings.navigationMode}`) {
            btn.classList.add('selected');
        }
    });
    // Auto-save status
    const autoSaveStatus = document.getElementById('auto-save-status');
    autoSaveStatus.textContent = appState.settings.autoSave ? '✅' : '❌';
    // Show timer status
    const showTimerStatus = document.getElementById('show-timer-status');
    showTimerStatus.textContent = appState.settings.showTimer ? '✅' : '❌';
    // Show progress status
    const showProgressStatus = document.getElementById('show-progress-status');
    showProgressStatus.textContent = appState.settings.showProgress ? '✅' : '❌';
    // Randomize status
    const randomizeStatus = document.getElementById('randomize-status');
    randomizeStatus.textContent = appState.settings.randomizeQuestions ? '✅' : '❌';
    // Show difficulty status
    const showDifficultyStatus = document.getElementById('show-difficulty-status');
    showDifficultyStatus.textContent = appState.settings.showDifficulty ? '✅' : '❌';
    // Theme switcher
    document.getElementById('theme-light').addEventListener('click', () => {
        appState.settings.theme = 'light';
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        saveState();
        renderSettingsScreen();
    });
    document.getElementById('theme-dark').addEventListener('click', () => {
        appState.settings.theme = 'dark';
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        saveState();
        renderSettingsScreen();
    });
    // Font size
    document.getElementById('font-small').addEventListener('click', () => {
        appState.settings.fontSize = 'small';
        saveState();
        renderSettingsScreen();
    });
    document.getElementById('font-medium').addEventListener('click', () => {
        appState.settings.fontSize = 'medium';
        saveState();
        renderSettingsScreen();
    });
    document.getElementById('font-large').addEventListener('click', () => {
        appState.settings.fontSize = 'large';
        saveState();
        renderSettingsScreen();
    });
    // Navigation mode
    document.getElementById('nav-scroll').addEventListener('click', () => {
        appState.settings.navigationMode = 'scroll';
        saveState();
        renderSettingsScreen();
    });
    document.getElementById('nav-step').addEventListener('click', () => {
        appState.settings.navigationMode = 'step';
        saveState();
        renderSettingsScreen();
    });
    // Auto-save toggle
    document.getElementById('btn-auto-save').addEventListener('click', () => {
        appState.settings.autoSave = !appState.settings.autoSave;
        saveState();
        renderSettingsScreen();
    });
    // Show timer toggle
    document.getElementById('btn-show-timer').addEventListener('click', () => {
        appState.settings.showTimer = !appState.settings.showTimer;
        saveState();
        renderSettingsScreen();
    });
    // Show progress toggle
    document.getElementById('btn-show-progress').addEventListener('click', () => {
        appState.settings.showProgress = !appState.settings.showProgress;
        saveState();
        renderSettingsScreen();
    });
    // Randomize questions toggle
    document.getElementById('btn-randomize-questions').addEventListener('click', () => {
        appState.settings.randomizeQuestions = !appState.settings.randomizeQuestions;
        saveState();
        renderSettingsScreen();
    });
    // Show difficulty toggle
    document.getElementById('btn-show-difficulty').addEventListener('click', () => {
        appState.settings.showDifficulty = !appState.settings.showDifficulty;
        saveState();
        renderSettingsScreen();
    });
    // Back button
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('main-menu'));
}

// ======================
// PDF GENERATION
// ======================
function generateOfflinePDF() {
    const pdfContainer = document.getElementById('pdf-container');
    
    // Get all questions from all sections
    let allQuestions = [];
    Object.keys(SECTIONS).forEach(sectionName => {
        const sectionQuestions = getQuestionsForSection(sectionName);
        allQuestions = allQuestions.concat(sectionQuestions.map(q => ({...q, section: sectionName})));
    });

    // Create answer key
    const answerKey = allQuestions.map((q, index) => {
        return {
            number: index + 1,
            correctAnswer: q.correct_answer,
            section: q.section
        };
    });

    pdfContainer.innerHTML = `
        <div class="printable-container">
            <!-- Header -->
            <div class="printable-header">
                <h1 class="printable-title">Civil Engineering Exam Study Guide</h1>
                <p class="printable-subtitle">Complete Question Bank with Answer Key</p>
                <p class="text-center text-gray-600 mt-2">Generated on ${new Date().toLocaleDateString()}</p>
            </div>

            <!-- Questions Section -->
            <div class="printable-section">
                ${allQuestions.map((question, index) => `
                    <div class="printable-question" style="page-break-inside: avoid; margin-bottom: 2rem;">
                        <div class="flex justify-between items-start mb-2">
                            <h3 style="font-size: 14pt; font-weight: bold; margin: 0;">
                                Question ${index + 1} 
                                <span style="font-size: 10pt; color: #666; margin-left: 10px;">
                                    [${question.section} - ${question.difficulty}]
                                </span>
                            </h3>
                            <div style="width: 100px; height: 20px; border-bottom: 1px solid #ccc;"></div>
                        </div>
                        
                        <div class="printable-stem" style="margin: 1rem 0; font-size: 12pt; line-height: 1.4;">
                            ${question.stem}
                        </div>

                        ${question.figure ? `
                            <div class="printable-figure" style="text-align: center; margin: 1.5rem 0;">
                                <img src="${question.figure}" alt="Figure for question ${index + 1}" 
                                     style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                                ${question.figure_caption ? `
                                    <p style="font-size: 10pt; color: #666; margin-top: 0.5rem;">${question.figure_caption}</p>
                                ` : ''}
                            </div>
                        ` : ''}

                        <div class="printable-choices" style="margin-top: 1.5rem;">
                            ${question.choices.map((choice, choiceIndex) => {
                                const letter = String.fromCharCode(65 + choiceIndex);
                                return `
                                    <div class="printable-choice" style="padding: 0.5rem; margin: 0.25rem 0; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb;">
                                        <span style="font-weight: bold; margin-right: 0.5rem;">${letter}.</span>
                                        ${choice.trim()}
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Space for working -->
                        <div style="margin-top: 1.5rem; padding: 1rem; border: 1px dashed #ccc; border-radius: 4px; min-height: 100px;">
                            <div style="font-size: 10pt; color: #999; margin-bottom: 0.5rem;">Your solution:</div>
                            <!-- Blank space for working -->
                        </div>
                    </div>

                    ${(index + 1) % 3 === 0 ? '<div style="page-break-after: always;"></div>' : ''}
                `).join('')}
            </div>

            <!-- Page break before answer key -->
            <div style="page-break-before: always;"></div>

            <!-- Answer Key Section -->
            <div class="printable-section">
                <div class="printable-header">
                    <h2 class="printable-title">Answer Key</h2>
                    <p class="printable-subtitle">Correct answers for all questions</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem;">
                    ${answerKey.map(item => `
                        <div style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center;">
                            <div style="font-weight: bold;">Q${item.number}</div>
                            <div style="font-size: 1.2em; color: #10b981; font-weight: bold;">${item.correct_answer}</div>
                            <div style="font-size: 0.8em; color: #666;">${item.section}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Summary by Section -->
                <div style="margin-top: 3rem; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 1rem;">Summary by Section</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        ${Object.keys(SECTIONS).map(sectionName => {
                            const sectionQuestions = answerKey.filter(q => q.section === sectionName);
                            return `
                                <div style="text-align: center; padding: 1rem; background: #f8fafc; border-radius: 4px;">
                                    <div style="font-weight: bold;">${sectionName}</div>
                                    <div style="font-size: 1.1em; color: #3b82f6;">${sectionQuestions.length} questions</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="printable-footer">
                <p>© ${new Date().getFullYear()} Civil Engineering Exam Simulator</p>
                <p>For educational purposes only. Do not distribute.</p>
                <p style="font-size: 0.8em; color: #999;">Page 1 of 1 - Complete set</p>
            </div>
        </div>
    `;

    // Show the PDF container for print preview
    pdfContainer.style.display = 'block';
    
    // Wait a moment for images to load, then print
    setTimeout(() => {
        window.print();
        // Hide the container after printing
        setTimeout(() => {
            pdfContainer.style.display = 'none';
        }, 1000);
    }, 500);
}

// ======================
// FALLBACK QUESTIONS
// ======================
function getFallbackQuestions() {
    return [
        {
            id: 1,
            section: "AMSTHEC",
            topic: "Trigonometry",
            difficulty: "medium",
            stem: "Situation: A surveyor wants to measure the height of a building using a theodolite. If the angle of elevation to the top of the building is 30° and the distance from the theodolite to the building is 50 meters, what is the height of the building?",
            choices: [
                "25 meters",
                "28.87 meters",
                "43.30 meters",
                "50 meters"
            ],
            correct_answer: "B",
            explanation: "Using the tangent function: tan(30°) = height / 50. Height = 50 * tan(30°) = 50 * (1/√3) ≈ 28.87 meters.",
            group_id: "SURVEY-01"
        },
        {
            id: 2,
            section: "AMSTHEC",
            topic: "Calculus",
            difficulty: "hard",
            stem: "What is the derivative of f(x) = 3x² + 5x - 2?",
            choices: [
                "6x + 5",
                "3x + 5",
                "6x² + 5",
                "x² + 5x"
            ],
            correct_answer: "A",
            explanation: "The derivative of 3x² is 6x, the derivative of 5x is 5, and the derivative of a constant (-2) is 0. So f'(x) = 6x + 5.",
            group_id: null
        },
        {
            id: 3,
            section: "HPGE",
            topic: "Soil Mechanics",
            difficulty: "medium",
            stem: "In a soil sample, the void ratio is 0.6 and the specific gravity of soil solids is 2.7. What is the porosity of the soil?",
            choices: [
                "0.375",
                "0.6",
                "0.625",
                "0.75"
            ],
            correct_answer: "A",
            explanation: "Porosity (n) = e / (1 + e), where e is the void ratio. n = 0.6 / (1 + 0.6) = 0.6 / 1.6 = 0.375.",
            group_id: "SOIL-01"
        },
        {
            id: 4,
            section: "PSAD",
            topic: "Concrete Design",
            difficulty: "hard",
            stem: "What is the minimum reinforcement ratio for a simply supported reinforced concrete beam?",
            choices: [
                "0.001",
                "0.002",
                "0.003",
                "0.005"
            ],
            correct_answer: "C",
            explanation: "The minimum reinforcement ratio for a simply supported reinforced concrete beam is typically 0.003 (0.3%) to ensure ductile behavior.",
            group_id: null
        }
    ];
}

function getSampleQuestions(sectionName) {
    return getFallbackQuestions().filter(q => q.section === sectionName);
}

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme
    if (appState.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light');
        document.body.classList.remove('dark');
    }
    // Apply font size
    document.body.classList.add(`font-${appState.settings.fontSize}`);
    // Apply navigation mode
    document.body.classList.add(`nav-${appState.settings.navigationMode}`);
    // Show loading screen
    showScreen('loading');
    // Load question bank
    try {
        await loadQuestionBank();
        setTimeout(() => showScreen('main-menu'), 1000);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        setTimeout(() => showScreen('main-menu'), 1000);
    }
    // Close modal on image click
    const closeImageModal = document.getElementById('close-image-modal');
    if (closeImageModal) {
        closeImageModal.onclick = () => {
            document.getElementById('image-modal').classList.add('hidden');
        };
    }
    // Prevent default form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', e => e.preventDefault());
    });
});

