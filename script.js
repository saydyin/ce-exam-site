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
    autoSaveEnabled: true
};

// ======================
// QUESTION BANK MANAGEMENT
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
    
    // Process questions with groups (simplified version that doesn't reduce counts)
    const processedQuestions = processQuestionsWithGroups(sectionQuestions);
    
    // Apply custom exam question count if applicable, otherwise use section requirement
    const requiredTotal = (appState.view === 'custom-exam') 
        ? Math.min(processedQuestions.length, appState.customExam.questionCount) 
        : SECTION_REQUIREMENTS[sectionName].total;
    
    // Ensure we don't exceed available questions
    const finalQuestions = processedQuestions.slice(0, requiredTotal);
    
    console.log(`${sectionName}: Using ${finalQuestions.length} questions (requested: ${requiredTotal}, available: ${sectionQuestions.length})`);
    
    return finalQuestions;
}

// Simplified grouping function that doesn't reduce question counts
function processQuestionsWithGroups(questions) {
    // Simple grouping that maintains situation questions together without reducing counts
    const groups = {};
    
    // Group questions by group_id
    questions.forEach((question, index) => {
        const groupId = question.group_id || `standalone_${index}`;
        if (!groups[groupId]) {
            groups[groupId] = [];
        }
        groups[groupId].push({...question, originalIndex: index});
    });

    // Format situation groups (questions starting with "Situation" or in groups of 3+)
    Object.values(groups).forEach(group => {
        if (group.length >= 3 || group.some(q => q.stem?.trim().startsWith('Situation'))) {
            const firstQuestion = group[0];
            if (!firstQuestion.stem?.trim().startsWith('Situation')) {
                const firstSentence = firstQuestion.stem?.split(/[.!?]/)[0]?.trim() || 'Problem';
                firstQuestion.stem = `Situation: ${firstSentence}. ${firstQuestion.stem}`;
            }
        }
    });

    // Flatten groups back to array - USE ALL QUESTIONS
    const finalQuestions = [];
    Object.values(groups).forEach(group => {
        finalQuestions.push(...group);
    });

    // Apply randomization if needed
    const shouldRandomize = appState.settings.randomizeQuestions || 
        (appState.view === 'custom-exam' && appState.customExam.randomize);
    
    if (shouldRandomize === true) {
        return shuffleArray(finalQuestions);
    }

    return finalQuestions;
}

// Helper function: Fisher-Yates shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    if (!appState.answers[sectionName]) {
        appState.answers[sectionName] = new Array(sectionQuestions.length).fill(null);
    }
    if (!appState.isPaused) {
        appState.timeLeft = SECTIONS[sectionName].time;
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
        const activeCard = document.querySelector('.question-card.active-question');
        if (activeCard) {
            return parseInt(activeCard.id.split('-')[1]);
        }
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

function updateCustomExamSections() {
    const sections = [];
    if (document.getElementById('amsthec-include').checked) sections.push('AMSTHEC');
    if (document.getElementById('hpge-include').checked) sections.push('HPGE');
    if (document.getElementById('psad-include').checked) sections.push('PSAD');
    appState.customExam.sections = sections;
    saveState();
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
        allQuestions = allQuestions.concat(sectionQuestions);
        totalQuestions += sectionQuestions.length;
    });
    
    // Shuffle and limit to requested count
    if (appState.customExam.randomize) {
        allQuestions = shuffleArray(allQuestions);
    }
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
            <button type="button" class="btn ${buttonClass}" data-action="${isCompleted ? 'review' : (isPaused ? 'continue' : 'start')}" data-section="${section.name}">
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
    const section = SECTIONS[appState.currentSection];
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
        if (appState.settings.navigationMode === 'step' && index === 0) {
            questionCard.classList.add('active-question');
        }
        questionCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">
                        Question ${index + 1}
                        ${isFlagged ? '<span class="flagged-indicator"></span>' : ''}
                        <span class="difficulty-badge difficulty-${difficultyLevel}">
                            ${difficultyLevel.charAt(0).toUpperCase()}
                        </span>
                    </p>
                    <p class="time-spent">${formattedTime}</p>
                    ${question.group_id ? `<p class="question-group">Situation: ${question.group_id}</p>` : ''}
                </div>
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}"></div>` : ''}
            <div class="choices-container">
                ${question.choices.map((choice, choiceIndex) => {
                    const letter = String.fromCharCode(65 + choiceIndex);
                    const isSelected = userAnswer === letter;
                    return `<button type="button" class="choice-btn ${isSelected ? 'selected' : ''}" data-question="${index}" data-choice="${letter}">
                        <span class="choice-letter">${letter}.</span>
                        <span>${choice.trim()}</span>
                    </button>`;
                }).join('')}
            </div>
            <div class="question-actions mt-4">
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
                <textarea class="note-textarea" placeholder="Enter your notes here...">${appState.questionNotes[appState.currentSection]?.[index] || ''}</textarea>
            </div>
        `;
        container.appendChild(questionCard);
    });
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
            // Navigation
            if (appState.settings.navigationMode === 'scroll') {
                const nextIndex = questionIndex + 1;
                if (nextIndex < totalQuestions) {
                    const nextEl = document.getElementById(`question-${nextIndex}`);
                    if (nextEl) {
                        const header = document.querySelector('.exam-header');
                        const headerHeight = header ? header.offsetHeight : 60;
                        const elementPosition = nextEl.getBoundingClientRect().top + window.scrollY;
                        const offsetPosition = elementPosition - headerHeight - 10;
                        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                }
            } else if (appState.settings.navigationMode === 'step') {
                navigateStep(1);
            }
            // Auto-save
            if (appState.settings.autoSave) {
                saveState();
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
                questionCard.querySelector('.question-number').innerHTML = `Question ${questionIndex + 1}<span class="flagged-indicator"></span>
                    <span class="difficulty-badge difficulty-${appState.questionDifficulty[appState.currentSection][questionIndex]}">${appState.questionDifficulty[appState.currentSection][questionIndex].charAt(0).toUpperCase()}</span>
                `;
                btn.textContent = 'Remove Flag';
            } else {
                questionCard.classList.remove('flagged-question');
                questionCard.querySelector('.question-number').innerHTML = `Question ${questionIndex + 1}
                    <span class="difficulty-badge difficulty-${appState.questionDifficulty[appState.currentSection][questionIndex]}">${appState.questionDifficulty[appState.currentSection][questionIndex].charAt(0).toUpperCase()}</span>
                `;
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
    document.getElementById('btn-jump-to-first').onclick = jumpToFirstUnanswered;
    document.getElementById('btn-nav-next').onclick = () => {
        navigateStep(1);
    };
    // Keyboard navigation for step mode
    if (appState.settings.navigationMode === 'step') {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                navigateStep(1);
            } else if (e.key === 'ArrowLeft') {
                navigateStep(-1);
            } else if (e.key === 'f' || e.key === 'F') {
                // Flag current question (F key)
                const activeCard = document.querySelector('.question-card.active-question');
                if (activeCard) {
                    const index = parseInt(activeCard.id.split('-')[1]);
                    const flagBtn = activeCard.querySelector('.toggle-flag');
                    if (flagBtn) flagBtn.click();
                }
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
    const activeCard = document.querySelector('.question-card.active-question');
    if (!activeCard) return;
    let currentIndex = parseInt(activeCard.id.split('-')[1]);
    let nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < appState.examQuestions.length) {
        activeCard.classList.remove('active-question');
        const nextCard = document.getElementById(`question-${nextIndex}`);
        if (nextCard) {
            nextCard.classList.add('active-question');
            document.getElementById('exam-progress').textContent = `Question ${nextIndex + 1} of ${appState.examQuestions.length}`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else if (nextIndex >= appState.examQuestions.length) {
        showSubmitConfirmation();
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
    const targetEl = document.getElementById(`question-${firstUnansweredIndex}`);
    if (targetEl) {
        const header = document.querySelector('.exam-header');
        const headerHeight = header ? header.offsetHeight : 60;
        const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerHeight - 10;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
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
        // Track performance data for future analysis
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
        const difficulty = question.difficulty || 'medium';
        appState.performanceData[sectionName].difficultyDistribution[difficulty]++;
        if (question.topic) {
            if (!appState.performanceData[sectionName].topicPerformance[question.topic]) {
                appState.performanceData[sectionName].topicPerformance[question.topic] = {
                    total: 0,
                    correct: 0
                };
            }
            appState.performanceData[sectionName].topicPerformance[question.topic].total++;
            if (isCorrect) {
                appState.performanceData[sectionName].topicPerformance[question.topic].correct++;
            }
        }
    });
    // Calculate answer patterns
    const answerPatterns = analyzeAnswerPatterns(questions, answers);
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
        topicPerformance: topicPerformance,
        answerPatterns: answerPatterns
    };
    appState.isPaused = false;
    saveState();
    showScreen('results');
}

// ======================
// ANSWER PATTERN ANALYSIS
// ======================
function analyzeAnswerPatterns(questions, answers) {
    const patterns = {
        commonMistakes: [],
        streakAnalysis: [],
        timeAnalysis: {
            timePerQuestion: {
                easy: { min: 0, max: 0, avg: 0 },
                medium: { min: 0, max: 0, avg: 0 },
                hard: { min: 0, max: 0, avg: 0 }
            },
            timeToCorrect: 0,
            timeToWrong: 0
        },
        topicPerformance: {}
    };
    // Analyze common mistakes
    const mistakeMap = {};
    questions.forEach((q, index) => {
        const userAnswer = answers[index];
        if (userAnswer !== null && userAnswer !== q.correct_answer) {
            const mistakeKey = `${q.id}-${userAnswer}`;
            if (!mistakeMap[mistakeKey]) {
                mistakeMap[mistakeKey] = {
                    count: 0,
                    question: q,
                    userAnswer: userAnswer
                };
            }
            mistakeMap[mistakeKey].count++;
        }
    });
    // Get top 3 common mistakes
    const mistakesArray = Object.values(mistakeMap).sort((a, b) => b.count - a.count).slice(0, 3);
    mistakesArray.forEach(mistake => {
        patterns.commonMistakes.push({
            question: mistake.question,
            userAnswer: mistake.userAnswer,
            correctAnswer: mistake.question.correct_answer,
            count: mistake.count
        });
    });
    // Analyze streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let currentStreakType = null;
    questions.forEach((q, index) => {
        const isCorrect = answers[index] === q.correct_answer;
        if (isCorrect) {
            if (currentStreakType === 'correct') {
                currentStreak++;
            } else {
                if (currentStreak > maxStreak && currentStreakType === 'correct') {
                    maxStreak = currentStreak;
                }
                currentStreak = 1;
                currentStreakType = 'correct';
            }
        } else {
            if (currentStreakType === 'wrong') {
                currentStreak++;
            } else {
                if (currentStreak > maxStreak && currentStreakType === 'wrong') {
                    maxStreak = currentStreak;
                }
                currentStreak = 1;
                currentStreakType = 'wrong';
            }
        }
    });
    patterns.streakAnalysis.push({
        maxCorrectStreak: maxStreak,
        maxWrongStreak: maxStreak
    });
    return patterns;
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
                    ${wrong.group_id ? `<p class="question-group">Problem from Situation ${wrong.group_id}</p>` : ''}
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
                    <button type="button" class="btn btn-primary view-solution">
                        📖 View Solution
                    </button>
                </div>
                ${wrong.notes ? `
                    <div class="note-container mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <strong>Your Note:</strong> ${wrong.notes}
                    </div>
                ` : ''}
            `;
            // Add solution button functionality
            wrongCard.querySelector('.view-solution').addEventListener('click', () => {
                showSolution(wrong);
            });
            wrongAnswersList.appendChild(wrongCard);
        });
    } else {
        wrongAnswersSection.classList.add('hidden');
    }
    // Render performance heatmap
    renderPerformanceHeatmap(result);
    // Generate study focus recommendations
    renderStudyFocusRecommendations(result);
    // Set up button actions
    document.getElementById('btn-results-main-menu').onclick = () => showScreen('main-menu');
    document.getElementById('btn-review-section').onclick = () => showReviewScreen(sectionName);
}

// ======================
// SOLUTION SYSTEM - IMAGE BASED
// ======================
function showSolution(wrongQuestion) {
    const solutionModal = document.createElement('div');
    solutionModal.className = 'modal-overlay';
    solutionModal.innerHTML = `
        <div class="modal-content" style="max-width: 95%; max-height: 95vh; width: auto;">
            <div class="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 p-4 border-b">
                <h2 class="section-title">Solution - Question ${wrongQuestion.number}</h2>
                <button type="button" class="btn btn-secondary close-solution">Close</button>
            </div>
            
            <div class="solution-content p-4" style="overflow-y: auto; max-height: calc(95vh - 100px);">
                <!-- Question Preview -->
                <div class="question-preview p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                    <h3 class="font-bold mb-2">Question:</h3>
                    <p class="question-stem mb-2">${wrongQuestion.stem}</p>
                    <div class="answer-comparison flex gap-4 text-sm">
                        <span class="user-answer text-red-600 dark:text-red-400">
                            <strong>Your Answer:</strong> ${wrongQuestion.user_answer || "Not Answered"}
                        </span>
                        <span class="correct-answer text-green-600 dark:text-green-400">
                            <strong>Correct Answer:</strong> ${wrongQuestion.correct_answer}
                        </span>
                    </div>
                </div>

                <!-- Solution Image -->
                <div class="solution-image text-center">
                    <h3 class="font-bold mb-4 text-lg">Step-by-Step Solution</h3>
                    <div class="bg-white p-4 rounded-lg border">
                        <img src="${getSolutionImageUrl(wrongQuestion)}" 
                             alt="Solution for question ${wrongQuestion.number}" 
                             class="max-w-full h-auto mx-auto"
                             style="max-height: 70vh; object-fit: contain;">
                        <p class="text-sm text-gray-500 mt-2">Scroll to view complete solution</p>
                    </div>
                </div>

                <!-- Navigation for multiple solution pages -->
                <div class="solution-navigation flex justify-between items-center mt-4 pt-4 border-t">
                    <button type="button" class="btn btn-secondary btn-sm prev-solution" disabled>
                        ← Previous Page
                    </button>
                    <span class="text-sm text-gray-500">Page 1 of 1</span>
                    <button type="button" class="btn btn-secondary btn-sm next-solution" disabled>
                        Next Page →
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(solutionModal);
    
    // Close functionality
    solutionModal.querySelector('.close-solution').addEventListener('click', () => {
        document.body.removeChild(solutionModal);
    });
    
    // Close on overlay click
    solutionModal.addEventListener('click', (e) => {
        if (e.target === solutionModal) {
            document.body.removeChild(solutionModal);
        }
    });
}

// Function to get solution image URL based on question
function getSolutionImageUrl(question) {
    // You can customize this based on your image naming convention
    // Example: solutions/AMSTHEC-001.jpg, solutions/HPGE-045.png, etc.
    const questionId = question.id || `Q${question.number.toString().padStart(3, '0')}`;
    return `solutions/${questionId}.jpg`; // or .png based on your files
}

function renderPerformanceHeatmap(result) {
    const canvas = document.getElementById('performance-heatmap');
    const ctx = canvas.getContext('2d');
    const topicPerformance = result.topicPerformance || {};
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const topics = Object.keys(topicPerformance).filter(topic => topicPerformance[topic].total > 0);
    if (topics.length === 0) return;
    
    const cellWidth = canvas.width / Math.min(8, topics.length); // Max 8 topics per row
    const cellHeight = 30;
    const rows = Math.ceil(topics.length / 8);
    
    topics.forEach((topic, index) => {
        const perf = topicPerformance[topic];
        const accuracy = (perf.correct / perf.total) * 100;
        const row = Math.floor(index / 8);
        const col = index % 8;
        
        // Determine color based on accuracy
        let color;
        if (accuracy >= 80) color = '#10b981';      // Green
        else if (accuracy >= 60) color = '#f59e0b'; // Yellow
        else color = '#dc2626';                     // Red
        
        // Draw cell
        ctx.fillStyle = color;
        ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth - 2, cellHeight - 2);
        
        // Draw text
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${topic.substring(0, 12)}`, 
            col * cellWidth + cellWidth/2, 
            row * cellHeight + cellHeight/2 + 3
        );
        
        // Draw accuracy percentage
        ctx.font = '8px Arial';
        ctx.fillText(
            `${Math.round(accuracy)}%`, 
            col * cellWidth + cellWidth/2, 
            row * cellHeight + cellHeight/2 + 15
        );
    });
    
    // Add legend
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Legend: ', 10, rows * cellHeight + 20);
    
    const legends = [
        { color: '#10b981', text: '≥80% (Strong)' },
        { color: '#f59e0b', text: '60-79% (Good)' },
        { color: '#dc2626', text: '<60% (Needs Review)' }
    ];
    
    legends.forEach((legend, index) => {
        ctx.fillStyle = legend.color;
        ctx.fillRect(60 + index * 80, rows * cellHeight + 15, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillText(legend.text, 75 + index * 80, rows * cellHeight + 23);
    });
}

function renderStudyFocusRecommendations(result) {
    const container = document.getElementById('study-focus-container');
    const topicPerformance = result.topicPerformance || {};
    
    // Calculate weakest topics (accuracy < 70%)
    const weakTopics = Object.keys(topicPerformance)
        .filter(topic => {
            const perf = topicPerformance[topic];
            const accuracy = (perf.correct / perf.total) * 100;
            return accuracy < 70 && perf.total >= 3; // Only include topics with sufficient questions
        })
        .sort((a, b) => {
            const accA = (topicPerformance[a].correct / topicPerformance[a].total) * 100;
            const accB = (topicPerformance[b].correct / topicPerformance[b].total) * 100;
            return accA - accB;
        })
        .slice(0, 3); // Top 3 weakest topics

    if (weakTopics.length === 0) {
        container.innerHTML = `
            <div class="study-focus-item bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
                <strong>Excellent Performance! 🎉</strong>
                <p class="mt-2">You're performing well across all topics. Consider challenging yourself with:</p>
                <ul class="ml-4 mt-1 list-disc">
                    <li>Advanced difficulty questions</li>
                    <li>Time-attack mode for speed</li>
                    <li>Teaching concepts to reinforce learning</li>
                </ul>
            </div>
        `;
        return;
    }

    const recommendations = weakTopics.map((topic, index) => {
        const perf = topicPerformance[topic];
        const accuracy = Math.round((perf.correct / perf.total) * 100);
        const priorityColors = [
            'bg-red-50 border-red-200 dark:bg-red-900/20',
            'bg-orange-50 border-orange-200 dark:bg-orange-900/20', 
            'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20'
        ];
        
        const studyStrategies = [
            "Review fundamental concepts and formulas",
            "Practice with step-by-step solutions", 
            "Focus on understanding common mistakes",
            "Create summary notes for key points",
            "Try similar questions with variations"
        ];

        return `
            <div class="study-focus-item ${priorityColors[index]} border rounded-lg p-4 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <strong class="text-lg">${index + 1}. ${topic}</strong>
                    <span class="accuracy-badge ${accuracy < 50 ? 'bg-red-500' : accuracy < 70 ? 'bg-orange-500' : 'bg-yellow-500'} text-white px-2 py-1 rounded text-sm">
                        ${accuracy}% Accuracy
                    </span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    ${perf.correct}/${perf.total} questions correct
                </div>
                <div class="recommended-actions">
                    <strong>Recommended Study Plan:</strong>
                    <ul class="ml-4 mt-1 space-y-1">
                        ${studyStrategies.slice(0, 3).map(strategy => 
                            `<li class="flex items-center gap-2">
                                <span class="w-2 h-2 bg-primary rounded-full"></span>
                                ${strategy}
                            </li>`
                        ).join('')}
                    </ul>
                </div>
                <div class="estimated-time mt-3 text-sm text-gray-500">
                    ⏱️ Estimated study time: ${Math.max(30, Math.round((100 - accuracy) * 0.8))} minutes
                </div>
            </div>
        `;
    });

    container.innerHTML = recommendations.join('');
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
    const answers = appState.answers[sectionName];
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
    const container = document.getElementById('review-questions-container');
    container.innerHTML = '';
    // Render questions
    renderReviewQuestions();
    // Set up button actions
    document.getElementById('btn-review-back').onclick = () => showScreen('main-menu');
    // Render answer pattern analysis
    renderAnswerPatternAnalysis(sectionName);
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
                    ${question.group_id && question.stem.trim().startsWith('Situation') ? `<p class="question-group">Situation: ${question.group_id}</p>` : (question.group_id ? `<p class="question-group">Problem from Situation ${question.group_id}</p>` : '')}
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
            <div class="mt-4">
                <button type="button" class="btn btn-primary view-solution" data-question="${index}">
                    📖 View Solution
                </button>
            </div>
        `;
        
        // Add solution button functionality
        reviewCard.querySelector('.view-solution').addEventListener('click', () => {
            const wrongQuestion = {
                number: index + 1,
                stem: question.stem,
                user_answer: userAnswer,
                correct_answer: question.correct_answer,
                figure: question.figure,
                group_id: question.group_id,
                difficulty: difficultyLevel,
                topic: question.topic,
                id: question.id
            };
            showSolution(wrongQuestion);
        });
        
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

function renderAnswerPatternAnalysis(sectionName) {
    const container = document.getElementById('answer-patterns');
    container.innerHTML = '';
    const result = appState.results[sectionName];
    if (!result || !result.answerPatterns) return;
    // Common mistakes
    const commonMistakes = result.answerPatterns.commonMistakes;
    if (commonMistakes.length > 0) {
        const mistakesHtml = commonMistakes.map(mistake => `
            <div class="answer-pattern">
                <div class="pattern-title">Question ${mistake.question.id}</div>
                <div class="pattern-description">
                    <strong>You answered:</strong> ${mistake.userAnswer} 
                    <br>
                    <strong>Correct answer:</strong> ${mistake.correctAnswer}
                    <br>
                    <strong>Times repeated:</strong> ${mistake.count}
                </div>
            </div>
        `).join('');
        container.innerHTML += `
            <div class="col-span-2">
                <h3 class="font-bold mb-2">Common Mistakes</h3>
                ${mistakesHtml}
            </div>
        `;
    }
    // Streak analysis
    if (result.answerPatterns.streakAnalysis && result.answerPatterns.streakAnalysis.length > 0) {
        const streak = result.answerPatterns.streakAnalysis[0];
        container.innerHTML += `
            <div class="col-span-2">
                <h3 class="font-bold mb-2">Answer Streaks</h3>
                <div class="answer-pattern">
                    <div class="pattern-title">Performance Streaks</div>
                    <div class="pattern-description">
                        <strong>Longest correct streak:</strong> ${streak.maxCorrectStreak} questions
                        <br>
                        <strong>Longest incorrect streak:</strong> ${streak.maxWrongStreak} questions
                    </div>
                </div>
            </div>
        `;
    }
    // Time analysis
    if (result.answerPatterns.timeAnalysis) {
        container.innerHTML += `
            <div class="col-span-2">
                <h3 class="font-bold mb-2">Time Management</h3>
                <div class="answer-pattern">
                    <div class="pattern-title">Time Per Question</div>
                    <div class="pattern-description">
                        <strong>Easy questions:</strong> ${result.answerPatterns.timeAnalysis.timePerQuestion.easy.avg} seconds
                        <br>
                        <strong>Medium questions:</strong> ${result.answerPatterns.timeAnalysis.timePerQuestion.medium.avg} seconds
                        <br>
                        <strong>Hard questions:</strong> ${result.answerPatterns.timeAnalysis.timePerQuestion.hard.avg} seconds
                    </div>
                </div>
            </div>
        `;
    }
}

// ======================
// CONFIRMATION MODAL
// ======================
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');
    // Prevent duplicate event listeners
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    const handleCancel = () => {
        document.getElementById('confirm-modal').classList.add('hidden');
    };
    const handleConfirm = () => {
        onConfirm();
        handleCancel();
    };
    newCancelBtn.addEventListener('click', handleCancel);
    newOkBtn.addEventListener('click', handleConfirm);
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
// PDF GENERATION - SINGLE PAGE WITH ANSWER KEY
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
// HTML DECODING UTILITY
// ======================
function decodeHtmlEntities(text) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = text;
    return tempElement.textContent || tempElement.innerText || '';
}

// ======================
// OTHER UTILITIES
// ======================
function getFallbackQuestions() {
    return [
        {
            id: 1,
            section: "AMSTHEC",
            topic: "Trigonometry",
            difficulty: "medium",
            stem: "A surveyor wants to measure the height of a building using a theodolite. If the angle of elevation to the top of the building is 30° and the distance from the theodolite to the building is 50 meters, what is the height of the building?",
            choices: [
                "25 meters",
                "28.87 meters",
                "43.30 meters",
                "50 meters"
            ],
            correct_answer: "B",
            explanation: "Using the tangent function: tan(30°) = height / 50. Height = 50 * tan(30°) = 50 * (1/√3) ≈ 28.87 meters."
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
            explanation: "The derivative of 3x² is 6x, the derivative of 5x is 5, and the derivative of a constant (-2) is 0. So f'(x) = 6x + 5."
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
            explanation: "Porosity (n) = e / (1 + e), where e is the void ratio. n = 0.6 / (1 + 0.6) = 0.6 / 1.6 = 0.375."
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
            explanation: "The minimum reinforcement ratio for a simply supported reinforced concrete beam is typically 0.003 (0.3%) to ensure ductile behavior."
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
