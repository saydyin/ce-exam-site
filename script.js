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
    bookmarks: JSON.parse(localStorage.getItem('examBookmarks')) || [],
    currentSection: null,
    timeLeft: 0,
    timerInterval: null,
    examQuestions: [],
    reviewingSection: null,
    fullQuestionBank: []
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
        const groupKey = question.group_id || `single-${Math.random().toString(36).substring(2, 8)}`;
        if (!groupMap[groupKey]) {
            groupMap[groupKey] = [];
        }
        groupMap[groupKey].push(question);
    });
    const processedGroups = Object.values(groupMap).map(group => {
        const situationQuestion = group.find(q => q.stem.trim().startsWith('Situation'));
        if (situationQuestion) {
            const otherQuestions = group.filter(q => q !== situationQuestion);
            return [situationQuestion, ...otherQuestions];
        }
        return group;
    });
    const shuffledGroups = shuffleArray(processedGroups);
    let orderedQuestions = shuffledGroups.flat();
    const checkLastN = 5;
    const badIndex = orderedQuestions
        .slice(-checkLastN)
        .findIndex(q => q.stem.trim().startsWith('Situation'));
    if (badIndex !== -1) {
        const situationQ = orderedQuestions[orderedQuestions.length - checkLastN + badIndex];
        const situationGroupId = situationQ.group_id;
        const remaining = orderedQuestions.filter(q => q.group_id !== situationGroupId);
        const movedGroup = orderedQuestions.filter(q => q.group_id === situationGroupId);
        const insertPos = Math.floor(remaining.length / 2);
        remaining.splice(insertPos, 0, ...movedGroup);
        orderedQuestions = remaining;
    }
    return orderedQuestions;
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
    localStorage.setItem('examBookmarks', JSON.stringify(appState.bookmarks));
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
        }
    }
}

// ======================
// BOOKMARKS - FIXED
// ======================
function toggleBookmark(section, questionIndex) {
    const bookmarkId = `${section}-${questionIndex}`;
    const existingIndex = appState.bookmarks.findIndex(b => b.id === bookmarkId);
    if (existingIndex > -1) {
        appState.bookmarks.splice(existingIndex, 1);
    } else {
        appState.bookmarks.push({
            id: bookmarkId,
            section: section,
            questionIndex: questionIndex,
            timestamp: new Date().toISOString()
        });
    }
    saveState();
    return existingIndex === -1; // true = just bookmarked
}

// ======================
// TIMER & QUESTION LOADING - FIXED
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
    // ✅ Always reset timer to full section time
    appState.timeLeft = SECTIONS[sectionName].time;
    if (document.getElementById('exam-timer')) {
        document.getElementById('exam-timer').textContent = formatTime(appState.timeLeft);
    }
    startTimer();
}

function startTimer() {
    clearInterval(appState.timerInterval);
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

// ======================
// RESET - Now also clears saved questions
// ======================
function resetExam() {
    if (!confirm('Are you sure you want to reset all exam data? This cannot be undone.')) return;
    clearInterval(appState.timerInterval);
    appState.answers = {};
    appState.results = {};
    appState.bookmarks = [];
    appState.timeLeft = 0;
    appState.currentSection = null;
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examResults');
    localStorage.removeItem('examBookmarks');
    // ✅ Clear saved questions so new exam = fresh shuffle
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
        const score = isCompleted ? appState.results[section.name].score_pct : null;
        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
            <div class="section-card-header">
                <h2 class="section-card-title">
                    <span>${['📐','🗺️','📊'][idx % 3]}</span>
                    ${section.name}
                </h2>
                ${isCompleted ? `<span class="section-card-score">${score.toFixed(1)}%</span>` : ''}
            </div>
            <p class="section-card-description">${section.title}</p>
            <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}" data-action="${isCompleted ? 'review' : 'start'}" data-section="${section.name}">
                ${isCompleted ? 'Review Section' : 'Start Section'}
            </button>
            ${isCompleted ? `
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${score}%"></div>
                </div>
            ` : ''}
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('[data-action="start"]').forEach(btn => {
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

    document.getElementById('btn-full-mock').addEventListener('click', startFullMockExam);
    document.getElementById('btn-settings').addEventListener('click', showSettingsScreen);
    document.getElementById('btn-bookmarks').addEventListener('click', showBookmarksScreen);
    document.getElementById('btn-analytics').addEventListener('click', showAnalyticsScreen);
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
    document.getElementById('btn-instructions-back').onclick = () => showScreen('main-menu');
    document.getElementById('btn-start-exam').onclick = () => {
        loadQuestionsForSection(appState.currentSection);
        showScreen('exam');
    };
}

// ======================
// EXAM SCREEN - FIXED BOOKMARK UI
// ======================
function renderExam() {
    const section = SECTIONS[appState.currentSection];
    const totalQuestions = appState.examQuestions.length;
    document.getElementById('exam-section-title').textContent = section.title;
    document.getElementById('exam-progress').textContent = `Question 1 of ${totalQuestions}`;
    const container = document.getElementById('exam-questions-container');
    container.innerHTML = '';
    appState.examQuestions.forEach((question, index) => {
        const userAnswer = appState.answers[appState.currentSection][index];
        const isBookmarked = appState.bookmarks.some(b => 
            b.section === appState.currentSection && b.questionIndex === index
        );
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.id = `question-${index}`;
        const bookmarkIcon = isBookmarked ? '🔖' : '📖';
        const bookmarkClass = isBookmarked ? 'btn-primary' : 'btn-secondary';
        questionCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    ${question.group_id ? `<p class="question-group">Situation: ${question.group_id}</p>` : ''}
                </div>
                <button class="btn ${bookmarkClass} btn-sm" data-bookmark="${index}">
                    ${bookmarkIcon}
                </button>
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `
                <div class="question-image">
                    <img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}">
                </div>
            ` : ''}
            <div class="choices-container">
                ${question.choices.map((choice, choiceIndex) => {
                    const letter = String.fromCharCode(65 + choiceIndex);
                    const isSelected = userAnswer === letter;
                    return `
                        <button class="choice-btn ${isSelected ? 'selected' : ''}" data-question="${index}" data-choice="${letter}">
                            <span class="choice-letter">${letter}.</span>
                            <span>${choice.trim()}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(questionCard);
    });

    // ✅ Fixed bookmark event listener
    document.querySelectorAll('[data-bookmark]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const index = parseInt(button.dataset.bookmark);
            const isNowBookmarked = toggleBookmark(appState.currentSection, index);
            button.className = `btn ${isNowBookmarked ? 'btn-primary' : 'btn-secondary'} btn-sm`;
            button.innerHTML = isNowBookmarked ? '🔖' : '📖';
        });
    });

    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.choice-btn');
            const questionIndex = parseInt(btnEl.dataset.question);
            const choice = btnEl.dataset.choice;
            selectAnswer(questionIndex, choice);
            const questionCard = document.getElementById(`question-${questionIndex}`);
            questionCard.querySelectorAll('.choice-btn').forEach(choiceBtn => {
                choiceBtn.classList.remove('selected');
            });
            btnEl.classList.add('selected');
        });
    });

    document.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });

    document.getElementById('btn-pause-resume').onclick = () => {
        clearInterval(appState.timerInterval);
        showScreen('main-menu');
    };

    document.getElementById('btn-submit-exam').onclick = () => {
        showConfirmModal(
            "Confirm Submission",
            "Are you sure you want to submit this exam section? You won't be able to change your answers after submission.",
            submitExam
        );
    };
}

function selectAnswer(questionIndex, choice) {
    if (appState.currentSection === null) return;
    appState.answers[appState.currentSection][questionIndex] = choice;
    saveState();
}

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
                figure: question.figure
            });
        }
    });
    const score_pct = (correctCount / questions.length) * 100;
    appState.results[sectionName] = {
        score_pct,
        correct: correctCount,
        total: questions.length,
        wrong: wrongAnswers
    };
    saveState();
    showResultsScreen(sectionName);
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

    const handleCancel = () => {
        document.getElementById('confirm-modal').classList.add('hidden');
        cancelBtn.removeEventListener('click', handleCancel);
        okBtn.removeEventListener('click', handleConfirm);
    };

    const handleConfirm = () => {
        onConfirm();
        handleCancel();
    };

    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleConfirm);
}

// ======================
// RESULTS SCREEN
// ======================
function showResultsScreen(sectionName) {
    const result = appState.results[sectionName];
    const passed = result.score_pct >= 70;
    const screen = document.createElement('div');
    screen.id = 'screen-results';
    screen.className = 'screen';
    screen.innerHTML = `
        <div class="container">
            <div class="results-header">
                <h1>Section Results: ${SECTIONS[sectionName].title}</h1>
            </div>
            <div class="card results-score">
                <p class="score-percentage ${passed ? 'score-passed' : 'score-failed'}">${result.score_pct.toFixed(2)}%</p>
                <p class="score-details">${result.correct} / ${result.total} Correct</p>
                <p class="score-status ${passed ? 'score-passed' : 'score-failed'}">${passed ? 'PASSED' : 'FAILED'}</p>
            </div>
            <div class="action-buttons">
                <button id="btn-review-all" class="btn">Review All Questions</button>
                <button id="btn-continue" class="btn btn-primary">Continue</button>
            </div>
            ${result.wrong.length > 0 ? `
                <div class="wrong-answers-section">
                    <h2 class="wrong-answers-title">Incorrect Answers Review</h2>
                    <div id="wrong-answers-list"></div>
                </div>
            ` : ''}
            <button id="btn-back-to-main" class="btn btn-secondary">Back to Main Menu</button>
        </div>
    `;
    document.body.appendChild(screen);
    showScreen('results');

    if (result.wrong.length > 0) {
        const list = document.getElementById('wrong-answers-list');
        result.wrong.forEach(wrong => {
            const card = document.createElement('div');
            card.className = 'wrong-answer-card';
            let choicesHtml = '';
            wrong.choices.forEach((choice, index) => {
                const letter = String.fromCharCode(65 + index);
                const isCorrect = letter === wrong.correct_answer;
                const isUser = letter === wrong.user_answer;
                let choiceClass = 'choice-btn';
                if (isCorrect) choiceClass += ' bg-green-100 border-green-500';
                else if (isUser) choiceClass += ' bg-red-100 border-red-500';
                choicesHtml += `
                    <div class="${choiceClass}">
                        <span class="choice-letter">${letter}.</span>
                        <span>${choice}</span>
                    </div>
                `;
            });
            card.innerHTML = `
                <div class="question-header">
                    <p class="question-number">Question ${wrong.number}</p>
                </div>
                <p class="question-stem whitespace-pre-wrap">${wrong.stem}</p>
                ${wrong.figure ? `
                    <div class="question-image">
                        <img src="${wrong.figure}" alt="Figure for question ${wrong.number}" data-figure="${wrong.figure}">
                    </div>
                ` : ''}
                <div class="choices-container">${choicesHtml}</div>
                <div class="answer-comparison">
                    <p class="user-answer">Your Answer: ${wrong.user_answer || "Not Answered"}</p>
                    <p class="correct-answer">Correct Answer: ${wrong.correct_answer}</p>
                    ${wrong.explanation ? `
                        <div class="explanation">
                            <p class="explanation-title">Explanation:</p>
                            <p>${wrong.explanation}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            list.appendChild(card);
        });
        list.querySelectorAll('img[data-figure]').forEach(img => {
            img.addEventListener('click', () => {
                document.getElementById('zoomed-image').src = img.src;
                document.getElementById('image-modal').classList.remove('hidden');
            });
        });
    }

    document.getElementById('btn-review-all').onclick = () => {
        screen.remove();
        showReviewScreen(sectionName);
    };
    document.getElementById('btn-continue').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
    document.getElementById('btn-back-to-main').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
}

// ======================
// REVIEW SCREEN
// ======================
function showReviewScreen(sectionName) {
    const savedKey = `examQuestions_${sectionName}`;
    const savedQuestions = localStorage.getItem(savedKey);
    let questions = savedQuestions ? JSON.parse(savedQuestions) : getQuestionsForSection(sectionName);
    const answers = appState.answers[sectionName] || [];
    const screen = document.createElement('div');
    screen.id = 'screen-review';
    screen.className = 'screen';
    screen.innerHTML = `
        <div class="container">
            <div class="card">
                <div class="question-header">
                    <div>
                        <h1>Review Answers</h1>
                        <p class="section-subtitle">${SECTIONS[sectionName].title}</p>
                    </div>
                    <button id="btn-review-back" class="btn btn-secondary">Back</button>
                </div>
                <div id="review-questions-list"></div>
            </div>
        </div>
    `;
    document.body.appendChild(screen);
    showScreen('review');
    const list = document.getElementById('review-questions-list');
    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        const card = document.createElement('div');
        card.className = 'question-card';
        let choicesHtml = '';
        question.choices.forEach((choice, choiceIndex) => {
            const letter = String.fromCharCode(65 + choiceIndex);
            const isCorrectAnswer = letter === question.correct_answer;
            const isUserAnswer = letter === userAnswer;
            let choiceClass = 'choice-btn';
            if (isCorrectAnswer) choiceClass += ' bg-green-100 border-green-500';
            else if (isUserAnswer && !isCorrect) choiceClass += ' bg-red-100 border-red-500';
            choicesHtml += `
                <div class="${choiceClass}">
                    <span class="choice-letter">${letter}.</span>
                    <span>${choice}</span>
                </div>
            `;
        });
        card.innerHTML = `
            <div class="question-header">
                <p class="question-number">Question ${index + 1}</p>
                ${question.group_id ? `<p class="question-group">Situation: ${question.group_id}</p>` : ''}
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ? `
                <div class="question-image">
                    <img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}">
                </div>
            ` : ''}
            <div class="choices-container">${choicesHtml}</div>
            <div class="answer-comparison">
                <p>Your Answer: <span class="${isCorrect ? 'correct-answer' : 'user-answer'}">${userAnswer || "Not Answered"}</span></p>
                <p class="correct-answer">Correct Answer: ${question.correct_answer}</p>
                ${question.explanation ? `
                    <div class="explanation">
                        <p class="explanation-title">Explanation:</p>
                        <p>${question.explanation}</p>
                    </div>
                ` : ''}
            </div>
        `;
        list.appendChild(card);
    });
    list.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });
    document.getElementById('btn-review-back').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
}

// ======================
// OTHER SCREENS
// ======================
function showSettingsScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-settings';
    screen.className = 'screen';
    screen.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 class="section-title">Settings</h1>
                <div class="settings-options">
                    <div class="setting-item">
                        <label>Theme</label>
                        <select id="setting-theme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Font Size</label>
                        <select id="setting-font">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                        </select>
                    </div>
                </div>
                <div class="action-buttons">
                    <button id="btn-settings-back" class="btn btn-secondary">Back to Main Menu</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(screen);
    showScreen('settings');
    document.getElementById('setting-theme').value = appState.settings.theme;
    document.getElementById('setting-font').value = appState.settings.fontSize;
    document.getElementById('setting-theme').onchange = (e) => {
        appState.settings.theme = e.target.value;
        document.documentElement.classList.toggle('dark', appState.settings.theme === 'dark');
        saveState();
    };
    document.getElementById('setting-font').onchange = (e) => {
        appState.settings.fontSize = e.target.value;
        saveState();
    };
    document.getElementById('btn-settings-back').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
}

function showBookmarksScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-bookmarks';
    screen.className = 'screen';
    let content = `
        <div class="container">
            <h1 class="section-title">📖 Bookmarked Questions</h1>
    `;
    if (appState.bookmarks.length === 0) {
        content += `<div class="card text-center"><p>No bookmarks yet.</p></div>`;
    } else {
        content += '<div class="bookmarks-list">';
        appState.bookmarks.forEach(bookmark => {
            content += `
                <div class="card bookmark-item">
                    <div class="bookmark-info">
                        <span>${bookmark.section} – Q${bookmark.questionIndex + 1}</span>
                        <button class="btn btn-secondary btn-sm" data-go="${bookmark.section}-${bookmark.questionIndex}">Go</button>
                    </div>
                </div>
            `;
        });
        content += '</div>';
    }
    content += `
            <div class="action-buttons">
                ${appState.bookmarks.length > 0 ? '<button id="btn-clear-bookmarks" class="btn btn-danger">Clear All</button>' : ''}
                <button id="btn-bookmarks-back" class="btn btn-secondary">Back to Main Menu</button>
            </div>
        </div>
    `;
    screen.innerHTML = content;
    document.body.appendChild(screen);
    showScreen('bookmarks');
    document.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const [section, index] = e.target.dataset.go.split('-');
            appState.currentSection = section;
            loadQuestionsForSection(section);
            showScreen('exam');
            setTimeout(() => {
                const el = document.getElementById(`question-${index}`);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });
    });
    if (appState.bookmarks.length > 0) {
        document.getElementById('btn-clear-bookmarks').onclick = () => {
            appState.bookmarks = [];
            saveState();
            screen.remove();
            showBookmarksScreen();
        };
    }
    document.getElementById('btn-bookmarks-back').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
}

function showAnalyticsScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-analytics';
    screen.className = 'screen';
    let content = `<div class="container"><h1 class="section-title">Performance Analytics</h1>`;
    if (Object.keys(appState.results).length === 0) {
        content += `<div class="card text-center"><h2>No Analytics Available</h2><p>Complete at least one exam section...</p></div>`;
    } else {
        content += '<div class="analytics-grid">';
        Object.keys(appState.results).forEach(sectionName => {
            const result = appState.results[sectionName];
            const section = SECTIONS[sectionName];
            const passed = result.score_pct >= 70;
            content += `
                <div class="card analytics-card">
                    <h2>${section.title}</h2>
                    <p class="section-subtitle">${section.name}</p>
                    <div class="analytics-score">
                        <p class="score-percentage ${passed ? 'score-passed' : 'score-failed'}">${result.score_pct.toFixed(2)}%</p>
                        <p>${result.correct} / ${result.total} Correct</p>
                    </div>
                    <div class="analytics-details">
                        <div class="detail-item"><span>Correct Answers:</span><span>${result.correct}</span></div>
                        <div class="detail-item"><span>Incorrect Answers:</span><span>${result.wrong.length}</span></div>
                        <div class="detail-item"><span>Unanswered:</span><span>${result.total - result.correct - result.wrong.length}</span></div>
                    </div>
                    <button class="btn btn-text" data-review="${sectionName}">Review Wrong Answers</button>
                </div>
            `;
        });
        content += '</div>';
    }
    content += `<div class="action-buttons"><button id="btn-analytics-back" class="btn btn-secondary">Back to Main Menu</button></div></div>`;
    screen.innerHTML = content;
    document.body.appendChild(screen);
    showScreen('analytics');
    document.querySelectorAll('[data-review]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionName = e.target.dataset.review;
            screen.remove();
            showReviewScreen(sectionName);
        });
    });
    document.getElementById('btn-analytics-back').onclick = () => {
        screen.remove();
        showScreen('main-menu');
    };
}

// ======================
// PDF GENERATION WITH ASPECT RATIO + ANSWER KEY
// ======================

async function loadImageAsDataURL(url) {
    const cleanUrl = url.trim();
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            resolve({
                dataUrl: img.src,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.onerror = () => reject(new Error('Failed to load image: ' + cleanUrl));
        img.src = cleanUrl;
    });
}

function drawImagePreservingAspectRatio(doc, imgData, x, y, maxWidth, maxHeight) {
    const imgRatio = imgData.width / imgData.height;
    const maxRatio = maxWidth / maxHeight;
    let finalWidth, finalHeight;
    if (imgRatio > maxRatio) {
        finalWidth = maxWidth;
        finalHeight = maxWidth / imgRatio;
    } else {
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgRatio;
    }
    const offsetX = (maxWidth - finalWidth) / 2;
    doc.addImage(imgData.dataUrl, 'JPEG', x + offsetX, y, finalWidth, finalHeight);
    return finalHeight;
}

async function generateOfflinePDF() {
    if (!confirm('Generate a PDF of ALL exam sections (with figures and answer key)? This may take a minute.')) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFontSize(18);
    doc.text("Civil Engineering Exam Simulator – Offline Copy", 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text("Generated on: " + new Date().toLocaleString(), 14, y);
    y += 15;

    if (appState.fullQuestionBank.length === 0) {
        appState.fullQuestionBank = getFallbackQuestions();
    }

    // === EXAM QUESTIONS ===
    for (const [key, section] of Object.entries(SECTIONS)) {
        const questions = getQuestionsForSection(key);

        doc.setFontSize(14);
        doc.text(`${section.title} (${key})`, 14, y);
        y += 10;

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const stemLines = doc.splitTextToSize(`Q${i + 1}. ${q.stem}`, 180);
            for (const line of stemLines) {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(line, 14, y);
                y += 6;
            }

            if (q.figure && q.figure.trim()) {
                try {
                    const imgData = await loadImageAsDataURL(q.figure);
                    if (y + 80 > 270) { doc.addPage(); y = 20; }
                    const usedHeight = drawImagePreservingAspectRatio(doc, imgData, 14, y, 180, 80);
                    y += usedHeight + 5;
                } catch (err) {
                    console.warn('Image load failed:', q.figure, err);
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setTextColor(255, 0, 0);
                    doc.text('[Figure not available]', 14, y);
                    doc.setTextColor(0, 0, 0);
                    y += 8;
                }
            }

            for (let j = 0; j < q.choices.length; j++) {
                const letter = String.fromCharCode(65 + j);
                const choiceLine = `${letter}. ${q.choices[j]}`;
                const lines = doc.splitTextToSize(choiceLine, 170);
                for (const line of lines) {
                    if (y > 280) { doc.addPage(); y = 20; }
                    doc.text(line, 20, y);
                    y += 6;
                }
            }
            y += 10;
            if (y > 280) { doc.addPage(); y = 20; }
        }
        doc.addPage();
        y = 20;
    }

    // === ANSWER KEY APPENDIX ===
    doc.text("ANSWER KEY", 14, y);
    y += 10;
    doc.setFontSize(11);

    for (const [key, section] of Object.entries(SECTIONS)) {
        const questions = getQuestionsForSection(key);
        doc.setFontSize(12);
        doc.text(`${section.title} (${key})`, 14, y);
        y += 8;

        for (let i = 0; i < questions.length; i++) {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(`Q${i + 1}: ${questions[i].correct_answer}`, 14, y);
            y += 6;
        }
        y += 10;
    }

    doc.save('Civil_Engineering_Exam_All.pdf');
}

// ======================
// RESET & FULL MOCK EXAM
// ======================
function startFullMockExam() {
    resetExam();
    appState.currentSection = 'AMSTHEC';
    showScreen('instructions');
}

// ======================
// FALLBACK QUESTIONS
// ======================
function getFallbackQuestions() {
    const fallbackQuestions = [];
    // AMSTHEC - 75 questions
    for (let i = 1; i <= 75; i++) {
        let stem, choices, correctAnswer;
        if (i <= 15) {
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Algebraic Problem Set ${groupNum} - Solve: ${getAlgebraEquation(groupNum, qInGroup)}`;
            choices = getAlgebraChoices(groupNum, qInGroup);
            correctAnswer = getAlgebraAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            const groupNum = Math.ceil((i - 15) / 5);
            const qInGroup = ((i - 16) % 5) + 1;
            stem = `Situation: Geometric Analysis ${groupNum} - ${getGeometryQuestion(groupNum, qInGroup)}`;
            choices = getGeometryChoices(groupNum, qInGroup);
            correctAnswer = getGeometryAnswer(groupNum, qInGroup);
        } else if (i <= 45) {
            const groupNum = Math.ceil((i - 30) / 5);
            const qInGroup = ((i - 31) % 5) + 1;
            stem = `Situation: Surveying Problem ${groupNum} - ${getSurveyingQuestion(groupNum, qInGroup)}`;
            choices = getSurveyingChoices(groupNum, qInGroup);
            correctAnswer = getSurveyingAnswer(groupNum, qInGroup);
        } else if (i <= 60) {
            const groupNum = Math.ceil((i - 45) / 5);
            const qInGroup = ((i - 46) % 5) + 1;
            stem = `Situation: Transportation Design ${groupNum} - ${getTransportationQuestion(groupNum, qInGroup)}`;
            choices = getTransportationChoices(groupNum, qInGroup);
            correctAnswer = getTransportationAnswer(groupNum, qInGroup);
        } else {
            stem = `Mathematics & Surveying Question ${i}: ${getIndividualMathQuestion(i)}`;
            choices = getIndividualMathChoices(i);
            correctAnswer = getIndividualMathAnswer(i);
        }
        fallbackQuestions.push({
            "section": "AMSTHEC",
            "group_id": i <= 60 ? `AMSTHEC-G${Math.ceil(i/5)}` : null,
            "stem": stem,
            "choices": choices,
            "correct_answer": correctAnswer,
            "difficulty": Math.ceil(Math.random() * 3),
            "term": "False",
            "figure": i % 10 === 0 ? "https://cdn.jsdelivr.net/gh/saydyin/ce-exam@images/figures/M12-04H.jpg" : null
        });
    }
    // HPGE - 50 questions
    for (let i = 1; i <= 50; i++) {
        let stem, choices, correctAnswer;
        if (i <= 10) {
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Fluid Mechanics Analysis ${groupNum} - ${getFluidMechanicsQuestion(groupNum, qInGroup)}`;
            choices = getFluidMechanicsChoices(groupNum, qInGroup);
            correctAnswer = getFluidMechanicsAnswer(groupNum, qInGroup);
        } else if (i <= 20) {
            const groupNum = Math.ceil((i - 10) / 5);
            const qInGroup = ((i - 11) % 5) + 1;
            stem = `Situation: Hydraulic System ${groupNum} - ${getHydraulicsQuestion(groupNum, qInGroup)}`;
            choices = getHydraulicsChoices(groupNum, qInGroup);
            correctAnswer = getHydraulicsAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            const groupNum = Math.ceil((i - 20) / 5);
            const qInGroup = ((i - 21) % 5) + 1;
            stem = `Situation: Soil Analysis ${groupNum} - ${getSoilMechanicsQuestion(groupNum, qInGroup)}`;
            choices = getSoilMechanicsChoices(groupNum, qInGroup);
            correctAnswer = getSoilMechanicsAnswer(groupNum, qInGroup);
        } else {
            stem = `Hydraulics & Geotechnical Question ${i}: ${getIndividualHPGEQuestion(i)}`;
            choices = getIndividualHPGEChoices(i);
            correctAnswer = getIndividualHPGEAnswer(i);
        }
        fallbackQuestions.push({
            "section": "HPGE",
            "group_id": i <= 30 ? `HPGE-G${Math.ceil(i/5)}` : null,
            "stem": stem,
            "choices": choices,
            "correct_answer": correctAnswer,
            "difficulty": Math.ceil(Math.random() * 3),
            "term": "False",
            "figure": i % 8 === 0 ? "https://via.placeholder.com/300x200?text=Hydro+Diagram" : null
        });
    }
    // PSAD - 75 questions
    for (let i = 1; i <= 75; i++) {
        let stem, choices, correctAnswer;
        if (i <= 15) {
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Structural Analysis ${groupNum} - ${getStructuralAnalysisQuestion(groupNum, qInGroup)}`;
            choices = getStructuralAnalysisChoices(groupNum, qInGroup);
            correctAnswer = getStructuralAnalysisAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            const groupNum = Math.ceil((i - 15) / 5);
            const qInGroup = ((i - 16) % 5) + 1;
            stem = `Situation: Concrete Structure ${groupNum} - ${getConcreteDesignQuestion(groupNum, qInGroup)}`;
            choices = getConcreteDesignChoices(groupNum, qInGroup);
            correctAnswer = getConcreteDesignAnswer(groupNum, qInGroup);
        } else if (i <= 45) {
            const groupNum = Math.ceil((i - 30) / 5);
            const qInGroup = ((i - 31) % 5) + 1;
            stem = `Situation: Steel Structure ${groupNum} - ${getSteelDesignQuestion(groupNum, qInGroup)}`;
            choices = getSteelDesignChoices(groupNum, qInGroup);
            correctAnswer = getSteelDesignAnswer(groupNum, qInGroup);
        } else if (i <= 60) {
            const groupNum = Math.ceil((i - 45) / 5);
            const qInGroup = ((i - 46) % 5) + 1;
            stem = `Situation: Construction Project ${groupNum} - ${getConstructionQuestion(groupNum, qInGroup)}`;
            choices = getConstructionChoices(groupNum, qInGroup);
            correctAnswer = getConstructionAnswer(groupNum, qInGroup);
        } else {
            stem = `Structural Design Question ${i}: ${getIndividualPSADQuestion(i)}`;
            choices = getIndividualPSADChoices(i);
            correctAnswer = getIndividualPSADAnswer(i);
        }
        fallbackQuestions.push({
            "section": "PSAD",
            "group_id": i <= 60 ? `PSAD-G${Math.ceil(i/5)}` : null,
            "stem": stem,
            "choices": choices,
            "correct_answer": correctAnswer,
            "difficulty": Math.ceil(Math.random() * 3),
            "term": "False",
            "figure": i % 12 === 0 ? "https://via.placeholder.com/300x200?text=Structure+Diagram" : null
        });
    }
    return fallbackQuestions;
}

// Helper functions (same as your original)
function getAlgebraEquation(group, question) { return "2x + 5 = 15"; }
function getAlgebraChoices(group, question) { return ["5", "6", "7", "8"]; }
function getAlgebraAnswer(group, question) { return "A"; }
function getGeometryQuestion(group, question) { return "Calculate the area of a triangle with base 8m and height 5m"; }
function getGeometryChoices(group, question) { return ["20 m²", "25 m²", "30 m²", "35 m²"]; }
function getGeometryAnswer(group, question) { return "A"; }
function getSurveyingQuestion(group, question) { return "A level instrument reading at A is 2.5m and at B is 1.8m. What is the elevation difference?"; }
function getSurveyingChoices(group, question) { return ["0.7 m", "0.8 m", "0.9 m", "1.0 m"]; }
function getSurveyingAnswer(group, question) { return "A"; }
function getTransportationQuestion(group, question) { return "Calculate the stopping sight distance for a vehicle at 80 km/h"; }
function getTransportationChoices(group, question) { return ["100 m", "110 m", "120 m", "130 m"]; }
function getTransportationAnswer(group, question) { return "C"; }
function getFluidMechanicsQuestion(group, question) { return "Calculate the pressure at a depth of 10m in water"; }
function getFluidMechanicsChoices(group, question) { return ["98 kPa", "100 kPa", "102 kPa", "105 kPa"]; }
function getFluidMechanicsAnswer(group, question) { return "A"; }
function getHydraulicsQuestion(group, question) { return "Calculate discharge through a 3m wide channel with depth 2m and velocity 1.5 m/s"; }
function getHydraulicsChoices(group, question) { return ["8 m³/s", "9 m³/s", "10 m³/s", "11 m³/s"]; }
function getHydraulicsAnswer(group, question) { return "B"; }
function getSoilMechanicsQuestion(group, question) { return "Calculate void ratio for soil with G=2.65, w=20%, S=80%"; }
function getSoilMechanicsChoices(group, question) { return ["0.66", "0.70", "0.74", "0.78"]; }
function getSoilMechanicsAnswer(group, question) { return "A"; }
function getStructuralAnalysisQuestion(group, question) { return "Max bending moment in 6m beam with 20 kN/m UDL"; }
function getStructuralAnalysisChoices(group, question) { return ["80 kN·m", "85 kN·m", "90 kN·m", "95 kN·m"]; }
function getStructuralAnalysisAnswer(group, question) { return "C"; }
function getConcreteDesignQuestion(group, question) { return "Moment capacity of 300x500mm beam with 4-20mm bars"; }
function getConcreteDesignChoices(group, question) { return ["160 kN·m", "170 kN·m", "180 kN·m", "190 kN·m"]; }
function getConcreteDesignAnswer(group, question) { return "B"; }
function getSteelDesignQuestion(group, question) { return "Tension strength of 200x10mm steel plate, fy=250 MPa"; }
function getSteelDesignChoices(group, question) { return ["480 kN", "500 kN", "520 kN", "540 kN"]; }
function getSteelDesignAnswer(group, question) { return "B"; }
function getConstructionQuestion(group, question) { return "Duration of critical path in project network"; }
function getConstructionChoices(group, question) { return ["22 days", "24 days", "26 days", "28 days"]; }
function getConstructionAnswer(group, question) { return "B"; }
function getIndividualMathQuestion(index) { return "Solve dy/dx = 2x"; }
function getIndividualMathChoices(index) { return ["x² + C", "2x² + C", "x + C", "2x + C"]; }
function getIndividualMathAnswer(index) { return "A"; }
function getIndividualHPGEQuestion(index) { return "Calculate permeability from falling head test"; }
function getIndividualHPGEChoices(index) { return ["1×10⁻⁵ cm/s", "2×10⁻⁵ cm/s", "3×10⁻⁵ cm/s", "4×10⁻⁵ cm/s"]; }
function getIndividualHPGEAnswer(index) { return "B"; }
function getIndividualPSADQuestion(index) { return "Calculate natural frequency of building"; }
function getIndividualPSADChoices(index) { return ["0.6 Hz", "0.7 Hz", "0.8 Hz", "0.9 Hz"]; }
function getIndividualPSADAnswer(index) { return "C"; }

function getSampleQuestions(sectionName) {
    return getFallbackQuestions().filter(q => q.section === sectionName);
}

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', async () => {
    if (appState.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    showScreen('loading');
    try {
        await loadQuestionBank();
        setTimeout(() => showScreen('main-menu'), 1000);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        setTimeout(() => showScreen('main-menu'), 1000);
    }

    document.getElementById('close-image-modal').onclick = () => {
        document.getElementById('image-modal').classList.add('hidden');
    };
    document.getElementById('image-modal').onclick = (e) => {
        if (e.target.id === 'image-modal') {
            document.getElementById('image-modal').classList.add('hidden');
        }
    };
});
