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
// STATE MANAGEMENT (without localStorage)
// ======================
let appState = {
    view: 'loading',
    settings: {
        theme: 'light',
        fontSize: 'medium',
        autoSave: true,
        navigationMode: 'scroll',
        showTimer: true,
        showProgress: true,
        randomizeQuestions: true,
        showDifficulty: true
    },
    answers: {},
    results: {},
    currentSection: null,
    timeLeft: 0,
    timerInterval: null,
    examQuestions: [],
    reviewingSection: null,
    fullQuestionBank: [],
    isPaused: false,
    firstWrongIndex: null,
    flaggedQuestions: {},
    questionNotes: {},
    questionTimes: {},
    questionDifficulty: {},
    performanceData: {},
    customExam: {
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
function loadQuestionBank() {
    // Use fallback questions since we can't load from external file
    appState.fullQuestionBank = getFallbackQuestions();
    return appState.fullQuestionBank;
}
function getQuestionsForSection(sectionName) {
    if (!appState.fullQuestionBank || appState.fullQuestionBank.length === 0) {
        return getSampleQuestions(sectionName);
    }
    // Get questions for this section
    let sectionQuestions = appState.fullQuestionBank.filter(q => q.section === sectionName);
    // Apply difficulty filter if in custom exam mode
    if (appState.view === 'custom-exam' && appState.customExam.difficulty !== 'all') {
        sectionQuestions = sectionQuestions.filter(q => q.difficulty === appState.customExam.difficulty);
    }
    // Process questions with groups
    const processedQuestions = processQuestionsWithGroups(sectionQuestions);
    // Apply custom exam question count if applicable
    const requiredTotal = (appState.view === 'custom-exam') 
        ? Math.min(processedQuestions.length, appState.customExam.questionCount) 
        : SECTION_REQUIREMENTS[sectionName].total;
    return processedQuestions.slice(0, requiredTotal);
}
function processQuestionsWithGroups(questions) {
    // First, group questions by group_id
    const groupMap = {};
    questions.forEach(question => {
        const gid = question.group_id;
        if (gid) {
            if (!groupMap[gid]) {
                groupMap[gid] = [];
            }
            groupMap[gid].push(question);
        } else {
            // For questions without group_id, create a unique ID
            const tempId = `__single_${Math.random().toString(36).substring(2, 10)}`;
            if (!groupMap[tempId]) {
                groupMap[tempId] = [];
            }
            groupMap[tempId].push(question);
        }
    });
    // Process each group to ensure "Situation" questions are first
    const processedGroups = Object.values(groupMap).map(group => {
        // A common CE situation group has a main Situation question followed by two or more related questions
        // This simple check assumes a standard 3-question group with a "Situation" stem
        const isSituationGroup = group.some(q => q.stem.trim().startsWith('Situation')) && group.length >= 2;
        if (isSituationGroup) {
            // Sort the group to put the Situation statement first, followed by the related questions
            return group.sort((a, b) => {
                if (a.stem.trim().startsWith('Situation')) return -1;
                if (b.stem.trim().startsWith('Situation')) return 1;
                return a.stem.localeCompare(b.stem); // Default sort for sub-questions
            });
        }
        // For non-situation groups, return as is
        return group;
    });
    // Now we have all questions organized into groups
    // First, separate into situation groups and standalone questions
    const situationGroups = [];
    const standaloneQuestions = [];
    processedGroups.forEach(group => {
        if (group.some(q => q.stem.trim().startsWith('Situation')) && group.length >= 2) {
            situationGroups.push(group);
        } else {
            standaloneQuestions.push(...group);
        }
    });
    // Determine randomization setting
    const shouldRandomize = appState.settings.randomizeQuestions || (appState.view === 'custom-exam' && appState.customExam.randomize);
    const randomizedSituationGroups = shouldRandomize ? shuffleArray(situationGroups) : situationGroups;
    const randomizedStandalone = shouldRandomize ? shuffleArray(standaloneQuestions) : standaloneQuestions;
    let finalQuestions = [];
    if (!shouldRandomize) {
        // If not randomizing, just flatten the list
        processedGroups.forEach(group => {
            finalQuestions.push(...group);
        });
    } else {
        // Interleave situation groups with standalone questions for a mixed exam experience
        const interleaved = [];
        let situationIndex = 0;
        let standaloneIndex = 0;
        // Alternate between situation groups and standalone questions
        while (situationIndex < randomizedSituationGroups.length || standaloneIndex < randomizedStandalone.length) {
            // Add 1 situation group
            if (situationIndex < randomizedSituationGroups.length) {
                interleaved.push(...randomizedSituationGroups[situationIndex]);
                situationIndex++;
            }
            // Add a chunk of standalone questions (e.g., 2-4 questions)
            const numStandalone = Math.min(Math.floor(Math.random() * 3) + 2, randomizedStandalone.length - standaloneIndex);
            if (numStandalone > 0) {
                for (let i = 0; i < numStandalone; i++) {
                    interleaved.push(randomizedStandalone[standaloneIndex + i]);
                }
                standaloneIndex += numStandalone;
            }
        }
        finalQuestions = interleaved;
    }
    return finalQuestions;
}
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
    let sectionQuestions = getQuestionsForSection(sectionName);
    appState.examQuestions = sectionQuestions;
    // Initialize state if necessary
    if (!appState.answers[sectionName]) {
        appState.answers[sectionName] = new Array(sectionQuestions.length).fill(null);
    }
    if (!appState.questionTimes[sectionName]) {
        appState.questionTimes[sectionName] = new Array(sectionQuestions.length).fill(0);
    }
    if (!appState.flaggedQuestions[sectionName]) {
        appState.flaggedQuestions[sectionName] = new Array(sectionQuestions.length).fill(false);
    }
    if (!appState.questionNotes[sectionName]) {
        appState.questionNotes[sectionName] = new Array(sectionQuestions.length).fill('');
    }
    if (!appState.questionDifficulty[sectionName]) {
        appState.questionDifficulty[sectionName] = new Array(sectionQuestions.length).fill('medium');
    }
    if (!appState.performanceData[sectionName]) {
        appState.performanceData[sectionName] = {
            difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
            topicPerformance: {},
            answerPatterns: { commonMistakes: [] }
        };
    }
    if (appState.isPaused) {
        // Restore previous time if paused (not implemented without localStorage)
        appState.timeLeft = SECTIONS[sectionName].time;
    } else {
        appState.timeLeft = SECTIONS[sectionName].time;
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
        // Scroll Mode: find the card closest to the top of the viewport
        const questionCards = document.querySelectorAll('.question-card');
        if (questionCards.length > 0) {
            const firstVisible = Array.from(questionCards).find(card => {
                const rect = card.getBoundingClientRect();
                // Check if the top of the card is visible and near the top of the viewport
                return rect.top >= 0 && rect.top <= window.innerHeight * 0.25; 
            });
            if (firstVisible) {
                return parseInt(firstVisible.id.split('-')[1]);
            }
            // If none are visible, return the index of the first question
            return parseInt(questionCards[0].id.split('-')[1]);
        }
    }
    return -1;
}
function pauseTimer() {
    clearInterval(appState.timerInterval);
    appState.isPaused = true;
    // Save remaining time for this section (not implemented without localStorage)
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
    showScreen('main-menu');
}
// ======================
// CUSTOM EXAM BUILDER
// ======================
function renderCustomExamBuilder() {
    // Set up initial values
    document.getElementById('amsthec-include').checked = appState.customExam.sections.includes('AMSTHEC');
    document.getElementById('hpge-include').checked = appState.customExam.sections.includes('HPGE');
    document.getElementById('psad-include').checked = appState.customExam.sections.includes('PSAD');
    document.getElementById('randomize-questions').checked = appState.customExam.randomize;
    document.getElementById('difficulty-filter').value = appState.customExam.difficulty;
    document.getElementById('question-count').value = appState.customExam.questionCount;
    document.getElementById('question-count-value').textContent = appState.customExam.questionCount;
    const timeHours = Math.floor(appState.customExam.timeLimit / 3600);
    document.getElementById('time-limit').value = timeHours;
    document.getElementById('time-limit-value').textContent = `${timeHours} hours`;
    // Set up event listeners
    document.getElementById('question-count').oninput = function() {
        document.getElementById('question-count-value').textContent = this.value;
        appState.customExam.questionCount = parseInt(this.value);
    };
    document.getElementById('time-limit').oninput = function() {
        const hours = parseInt(this.value);
        document.getElementById('time-limit-value').textContent = `${hours} hours`;
        appState.customExam.timeLimit = hours * 3600;
    };
    document.getElementById('difficulty-filter').onchange = function() {
        appState.customExam.difficulty = this.value;
    };
    document.getElementById('randomize-questions').onchange = function() {
        appState.customExam.randomize = this.checked;
    };
    // Section checkboxes
    document.getElementById('amsthec-include').onchange = function() { updateCustomExamSections(); };
    document.getElementById('hpge-include').onchange = function() { updateCustomExamSections(); };
    document.getElementById('psad-include').onchange = function() { updateCustomExamSections(); };
    // Button actions
    document.getElementById('btn-custom-exam-back').onclick = () => showScreen('main-menu');
    document.getElementById('btn-create-custom-exam').onclick = createCustomExam;
}
function updateCustomExamSections() {
    const sections = [];
    if (document.getElementById('amsthec-include').checked) sections.push('AMSTHEC');
    if (document.getElementById('hpge-include').checked) sections.push('HPGE');
    if (document.getElementById('psad-include').checked) sections.push('PSAD');
    if (sections.length === 0) {
        alert("You must select at least one section.");
        // Re-check the last section to prevent an empty array
        appState.customExam.sections.forEach(section => {
            document.getElementById(`${section.toLowerCase()}-include`).checked = true;
        });
        return;
    }
    appState.customExam.sections = sections;
}
function createCustomExam() {
    if (appState.customExam.sections.length === 0) {
        alert("Please select at least one section for the custom exam.");
        return;
    }
    // Set up a temporary section object for the custom exam
    const customSectionName = 'CUSTOM_EXAM';
    SECTIONS[customSectionName] = {
        name: customSectionName,
        title: "Custom Mock Exam",
        time: appState.customExam.timeLimit,
        topics: ["Mixed Topics"],
    };
    // Create a new set of questions by combining filtered questions from selected sections
    let combinedQuestions = [];
    appState.customExam.sections.forEach(sectionName => {
        // Use the filter logic with the current custom exam settings
        const sectionQuestions = getQuestionsForSection(sectionName);
        combinedQuestions.push(...sectionQuestions);
    });
    // Randomize the final combined list if requested
    if (appState.customExam.randomize) {
        combinedQuestions = shuffleArray(combinedQuestions);
    }
    // Trim to the requested count
    combinedQuestions = combinedQuestions.slice(0, appState.customExam.questionCount);
    // Update the temporary section total
    SECTIONS[customSectionName].total = combinedQuestions.length;
    // Clear old answers/state for the custom exam
    appState.answers[customSectionName] = new Array(combinedQuestions.length).fill(null);
    appState.questionTimes[customSectionName] = new Array(combinedQuestions.length).fill(0);
    appState.flaggedQuestions[customSectionName] = new Array(combinedQuestions.length).fill(false);
    appState.questionNotes[customSectionName] = new Array(combinedQuestions.length).fill('');
    appState.questionDifficulty[customSectionName] = new Array(combinedQuestions.length).fill('medium');
    // Set the state and move to instructions
    appState.currentSection = customSectionName;
    appState.isPaused = false;
    showScreen('instructions');
}
// ======================
// SCREEN RENDERING
// ======================
function renderMainMenu() {
    const sectionGrid = document.getElementById('section-grid-container');
    sectionGrid.innerHTML = '';
    let totalQuestions = 0;
    let totalAnswered = 0;
    let totalCorrect = 0;
    Object.keys(SECTIONS).forEach(key => {
        const section = SECTIONS[key];
        const answers = appState.answers[key];
        const results = appState.results[key];
        const answeredCount = answers ? answers.filter(a => a !== null).length : 0;
        const totalCount = section.total;
        const progressPercentage = (answeredCount / totalCount) * 100;
        const score = results ? results.score : null;
        totalQuestions += totalCount;
        totalAnswered += answeredCount;
        if (score !== null) {
            totalCorrect += score.correct;
        }
        const scoreText = score !== null 
            ? `<span class="section-card-score">${score.correct} / ${score.total} (${(score.correct / score.total * 100).toFixed(0)}%)</span>`
            : '';
        const cardHtml = `
            <div class="section-card">
                <div class="section-card-header">
                    <h2 class="section-card-title">
                        ${section.title}
                        ${results ? `<span class="feature-badge" style="background: ${results.isPassed ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${results.isPassed ? 'PASSED' : 'FAILED'}
                        </span>` : ''}
                    </h2>
                    ${scoreText}
                </div>
                <p class="section-card-description">
                    ${totalCount} Questions | ${formatTime(section.time)} Time Limit
                </p>
                ${progressPercentage > 0 || score !== null ? `
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progressPercentage}%;"></div>
                </div>
                <p class="text-muted mt-2" style="font-size: 0.8rem;">
                    ${answeredCount} / ${totalCount} Questions Answered
                </p>` : `<p class="text-muted mt-2" style="font-size: 0.8rem;">Ready to start.</p>`}
                <div class="flex gap-2 mt-4">
                    <button type="button" class="btn btn-sm btn-primary" onclick="startSection('${key}')">
                        ${answeredCount > 0 && score === null ? 'Continue Exam' : 'Start Exam'}
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="showReviewScreen('${key}')" ${score === null ? 'disabled' : ''}>
                        Review
                    </button>
                </div>
            </div>
        `;
        sectionGrid.innerHTML += cardHtml;
    });
    // Update overall progress text
    const overallProgressText = document.getElementById('progress-text');
    if (totalAnswered > 0 || Object.keys(appState.results).length > 0) {
        const totalCompleted = Object.keys(appState.results).length;
        overallProgressText.textContent = `Overall Progress: ${totalCompleted} / ${Object.keys(SECTIONS).length} Sections Completed.`;
        if (totalCompleted === Object.keys(SECTIONS).length) {
            document.getElementById('btn-start-full-exam').disabled = true;
            document.getElementById('btn-view-results').disabled = false;
        } else {
            document.getElementById('btn-start-full-exam').disabled = false;
            document.getElementById('btn-view-results').disabled = true;
        }
    } else {
        overallProgressText.textContent = `Total Exam: ${totalQuestions} Questions.`;
        document.getElementById('btn-start-full-exam').disabled = false;
        document.getElementById('btn-view-results').disabled = true;
    }
    // Attach event listeners to main menu buttons
    document.getElementById('btn-start-full-exam').onclick = startFullExam;
    document.getElementById('btn-custom-exam').onclick = () => showScreen('custom-exam');
    document.getElementById('btn-reset-data').onclick = resetExam;
    document.getElementById('btn-settings').onclick = () => {
        renderSettingsModal();
        document.getElementById('settings-modal').classList.remove('hidden');
    };
    document.getElementById('btn-view-results').onclick = () => showScreen('results');
}
function startSection(sectionName) {
    appState.currentSection = sectionName;
    appState.isPaused = false;
    // Clear any previous exam questions stored for this section to get a fresh start if the exam was completed or is a new custom one
    if (appState.results[sectionName] && sectionName !== 'CUSTOM_EXAM') {
        // Clear old state
    }
    showScreen('instructions');
}
function startFullExam() {
    // Only start a full exam if not all sections are complete
    const completedCount = Object.keys(appState.results).length;
    if (completedCount === Object.keys(SECTIONS).length) return;
    // Find the next uncompleted section
    const nextSectionKey = Object.keys(SECTIONS).find(key => !appState.results[key]);
    if (nextSectionKey) {
        startSection(nextSectionKey);
    }
}
function renderInstructions() {
    const section = SECTIONS[appState.currentSection];
    if (!section) return;
    document.getElementById('instructions-section-title').textContent = section.title;
    document.getElementById('instructions-section-subtitle').textContent = 
        section.name === 'CUSTOM_EXAM' ? `Based on ${appState.customExam.sections.length} sections` : `Main Exam Component`;
    // PRC Instructions
    const instructionsList = document.getElementById('prc-instructions-list');
    instructionsList.innerHTML = PRC_INSTRUCTIONS.map(item => `<li>${item}</li>`).join('');
    // Motivational Quote
    const quoteIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    document.getElementById('motivational-quote').textContent = `"${MOTIVATIONAL_QUOTES[quoteIndex]}"`;
    // Exam Details
    document.getElementById('exam-details').innerHTML = `
        <p><strong>Total Questions:</strong> ${section.total}</p>
        <p><strong>Time Limit:</strong> ${formatTime(section.time)}</p>
        <p><strong>Topics:</strong> ${section.topics.join(', ')}</p>
    `;
    // Button actions
    document.getElementById('btn-start-exam').onclick = () => {
        loadQuestionsForSection(appState.currentSection);
        showScreen('exam');
    };
    document.getElementById('btn-back-to-menu').onclick = () => showScreen('main-menu');
}
function renderExam() {
    const section = SECTIONS[appState.currentSection];
    if (!section || appState.examQuestions.length === 0) {
        showScreen('main-menu');
        return;
    }
    // Header info
    document.getElementById('exam-header-title').textContent = section.title;
    const answeredCount = appState.answers[appState.currentSection].filter(a => a !== null).length;
    document.getElementById('exam-header-subtitle').textContent = `Question 1 of ${appState.examQuestions.length} | Answered: ${answeredCount}`;
    // Timer visibility
    document.getElementById('exam-timer').classList.toggle('hidden', !appState.settings.showTimer);
    // Render questions
    const questionsContainer = document.querySelector('#screen-exam .questions-container');
    questionsContainer.innerHTML = appState.examQuestions.map((question, index) => renderQuestion(question, index)).join('');
    // Attach event listeners to newly rendered elements
    attachExamEventListeners();
    // Setup navigation for step mode
    if (appState.settings.navigationMode === 'step') {
        goToQuestion(0);
    }
    // Setup submit button visibility
    document.getElementById('btn-submit-exam').classList.remove('hidden');
    document.getElementById('btn-submit-exam').onclick = () => {
        if (confirm('Are you sure you want to submit your answers? You cannot change them after submission.')) {
            submitExam();
        }
    };
    // Pause button
    document.getElementById('btn-pause-exam').onclick = () => {
        if (confirm('Are you sure you want to pause? The remaining time will be saved.')) {
            pauseExamAndReturnToMenu();
        }
    };
    // Jump to first unanswered
    document.getElementById('btn-jump-to-first').onclick = jumpToFirstUnanswered;
    // Initial scroll position
    if (appState.settings.navigationMode === 'scroll') {
        const lastIndex = getLastAnsweredIndex();
        if (lastIndex !== -1) {
            setTimeout(() => {
                document.getElementById(`question-${lastIndex}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}
function renderQuestion(question, index) {
    const sectionName = appState.currentSection;
    const answered = appState.answers[sectionName][index];
    const isFlagged = appState.flaggedQuestions[sectionName][index];
    const difficulty = appState.settings.showDifficulty ? 
        `<span class="feature-badge" style="background: ${getDifficultyColor(question.difficulty)};">${question.difficulty.toUpperCase()}</span>` : '';
    // Check if the question is the beginning of a group
    let groupHeader = '';
    if (question.group_id && (index === 0 || question.group_id !== appState.examQuestions[index - 1].group_id)) {
        groupHeader = `
            <div class="card mb-4 p-4" style="background: var(--secondary-color);">
                <p class="question-group" style="font-size: 1.125rem; font-weight: 600;">Situation</p>
                <p class="question-stem">${question.stem}</p>
                ${question.image ? `<div class="question-image">
                    <img src="${question.image}" alt="Figure for Question ${index + 1}" data-src="${question.image}" />
                </div>` : ''}
            </div>
        `;
        // If it's a group, the first question is the Situation, so we use the next question's stem for the body
        question.stem = appState.examQuestions[index + 1] && appState.examQuestions[index + 1].group_id === question.group_id
            ? appState.examQuestions[index + 1].stem
            : '';
    } else if (question.group_id && index > 0 && question.group_id === appState.examQuestions[index - 1].group_id) {
        // Hide actual stem if it's the second or third question in a group
        // Use a placeholder number from the Situation statement instead
    }
    // Only display question number if not the start of a group (Situation questions use the group header)
    const displayIndex = groupHeader ? index + 1 : index + 1;
    const stemContent = groupHeader ? '' : question.stem;
    // Choice letters A, B, C, D
    const choiceLetters = ['A', 'B', 'C', 'D'];
    const choicesHtml = question.choices.map((choice, choiceIndex) => {
        const isSelected = choiceIndex === answered;
        const className = isSelected ? 'selected' : '';
        return `
            <button type="button" class="choice-btn ${className}" 
                data-question-index="${index}" 
                data-choice-index="${choiceIndex}">
                <span class="choice-letter">${choiceLetters[choiceIndex]}</span>
                <span class="choice-text">${choice.text}</span>
            </button>
        `;
    }).join('');
    return `
        ${groupHeader}
        <div class="question-card ${answered !== null ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}" id="question-${index}" data-index="${index}">
            <div class="question-header">
                <span class="question-number">Question ${displayIndex} ${difficulty}</span>
                <button type="button" class="btn btn-text btn-sm toggle-notes" data-question-index="${index}">
                    <svg class="icon" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    Notes
                </button>
            </div>
            ${groupHeader ? '' : `<p class="question-stem">${stemContent}</p>`}
            ${question.image && !groupHeader ? `<div class="question-image">
                <img src="${question.image}" alt="Figure for Question ${index + 1}" data-src="${question.image}" />
            </div>` : ''}
            <div class="choices-container">
                ${choicesHtml}
            </div>
            <div class="note-container hidden" data-note="${index}">
                <div class="note-header">
                    <label for="note-textarea-${index}" style="font-weight: 600;">Notes for Q${index + 1}</label>
                    <button type="button" class="btn btn-sm btn-primary save-note" data-question="${index}">Save</button>
                </div>
                <textarea id="note-textarea-${index}" class="note-textarea" placeholder="Enter your notes here...">${appState.questionNotes[sectionName]?.[index] || ''}</textarea>
            </div>
        </div>
    `;
}
function attachExamEventListeners() {
    // Choice buttons
    document.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', handleAnswerSelection);
    });
    // Image zoom
    document.querySelectorAll('.question-image img').forEach(img => {
        img.addEventListener('click', handleImageZoom);
    });
    // Notes toggle
    document.querySelectorAll('.toggle-notes').forEach(button => {
        button.addEventListener('click', handleNotesToggle);
    });
    // Save notes
    document.querySelectorAll('.save-note').forEach(button => {
        button.addEventListener('click', handleSaveNote);
    });
    // Flag button
    document.getElementById('btn-flag-question').onclick = handleFlagToggle;
    // Navigation buttons (for step mode)
    document.getElementById('btn-previous-question').onclick = () => navigateQuestion(-1);
    document.getElementById('btn-next-question').onclick = () => navigateQuestion(1);
    // Scroll listener for updating header subtitle in scroll mode
    if (appState.settings.navigationMode === 'scroll') {
        document.querySelector('#exam-content').addEventListener('scroll', updateExamHeader);
    }
}
function handleAnswerSelection(event) {
    const button = event.currentTarget;
    const questionIndex = parseInt(button.dataset.questionIndex);
    const choiceIndex = parseInt(button.dataset.choiceIndex);
    const sectionName = appState.currentSection;
    // Clear previous selection
    document.querySelectorAll(`.choice-btn[data-question-index="${questionIndex}"]`).forEach(btn => {
        btn.classList.remove('selected');
    });
    // Set new selection
    button.classList.add('selected');
    appState.answers[sectionName][questionIndex] = choiceIndex;
    // Mark question as answered
    document.getElementById(`question-${questionIndex}`).classList.add('answered');
    updateExamHeader();
    // Auto-advance in step mode
    if (appState.settings.navigationMode === 'step') {
        setTimeout(() => navigateQuestion(1), 200);
    }
}
function handleImageZoom(event) {
    const imgElement = event.currentTarget;
    const src = imgElement.dataset.src;
    document.getElementById('modal-image').src = src;
    document.getElementById('image-modal').classList.remove('hidden');
}
function handleNotesToggle(event) {
    const questionIndex = event.currentTarget.dataset.questionIndex;
    const noteContainer = document.querySelector(`.note-container[data-note="${questionIndex}"]`);
    noteContainer.classList.toggle('hidden');
}
function handleSaveNote(event) {
    const questionIndex = event.currentTarget.dataset.question;
    const sectionName = appState.currentSection;
    const textarea = document.getElementById(`note-textarea-${questionIndex}`);
    appState.questionNotes[sectionName][questionIndex] = textarea.value;
    // Simple visual feedback
    const saveButton = event.currentTarget;
    saveButton.textContent = 'Saved!';
    setTimeout(() => {
        saveButton.textContent = 'Save';
    }, 1000);
}
function handleFlagToggle() {
    const currentQuestionIndex = appState.settings.navigationMode === 'step' 
        ? parseInt(document.querySelector('.question-card.active-question').dataset.index)
        : getLastAnsweredIndex(); // Flag the question closest to view in scroll mode
    if (currentQuestionIndex === -1) return;
    const sectionName = appState.currentSection;
    const isFlagged = appState.flaggedQuestions[sectionName][currentQuestionIndex];
    appState.flaggedQuestions[sectionName][currentQuestionIndex] = !isFlagged;
    document.getElementById(`question-${currentQuestionIndex}`).classList.toggle('flagged', !isFlagged);
    // Update button text/icon
    const flagButton = document.getElementById('btn-flag-question');
    if (!isFlagged) {
        flagButton.classList.add('btn-warning');
        flagButton.classList.remove('btn-secondary');
        flagButton.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M18 10V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-4m-6-4h4m-4 0v4m0-4l4-4"></path></svg> Unflag`;
    } else {
        flagButton.classList.remove('btn-warning');
        flagButton.classList.add('btn-secondary');
        flagButton.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M18 10V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-4m-6-4h4m-4 0v4m0-4l4-4"></path></svg> Flag`;
    }
}
function updateExamHeader() {
    const section = SECTIONS[appState.currentSection];
    if (!section) return;
    const answers = appState.answers[appState.currentSection];
    const answeredCount = answers.filter(a => a !== null).length;
    const totalCount = appState.examQuestions.length;
    // Update progress text
    let currentQ = 1;
    if (appState.settings.navigationMode === 'step') {
        const activeCard = document.querySelector('.question-card.active-question');
        if (activeCard) {
            currentQ = parseInt(activeCard.dataset.index) + 1;
        }
    } else {
        const currentQuestionIndex = getCurrentQuestionIndex();
        if (currentQuestionIndex !== -1) {
             currentQ = currentQuestionIndex + 1;
        }
    }
    const progressText = appState.settings.showProgress 
        ? `Question ${currentQ} of ${totalCount} | Answered: ${answeredCount}`
        : `Answered: ${answeredCount} of ${totalCount}`;
    document.getElementById('exam-header-subtitle').textContent = progressText;
    // Update flag button status for the current question
    const currentQuestionIndex = getCurrentQuestionIndex();
    const isFlagged = currentQuestionIndex !== -1 && appState.flaggedQuestions[appState.currentSection][currentQuestionIndex];
    const flagButton = document.getElementById('btn-flag-question');
    if (isFlagged) {
        flagButton.classList.add('btn-warning');
        flagButton.classList.remove('btn-secondary');
        flagButton.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M18 10V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-4m-6-4h4m-4 0v4m0-4l4-4"></path></svg> Unflag`;
    } else {
        flagButton.classList.remove('btn-warning');
        flagButton.classList.add('btn-secondary');
        flagButton.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M18 10V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-4m-6-4h4m-4 0v4m0-4l4-4"></path></svg> Flag`;
    }
}
function getLastAnsweredIndex() {
    const answers = appState.answers[appState.currentSection];
    for (let i = answers.length - 1; i >= 0; i--) {
        if (answers[i] !== null) {
            return i;
        }
    }
    return 0; // Default to first question
}
function jumpToFirstUnanswered() {
    const answers = appState.answers[appState.currentSection];
    const firstUnanswered = answers.findIndex(a => a === null);
    if (firstUnanswered !== -1) {
        if (appState.settings.navigationMode === 'step') {
            goToQuestion(firstUnanswered);
        } else {
            document.getElementById(`question-${firstUnanswered}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
// Step Navigation Functions
function goToQuestion(index) {
    const total = appState.examQuestions.length;
    if (index < 0 || index >= total) return;
    document.querySelectorAll('.question-card').forEach(card => card.classList.remove('active-question'));
    document.getElementById(`question-${index}`).classList.add('active-question');
    // Scroll to the top of the exam content
    document.querySelector('#exam-content').scrollTop = 0;
    // Update navigation buttons visibility
    document.getElementById('btn-previous-question').classList.toggle('hidden', index === 0);
    document.getElementById('btn-next-question').classList.toggle('hidden', index === total - 1);
    updateExamHeader();
}
function navigateQuestion(direction) {
    const activeCard = document.querySelector('.question-card.active-question');
    if (!activeCard) return;
    const currentIndex = parseInt(activeCard.dataset.index);
    const newIndex = currentIndex + direction;
    goToQuestion(newIndex);
}
function pauseExamAndReturnToMenu() {
    pauseTimer();
    appState.isPaused = true;
    showScreen('main-menu');
}
// ======================
// SUBMISSION & RESULTS
// ======================
function submitExam() {
    const sectionName = appState.currentSection;
    const questions = appState.examQuestions;
    const answers = appState.answers[sectionName];
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let total = questions.length;
    let firstWrong = -1;
    let performanceData = {
        difficultyDistribution: { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } },
        topicPerformance: {}
    };
    questions.forEach((question, index) => {
        const isCorrect = answers[index] === question.answer;
        if (answers[index] === null) {
            unanswered++;
        } else if (isCorrect) {
            correct++;
        } else {
            wrong++;
            if (firstWrong === -1) {
                firstWrong = index;
            }
        }
        // Update performance data
        const difficulty = question.difficulty || 'medium';
        performanceData.difficultyDistribution[difficulty].total++;
        if (isCorrect) {
            performanceData.difficultyDistribution[difficulty].correct++;
        }
        const topic = question.topic || 'General';
        if (!performanceData.topicPerformance[topic]) {
            performanceData.topicPerformance[topic] = { correct: 0, total: 0 };
        }
        performanceData.topicPerformance[topic].total++;
        if (isCorrect) {
            performanceData.topicPerformance[topic].correct++;
        }
    });
    const finalScore = (correct / total) * 100;
    const isPassed = finalScore >= 70; // Assuming a 70% passing rate
    appState.results[sectionName] = {
        score: { correct, wrong, unanswered, total, percentage: finalScore.toFixed(2) },
        isPassed: isPassed,
        submissionTime: new Date().toISOString(),
        timeTaken: SECTIONS[sectionName].time - appState.timeLeft,
        firstWrongIndex: firstWrong,
        questionOrder: questions.map(q => q.id), // Save the order of questions used
        answers: [...answers], // Save the submitted answers
    };
    appState.performanceData[sectionName] = performanceData;
    appState.currentSection = sectionName; // Ensure currentSection is set for state
    clearInterval(appState.timerInterval);
    showScreen('results');
}
function renderResultsScreen() {
    const sectionName = appState.currentSection;
    const section = SECTIONS[sectionName];
    const results = appState.results[sectionName];
    if (!results || !section) {
        showScreen('main-menu');
        return;
    }
    document.getElementById('results-title').textContent = `${section.title} Results`;
    document.getElementById('results-subtitle').textContent = `Submitted on ${new Date(results.submissionTime).toLocaleDateString()}`;
    // Score and status
    const scoreTextElement = document.getElementById('final-score');
    scoreTextElement.textContent = `${results.score.percentage}%`;
    scoreTextElement.style.color = results.isPassed ? 'var(--success-color)' : 'var(--danger-color)';
    const statusElement = document.getElementById('passing-status');
    statusElement.textContent = results.isPassed ? 'STATUS: PASSED' : 'STATUS: FAILED';
    statusElement.style.color = results.isPassed ? 'var(--success-color)' : 'var(--danger-color)';
    // Details
    document.getElementById('results-details').innerHTML = `
        <p><strong>Total Questions:</strong> ${results.score.total}</p>
        <p style="color: var(--success-color);"><strong>Correct Answers:</strong> ${results.score.correct}</p>
        <p style="color: var(--danger-color);"><strong>Incorrect Answers:</strong> ${results.score.wrong}</p>
        <p><strong>Unanswered:</strong> ${results.score.unanswered}</p>
        <p><strong>Time Spent:</strong> ${formatTime(results.timeTaken)}</p>
    `;
    // Performance Analysis (Difficulty and Topic Breakdown)
    const analysis = appState.performanceData[sectionName];
    let analysisHtml = '<h3>Performance Breakdown</h3>';
    // Difficulty Breakdown
    analysisHtml += '<h4>By Difficulty</h4>';
    const diffData = analysis.difficultyDistribution;
    Object.keys(diffData).forEach(key => {
        const data = diffData[key];
        const percentage = data.total > 0 ? (data.correct / data.total * 100).toFixed(0) : 0;
        analysisHtml += `<p>${key.charAt(0).toUpperCase() + key.slice(1)}: ${data.correct} / ${data.total} (${percentage}%)</p>`;
    });
    // Topic Breakdown
    analysisHtml += '<h4 class="mt-4">By Topic</h4>';
    const topicData = analysis.topicPerformance;
    Object.keys(topicData).forEach(key => {
        const data = topicData[key];
        const percentage = data.total > 0 ? (data.correct / data.total * 100).toFixed(0) : 0;
        analysisHtml += `<p>${key}: ${data.correct} / ${data.total} (${percentage}%)</p>`;
    });
    document.getElementById('performance-analysis').innerHTML = analysisHtml;
    // Button actions
    document.getElementById('btn-review-exam').onclick = () => showReviewScreen(sectionName);
    document.getElementById('btn-results-back').onclick = () => showScreen('main-menu');
}
// ======================
// REVIEW MODE
// ======================
function showReviewScreen(sectionName) {
    appState.reviewingSection = sectionName;
    appState.view = 'review';
    document.body.classList.add('review-mode');
    document.body.classList.remove('nav-step');
    // Clear the active question class in case it was set
    document.querySelectorAll('.question-card').forEach(card => card.classList.remove('active-question'));
    renderReview();
    showScreen('review');
}
function renderReview() {
    const sectionName = appState.reviewingSection;
    const section = SECTIONS[sectionName];
    const results = appState.results[sectionName];
    document.getElementById('review-title').textContent = `Review: ${section.title}`;
    document.getElementById('review-subtitle').textContent = results.isPassed ? 'Passed' : 'Failed';
    document.getElementById('review-subtitle').style.color = results.isPassed ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('review-summary-text').innerHTML = `
        <span style="color: var(--success-color); font-weight: bold;">${results.score.correct} Correct</span> | 
        <span style="color: var(--danger-color); font-weight: bold;">${results.score.wrong} Incorrect</span> | 
        <span class="text-muted" style="font-weight: bold;">${results.score.unanswered} Unanswered</span>
    `;
    // Load questions using the stored question order
    const orderedQuestions = getQuestionsByOrder(sectionName);
    appState.examQuestions = orderedQuestions; // Temporarily update examQuestions for rendering
    const reviewContainer = document.getElementById('review-questions-container');
    reviewContainer.innerHTML = orderedQuestions.map((question, index) => renderReviewQuestion(question, index, results)).join('');
    // Attach event listeners for the review screen
    attachReviewEventListeners();
    // Jump to first wrong logic
    const jumpButton = document.getElementById('btn-jump-wrong');
    if (results.firstWrongIndex !== -1) {
        jumpButton.disabled = false;
        jumpButton.onclick = () => {
            document.getElementById(`review-question-${results.firstWrongIndex}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    } else {
        jumpButton.disabled = true;
    }
    document.getElementById('btn-review-back').onclick = () => {
        document.body.classList.remove('review-mode');
        showScreen('main-menu');
    };
    document.getElementById('btn-review-nav-mode').onclick = toggleReviewNavMode;
    // Initialize view mode
    if (document.body.classList.contains('nav-step')) {
        goToReviewQuestion(0);
    }
}
function getQuestionsByOrder(sectionName) {
    const results = appState.results[sectionName];
    const savedQuestionIds = results.questionOrder;
    // This function assumes the fullQuestionBank is loaded and contains all questions by id
    return savedQuestionIds.map(id => 
        appState.fullQuestionBank.find(q => q.id === id) || 
        getFallbackQuestions().find(q => q.id === id) || 
        { id, stem: `Question ID ${id} not found.`, choices: [{ text: 'Error' }], answer: 0 }
    );
}
function renderReviewQuestion(question, index, results) {
    const sectionName = appState.reviewingSection;
    const userAnswer = results.answers[index];
    const isCorrect = userAnswer === question.answer;
    const isFlagged = appState.flaggedQuestions[sectionName]?.[index] || false;
    const noteContent = appState.questionNotes[sectionName]?.[index] || '';
    const timeSpent = appState.questionTimes[sectionName]?.[index] || 0;
    const statusClass = isCorrect ? 'correct' : (userAnswer !== null ? 'incorrect' : 'unanswered');
    const statusText = isCorrect ? 'Correct' : (userAnswer !== null ? 'Incorrect' : 'Unanswered');
    // Check for group start (simple version for review)
    let groupHeader = '';
    if (question.group_id && (index === 0 || question.group_id !== appState.examQuestions[index - 1].group_id)) {
        groupHeader = `
            <div class="card mb-4 p-4" style="background: var(--secondary-color);">
                <p class="question-group" style="font-size: 1.125rem; font-weight: 600;">Situation</p>
                <p class="question-stem">${question.stem}</p>
                ${question.image ? `<div class="question-image">
                    <img src="${question.image}" alt="Figure for Question ${index + 1}" data-src="${question.image}" />
                </div>` : ''}
            </div>
        `;
    }
    // Only display question number if not the start of a group
    const displayIndex = index + 1;
    const stemContent = groupHeader ? '' : question.stem;
    const choiceLetters = ['A', 'B', 'C', 'D'];
    const choicesHtml = question.choices.map((choice, choiceIndex) => {
        const isSelected = choiceIndex === userAnswer;
        const isAnswer = choiceIndex === question.answer;
        let className = '';
        if (isAnswer) {
            className = 'correct';
        } else if (isSelected && !isCorrect) {
            className = 'incorrect selected';
        } else if (isSelected && isCorrect) {
            className = 'correct selected'; // Correctly answered, but still highlight as correct
        }
        return `
            <div class="choice-btn ${className}">
                <span class="choice-letter">${choiceLetters[choiceIndex]}</span>
                <span class="choice-text">${choice.text}</span>
            </div>
        `;
    }).join('');
    return `
        ${groupHeader}
        <div class="question-card review-card ${statusClass} ${isFlagged ? 'flagged' : ''}" id="review-question-${index}" data-index="${index}">
            <div class="question-header">
                <span class="question-number">Question ${displayIndex} 
                    <span class="feature-badge" style="background: ${isCorrect ? 'var(--success-color)' : 'var(--danger-color)'};">${statusText.toUpperCase()}</span>
                    ${isFlagged ? '<span class="feature-badge" style="background: var(--warning-color);">FLAGGED</span>' : ''}
                </span>
                <p class="question-group">${question.topic || 'No Topic'}</p>
            </div>
            ${groupHeader ? '' : `<p class="question-stem">${stemContent}</p>`}
            ${question.image && !groupHeader ? `<div class="question-image">
                <img src="${question.image}" alt="Figure for Question ${index + 1}" data-src="${question.image}" />
            </div>` : ''}
            <div class="choices-container">
                ${choicesHtml}
            </div>
            <div class="solution-container">
                <p class="solution-title">Solution</p>
                <p class="solution-text whitespace-pre-wrap">${question.solution || 'No detailed solution provided.'}</p>
            </div>
            ${noteContent || timeSpent > 0 ? `
            <div class="note-container">
                <div class="note-header">
                    <span>Your Details</span>
                </div>
                ${noteContent ? `<p style="white-space: pre-wrap;"><strong>Your Notes:</strong> ${noteContent}</p>` : ''}
                <p><strong>Time Spent:</strong> ${formatTime(timeSpent)}</p>
            </div>
            ` : ''}
        </div>
    `;
}
function attachReviewEventListeners() {
    // Image zoom
    document.querySelectorAll('.question-image img').forEach(img => {
        img.addEventListener('click', handleImageZoom);
    });
}
function toggleReviewNavMode() {
    const isStepMode = document.body.classList.contains('nav-step');
    if (isStepMode) {
        // Switch to scroll
        document.body.classList.remove('nav-step');
        document.getElementById('btn-review-nav-mode').textContent = 'View Step-by-Step';
        // Clear active question class
        document.querySelectorAll('.question-card').forEach(card => card.classList.remove('active-question'));
        // Re-enable jump button
        document.getElementById('btn-jump-wrong').classList.remove('hidden');
    } else {
        // Switch to step
        document.body.classList.add('nav-step');
        document.getElementById('btn-review-nav-mode').textContent = 'View All (Scroll)';
        // Jump to the first question
        goToReviewQuestion(0);
        // Hide jump button
        document.getElementById('btn-jump-wrong').classList.add('hidden');
    }
}
function goToReviewQuestion(index) {
    const total = appState.examQuestions.length;
    if (index < 0 || index >= total) return;
    const allReviewCards = document.querySelectorAll('.question-card.review-card');
    allReviewCards.forEach(card => card.classList.remove('active-question'));
    document.getElementById(`review-question-${index}`).classList.add('active-question');
    // Navigation buttons for review step mode (re-using exam buttons, but in a hidden container)
    const container = document.getElementById('screen-review').querySelector('.action-buttons');
    if (!container.querySelector('#btn-review-prev')) {
        container.innerHTML = `
            <div class="nav-buttons" style="width: 100%;">
                <button type="button" id="btn-review-prev" class="btn btn-secondary" style="width: 48%;">
                    <svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    Previous
                </button>
                <button type="button" id="btn-review-next" class="btn btn-primary" style="width: 48%;">
                    Next
                    <svg class="icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
            <button type="button" id="btn-review-back" class="btn btn-secondary">Back to Main Menu</button>
        ` + container.innerHTML;
        document.getElementById('btn-review-prev').onclick = () => goToReviewQuestion(index - 1);
        document.getElementById('btn-review-next').onclick = () => goToReviewQuestion(index + 1);
    }
    document.getElementById('btn-review-prev').classList.toggle('hidden', index === 0);
    document.getElementById('btn-review-next').classList.toggle('hidden', index === total - 1);
    document.getElementById('btn-review-back').style.display = 'block'; // Ensure back button is visible
}
// ======================
// SETTINGS MODAL
// ======================
function renderSettingsModal() {
    document.getElementById('theme-select').value = appState.settings.theme;
    document.getElementById('font-size-select').value = appState.settings.fontSize;
    document.getElementById('navigation-mode-select').value = appState.settings.navigationMode;
    document.getElementById('show-timer').checked = appState.settings.showTimer;
    document.getElementById('show-progress').checked = appState.settings.showProgress;
    document.getElementById('randomize-questions-setting').checked = appState.settings.randomizeQuestions;
    document.getElementById('show-difficulty').checked = appState.settings.showDifficulty;
    document.getElementById('theme-select').onchange = updateSettings;
    document.getElementById('font-size-select').onchange = updateSettings;
    document.getElementById('navigation-mode-select').onchange = updateSettings;
    document.getElementById('show-timer').onchange = updateSettings;
    document.getElementById('show-progress').onchange = updateSettings;
    document.getElementById('randomize-questions-setting').onchange = updateSettings;
    document.getElementById('show-difficulty').onchange = updateSettings;
    document.getElementById('btn-close-settings').onclick = () => {
        document.getElementById('settings-modal').classList.add('hidden');
    };
}
function updateSettings() {
    const newSettings = {
        theme: document.getElementById('theme-select').value,
        fontSize: document.getElementById('font-size-select').value,
        navigationMode: document.getElementById('navigation-mode-select').value,
        showTimer: document.getElementById('show-timer').checked,
        showProgress: document.getElementById('show-progress').checked,
        randomizeQuestions: document.getElementById('randomize-questions-setting').checked,
        showDifficulty: document.getElementById('show-difficulty').checked
    };
    appState.settings = newSettings;
    applySettings(newSettings);
}
function applySettings(settings) {
    // Theme
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(settings.theme);
    // Font Size
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${settings.fontSize}`);
    // Navigation Mode
    document.body.classList.remove('nav-scroll', 'nav-step');
    document.body.classList.add(`nav-${settings.navigationMode}`);
    // Re-render the exam if we're on it to apply navigation mode changes
    if (appState.view === 'exam') {
        renderExam();
    }
}
// ======================
// FALLBACKS (for local demo without question_bank.json)
// ======================
function getFallbackQuestions() {
    // Provides a minimal set of questions for testing if question_bank.json fails to load.
    const questions = [];
    let idCounter = 1;
    Object.keys(SECTIONS).forEach(sectionKey => {
        for (let i = 0; i < 5; i++) {
            questions.push({
                id: `Q${idCounter++}`,
                section: sectionKey,
                topic: SECTIONS[sectionKey].topics[0],
                difficulty: ['easy', 'medium', 'hard'][i % 3],
                stem: `[${sectionKey} Fallback Q${i+1}] A typical problem in ${SECTIONS[sectionKey].topics[0]} might ask for...`,
                choices: [
                    { text: "Option A" },
                    { text: "Option B" },
                    { text: "Option C - Correct" },
                    { text: "Option D" }
                ],
                answer: 2,
                solution: "This is the default solution for the fallback question. Assume the third choice is correct."
            });
        }
    });
    return questions;
}
function getSampleQuestions(sectionName) {
    return getFallbackQuestions().filter(q => q.section === sectionName).slice(0, SECTION_REQUIREMENTS[sectionName].total);
}
function getDifficultyColor(difficulty) {
    switch (difficulty) {
        case 'easy': return '#10b981'; // green
        case 'medium': return '#f59e0b'; // amber
        case 'hard': return '#dc2626'; // red
        default: return '#6b7280'; // gray
    }
}
// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved settings
    applySettings(appState.settings);
    // Show loading screen
    showScreen('loading');
    // Load question bank
    loadQuestionBank();
    setTimeout(() => showScreen('main-menu'), 1000);
    // Close modal on image click
    const closeImageModal = document.getElementById('close-image-modal');
    if (closeImageModal) {
        closeImageModal.onclick = () => {
            document.getElementById('image-modal').classList.add('hidden');
        };
    }
    // Prevent default form submission
    document.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
});
