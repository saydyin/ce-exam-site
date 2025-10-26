// ======================
// CONFIGURATION
// ======================
const SECTIONS = {
    AMSTHEC: {
        name: "AMSTHEC",
        title: "Mathematics, Surveying & Transportation Engineering",
        total: 75,
        time: 5 * 60 * 60 // 5 hours in seconds
    },
    HPGE: {
        name: "HPGE",
        title: "Hydraulics & Geotechnical Engineering",
        total: 50,
        time: 4 * 60 * 60 // 4 hours in seconds
    },
    PSAD: {
        name: "PSAD",
        title: "Structural Design & Construction",
        total: 75,
        time: 5 * 60 * 60 // 5 hours in seconds
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
        navigationMode: 'scroll'
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
        appState.fullQuestionBank = questionBank;
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
    const sectionQuestions = appState.fullQuestionBank.filter(q => q.section === sectionName);
    const processedQuestions = processQuestionsWithGroups(sectionQuestions);
    const requiredTotal = SECTION_REQUIREMENTS[sectionName].total;
    return processedQuestions.slice(0, requiredTotal);
}

function processQuestionsWithGroups(questions) {
    const groupMap = {};
    questions.forEach(question => {
        const gid = question.group_id;
        if (gid) {
            if (!groupMap[gid]) groupMap[gid] = [];
            groupMap[gid].push(question);
        } else {
            const tempId = `__single_${Math.random().toString(36).substring(2, 10)}`;
            groupMap[tempId] = [question];
        }
    });
    const validGroups = [];
    const standaloneQuestions = [];
    Object.entries(groupMap).forEach(([gid, group]) => {
        if (group.length === 3 && gid !== '__single_undefined' && !gid.startsWith('__single_')) {
            const hasSituationStem = group.some(q => q.stem.trim().startsWith('Situation'));
            if (hasSituationStem) {
                const sortedGroup = [...group].sort((a, b) => 
                    a.stem.trim().startsWith('Situation') ? -1 : 
                    b.stem.trim().startsWith('Situation') ? 1 : 0
                );
                validGroups.push(sortedGroup);
            } else {
                standaloneQuestions.push(...group);
            }
        } else {
            standaloneQuestions.push(...group);
        }
    });
    const shuffledGroups = shuffleArray(validGroups);
    const shuffledSingles = shuffleArray(standaloneQuestions);
    let result = [];
    let singleIndex = 0;
    if (shuffledGroups.length > 0) {
        shuffledGroups.forEach((group, i) => {
            result.push(...group);
            const toAdd = Math.min(2, shuffledSingles.length - singleIndex);
            for (let j = 0; j < toAdd; j++) {
                result.push(shuffledSingles[singleIndex++]);
            }
        });
        while (singleIndex < shuffledSingles.length) {
            result.push(shuffledSingles[singleIndex++]);
        }
    } else {
        result = shuffledSingles;
    }
    const checkLastN = 5;
    const tail = result.slice(-checkLastN);
    const badIndex = tail.findIndex(q => q.stem.trim().startsWith('Situation'));
    if (badIndex !== -1) {
        const badQ = result[result.length - checkLastN + badIndex];
        const badGroupId = badQ.group_id;
        if (badGroupId) {
            const fullGroup = result.filter(q => q.group_id === badGroupId);
            const remaining = result.filter(q => q.group_id !== badGroupId);
            const insertPos = Math.max(3, Math.floor(remaining.length / 2));
            remaining.splice(insertPos, 0, ...fullGroup);
            result = remaining;
        }
    }
    const groupSizeMap = {};
    result.forEach(q => {
        const gid = q.group_id;
        if (gid) {
            groupSizeMap[gid] = (groupSizeMap[gid] || 0) + 1;
        }
    });
    result.forEach(q => {
        const gid = q.group_id;
        const groupSize = groupSizeMap[gid];
        const isSituation = q.stem.trim().startsWith('Situation') || result.some(g => g.group_id === gid && g.stem.trim().startsWith('Situation'));
        if (groupSize !== 3 || !isSituation) {
            q.group_id = null;
        }
    });
    return result;
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

function saveState() {
    localStorage.setItem('examAnswers', JSON.stringify(appState.answers));
    localStorage.setItem('examResults', JSON.stringify(appState.results));
    localStorage.setItem('examSettings', JSON.stringify(appState.settings));
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
        } else if (screenId === 'analytics') {
            renderAnalyticsScreen();
        } else if (screenId === 'results') {
            // Results are rendered by submitExam(), so nothing to do here
        } else if (screenId === 'review') {
            // Handled by showReviewScreen()
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
    appState.timerInterval = setInterval(() => {
        appState.timeLeft--;
        if (document.getElementById('exam-timer')) {
            document.getElementById('exam-timer').textContent = formatTime(appState.timeLeft);
        }
        if (appState.timeLeft <= 0) {
            clearInterval(appState.timerInterval);
            submitExam();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(appState.timerInterval);
    appState.isPaused = true;
    saveState();
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
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examResults');
    localStorage.removeItem('examSettings');
    Object.keys(SECTIONS).forEach(sectionName => {
        localStorage.removeItem(`examQuestions_${sectionName}`);
    });
    showScreen('main-menu');
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
                    <span>${['📐','🗺️','📊'][idx % 3]}</span>
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
    document.getElementById('btn-full-mock').addEventListener('click', startFullMockExam);
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btn-analytics').addEventListener('click', () => showScreen('analytics'));
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
    const section = SECTIONS[appState.currentSection];
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
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.id = `question-${index}`;
        if (appState.settings.navigationMode === 'step' && index === 0) {
            questionCard.classList.add('active-question');
        }

        questionCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    ${question.group_id && question.stem.trim().startsWith('Situation') ? `<p class="question-group">Situation: ${question.group_id}</p>` : (question.group_id ? `<p class="question-group">Problem from Situation ${question.group_id}</p>` : '')}
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

    document.getElementById('btn-submit-exam').onclick = () => {
        showConfirmModal(
            "Confirm Submission",
            "Are you sure you want to submit this exam section? You won't be able to change your answers after submission.",
            submitExam
        );
    };

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
        showConfirmModal(
            "Section Completed",
            "You have reached the end of the section. Do you want to submit your exam now?",
            submitExam
        );
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
// SUBMIT EXAM
// ======================
function submitExam() {
    clearInterval(appState.timerInterval);
    const sectionName = appState.currentSection;
    const questions = appState.examQuestions;
    const answers = appState.answers[sectionName];
    
    let correctCount = 0;
    const wrongAnswers = [];
    
    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (userAnswer === question.correct_answer) {
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
                group_id: question.group_id
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
        timestamp: new Date().toISOString()
    };
    
    appState.isPaused = false;
    saveState();
    showResultsScreen(sectionName);
}

// ======================
// RESULTS SCREEN
// ======================
function showResultsScreen(sectionName) {
    const result = appState.results[sectionName];
    const section = SECTIONS[sectionName];
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
                        <span>${choice}</span>
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
            `;
            wrongAnswersList.appendChild(wrongCard);
        });
    } else {
        wrongAnswersSection.classList.add('hidden');
    }
    
    // Set up button actions
    document.getElementById('btn-results-main-menu').onclick = () => showScreen('main-menu');
    document.getElementById('btn-review-section').onclick = () => showReviewScreen(sectionName);
    
    // Show the screen
    showScreen('results');
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
    const section = SECTIONS[sectionName];
    
    // Update screen elements
    document.getElementById('review-section-title').textContent = section.title;
    document.getElementById('review-progress').textContent = `Reviewing all ${appState.examQuestions.length} questions`;
    
    const container = document.getElementById('review-questions-container');
    container.innerHTML = '';
    
    appState.examQuestions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        const isAnswered = userAnswer !== null;
        const resultIndicator = isAnswered 
            ? (isCorrect ? '✅ Correct' : '❌ Wrong') 
            : '❓ Skipped';
        
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
                    ${question.group_id && question.stem.trim().startsWith('Situation') ? `<p class="question-group">Situation: ${question.group_id}</p>` : (question.group_id ? `<p class="question-group">Problem from Situation ${question.group_id}</p>` : '')}
                    <p class="result-indicator" style="font-weight: bold; margin-top: 0.25rem; color: ${isCorrect ? 'var(--success-color)' : (isAnswered ? 'var(--danger-color)' : 'var(--warning-color)')}">${resultIndicator}</p>
                </div>
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}"></div>` : ''}
            <div class="choices-container">${choicesHtml}</div>
            <div class="answer-comparison" style="margin-top: 1.5rem;">
                <p class="correct-answer">Correct Answer: ${question.correct_answer}</p>
                ${isAnswered ? `<p class="user-answer">Your Answer: ${userAnswer}</p>` : ''}
            </div>
            ${question.explanation ? `<div class="explanation"><p class="explanation-title">Explanation:</p><p class="whitespace-pre-wrap">${question.explanation}</p></div>` : ''}
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
    
    // Set up button actions
    document.getElementById('btn-review-back').onclick = () => showScreen('main-menu');
    
    // Show the screen
    showScreen('review');
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
// ANALYTICS SCREEN
// ======================
function renderAnalyticsScreen() {
    const sectionCards = [];
    
    // Calculate overall stats
    let totalQuestions = 0;
    let totalCorrect = 0;
    let completedSections = 0;
    
    Object.keys(SECTIONS).forEach(sectionName => {
        const result = appState.results[sectionName];
        if (result) {
            completedSections++;
            totalQuestions += result.total;
            totalCorrect += result.correct;
            
            const section = SECTIONS[sectionName];
            const score = result.score_pct.toFixed(1);
            const passed = result.score_pct >= 70;
            
            sectionCards.push(`
                <div class="analytics-section-card">
                    <h3>${section.title}</h3>
                    <div class="analytics-score ${passed ? 'text-green-500' : 'text-red-500'}">${score}%</div>
                    <div class="analytics-stats-list">
                        <div class="analytics-stat-item">
                            <span>Questions:</span>
                            <span>${result.correct}/${result.total}</span>
                        </div>
                        <div class="analytics-stat-item">
                            <span>Date Completed:</span>
                            <span>${new Date(result.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `);
        }
    });
    
    // Update overall stats
    const overallScore = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100).toFixed(1) : '0.0';
    document.getElementById('overall-score').textContent = `Overall Score: ${overallScore}%`;
    document.getElementById('overall-correct').textContent = `${totalCorrect} correct out of ${totalQuestions} questions`;
    
    // Update section analytics
    document.getElementById('section-analytics-list').innerHTML = sectionCards.join('');
    
    // Render chart if we have data
    if (completedSections > 0) {
        const ctx = document.getElementById('overall-chart').getContext('2d');
        const sectionNames = [];
        const scores = [];
        
        Object.keys(SECTIONS).forEach(sectionName => {
            if (appState.results[sectionName]) {
                sectionNames.push(SECTIONS[sectionName].name);
                scores.push(appState.results[sectionName].score_pct);
            }
        });
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sectionNames,
                datasets: [{
                    label: 'Score (%)',
                    data: scores,
                    backgroundColor: sectionNames.map(name => 
                        appState.results[name].score_pct >= 70 ? '#10b981' : '#dc2626'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage'
                        }
                    }
                }
            }
        });
    }
    
    // Set up back button
    document.getElementById('btn-analytics-back').onclick = () => showScreen('main-menu');
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
    
    // Back button
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('main-menu'));
}

// ======================
// PDF GENERATION
// ======================
function generateOfflinePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    let yPos = 20;
    
    // Add title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Civil Engineering Exam Simulator', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Add instructions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a printable version of the exam simulator for offline use.', 20, yPos);
    yPos += 8;
    doc.text('You can use this to study or practice without internet connection.', 20, yPos);
    yPos += 15;
    
    // Add sections
    Object.values(SECTIONS).forEach((section, sectionIndex) => {
        // Section title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Section ${sectionIndex + 1}: ${section.title}`, 20, yPos);
        yPos += 10;
        
        // Add questions
        const questions = getQuestionsForSection(section.name);
        questions.forEach((question, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            
            // Question number
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Question ${index + 1}:`, 20, yPos);
            yPos += 6;
            
            // Question stem
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const stemLines = doc.splitTextToSize(question.stem, 170);
            doc.text(stemLines, 20, yPos);
            yPos += stemLines.length * 5;
            
            // Choices
            question.choices.forEach((choice, choiceIndex) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                const letter = String.fromCharCode(65 + choiceIndex);
                doc.text(`${letter}. ${choice}`, 25, yPos);
                yPos += 6;
            });
            
            yPos += 10;
        });
        
        yPos += 20;
    });
    
    // Save PDF
    doc.save('civil-engineering-exam.pdf');
}

// ======================
// OTHER UTILITIES
// ======================
function startFullMockExam() {
    // Implementation for full mock exam
    showConfirmModal(
        "Full Mock Exam",
        "Starting a full mock exam will combine all sections into one continuous exam. Are you sure you want to proceed?",
        () => {
            alert("Full mock exam feature is not implemented in this version. This is a placeholder.");
        }
    );
}

function getFallbackQuestions() {
    return [
        {
            id: 1,
            section: "AMSTHEC",
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
    document.getElementById('close-image-modal').onclick = () => {
        document.getElementById('image-modal').classList.add('hidden');
    };
    
    // Prevent default form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', e => e.preventDefault());
    });
});
