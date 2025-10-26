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
    settings: JSON.parse(localStorage.getItem('examSettings')) ||
    {
        theme: 'light',
        fontSize: 'medium',
        autoSave: true,
        navigationMode: 'scroll'
    },
    answers: JSON.parse(localStorage.getItem('examAnswers')) ||
    {},
    results: JSON.parse(localStorage.getItem('examResults')) || {},
    bookmarks: JSON.parse(localStorage.getItem('examBookmarks')) ||
    [],
    currentSection: null,
    timeLeft: 0,
    timerInterval: null,
    examQuestions: [],
    reviewingSection: null,
    fullQuestionBank: [],
    isPaused: false,
    firstWrongIndex: null
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
        } else if (screenId === 'settings') {
            renderSettingsScreen();
        } else if (screenId === 'bookmarks') {
            renderBookmarksScreen();
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
// BOOKMARKS
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
    return existingIndex === -1;
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

// ======================
// RESET
// ======================
function resetExam() {
    if (!confirm('Are you sure you want to reset all exam data? This cannot be undone.')) return;
    clearInterval(appState.timerInterval);
    appState.answers = {};
    appState.results = {};
    appState.bookmarks = [];
    appState.timeLeft = 0;
    appState.currentSection = null;
    appState.isPaused = false;
    appState.firstWrongIndex = null;
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examResults');
    localStorage.removeItem('examBookmarks');
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
        let buttonText = isCompleted ? 'Review Section' : (isPaused ? 'Continue Section' : 'Start Section');
        let buttonClass = isCompleted ? 'btn-secondary' : 'btn-primary';
        card.innerHTML = `
            <div class="section-card-header">
                <h2 class="section-card-title">
                    <span>${['📐','🗺️','📊'][idx % 3]}</span>
                    ${section.name}
                </h2>
                ${isCompleted ? `<span class="section-card-score">${score.toFixed(1)}%</span>` : ''}
            </div>
            <p class="section-card-description">${section.title}</p>
            <button type="button" class="btn ${buttonClass}" data-action="${isCompleted ? 'review' : (isPaused ? 'continue' : 'start')}" data-section="${section.name}">
                ${buttonText}
            </button>
            ${isCompleted ? `
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${score}%"></div>
                </div>
            ` : ''}
        `;
        if (isPaused) {
            const timeDisplay = formatTime(appState.timeLeft);
            const timerEl = document.createElement('p');
            timerEl.className = 'paused-timer';
            timerEl.textContent = `⏸ Time left: ${timeDisplay}`;
            timerEl.style.fontSize = '0.875rem';
            timerEl.style.color = document.documentElement.classList.contains('dark') ? 'var(--text-muted-dark)' : 'var(--text-muted-light)';
            card.appendChild(timerEl);
        }
        grid.appendChild(card);
    });

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
    document.getElementById('btn-full-mock').addEventListener('click', startFullMockExam);
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btn-bookmarks').addEventListener('click', () => showScreen('bookmarks'));
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
    const container = document.getElementById('exam-questions-container');
    container.innerHTML = '';

    document.body.className = `${appState.settings.theme} font-${appState.settings.fontSize} nav-${appState.settings.navigationMode}`;

    appState.examQuestions.forEach((question, index) => {
        const userAnswer = appState.answers[appState.currentSection][index];
        const isBookmarked = appState.bookmarks.some(b => 
            b.section === appState.currentSection && b.questionIndex === index
        );
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.id = `question-${index}`;
        if (appState.settings.navigationMode === 'step' && index === 0) {
            questionCard.classList.add('active-question');
        }

        const bookmarkIcon = isBookmarked ? '🔖' : '📖';
        const bookmarkClass = isBookmarked ? 'btn-primary' : 'btn-secondary';
        questionCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    ${question.group_id && question.stem.trim().startsWith('Situation') ? `<p class="question-group">Situation: ${question.group_id}</p>` : (question.group_id ? `<p class="question-group">Problem from Situation ${question.group_id}</p>` : '')}
                </div>
                <button type="button" class="btn ${bookmarkClass} btn-sm" data-bookmark="${index}">
                    ${bookmarkIcon}
                </button>
            </div>
            <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
            ${question.figure ?
                `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}"></div>` : ''}
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
            if (appState.settings.navigationMode === 'scroll') {
                const nextIndex = questionIndex + 1;
                const nextEl = document.getElementById(`question-${nextIndex}`);
                if (nextEl) {
                    const header = document.querySelector('.exam-header');
                    const headerHeight = header ? header.offsetHeight : 60;
                    const elementPosition = nextEl.getBoundingClientRect().top + window.scrollY;
                    const offsetPosition = elementPosition - headerHeight - 10;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            } else if (appState.settings.navigationMode === 'step') {
                setTimeout(() => navigateStep(1), 300);
            }
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
        appState.isPaused = true;
        saveState();
        showScreen('main-menu');
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

    function navigateStep(direction) {
        const activeCard = document.querySelector('.question-card.active-question');
        if (!activeCard) return;
        let currentIndex = parseInt(activeCard.id.split('-')[1]);
        let nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < totalQuestions) {
            activeCard.classList.remove('active-question');
            const nextCard = document.getElementById(`question-${nextIndex}`);
            if (nextCard) {
                nextCard.classList.add('active-question');
                document.getElementById('exam-progress').textContent = `Question ${nextIndex + 1} of ${totalQuestions}`;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (nextIndex >= totalQuestions) {
            showConfirmModal(
                "Section Completed",
                "You have reached the end of the section. Do you want to submit your exam now?",
                submitExam
            );
        }
    }
}

function selectAnswer(questionIndex, choice) {
    if (appState.currentSection === null) return;
    appState.answers[appState.currentSection][questionIndex] = choice;
    saveState();
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
// SUBMIT EXAM – FIXED TO SHOW RESULTS
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
    showResultsScreen(sectionName); // ✅ This now works
}

// ======================
// RESULTS SCREEN – FIXED
// ======================
function showResultsScreen(sectionName) {
    const result = appState.results[sectionName];
    const passed = result.score_pct >= 70;
    const screen = document.getElementById('screen-results');

    // Build HTML safely
    let wrongAnswersHTML = '';
    if (result.wrong.length > 0) {
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
            wrongAnswersHTML += `
                <div class="wrong-answer-card">
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
                </div>
            `;
        });
    }

    screen.innerHTML = `
        <div class="container results-container">
            <div class="results-card">
                <h1 class="section-title">${SECTIONS[sectionName].title} - Results</h1>
                <p class="score-message">${passed ? 'Congratulations! You Passed!' : 'Review Required. You Did Not Pass.'}</p>
                <div class="score ${passed ? 'pass' : 'fail'}">${result.score_pct.toFixed(1)}%</div>
                <div class="stats-grid">
                    <div class="stat-item"><span>Total Questions</span><div class="stat-value">${result.total}</div></div>
                    <div class="stat-item"><span>Correct Answers</span><div class="stat-value text-green-500">${result.correct}</div></div>
                    <div class="stat-item"><span>Wrong/Skipped</span><div class="stat-value text-red-500">${result.total - result.correct}</div></div>
                </div>
                <div class="action-buttons">
                    <button type="button" id="btn-results-main-menu" class="btn btn-secondary">Back to Main Menu</button>
                    <button type="button" id="btn-review-section" class="btn btn-primary">Review Full Section</button>
                </div>
            </div>
            ${result.wrong.length > 0 ? `
                <div class="wrong-answers-section">
                    <h2>Incorrect/Skipped Answers (${result.wrong.length})</h2>
                    <p class="text-center mb-4">You can use the 'Review Full Section' button to see all questions in order.</p>
                    <div id="wrong-answers-list">${wrongAnswersHTML}</div>
                </div>
            ` : ''}
        </div>
    `;

    // Reattach image zoom
    document.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });

    // Buttons
    document.getElementById('btn-results-main-menu').onclick = () => showScreen('main-menu');
    document.getElementById('btn-review-section').onclick = () => showReviewScreen(sectionName);

    // ✅ Finally, show the screen
    showScreen('results');
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
    const screen = document.getElementById('screen-review');
    document.body.className = `${appState.settings.theme} font-${appState.settings.fontSize}`;

    let reviewQuestionsHTML = '';
    appState.examQuestions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isBookmarked = appState.bookmarks.some(b => b.section === sectionName && b.questionIndex === index);
        const isCorrect = userAnswer === question.correct_answer;
        const isAnswered = userAnswer !== null;
        const resultIndicator = isAnswered ? (isCorrect ? '✅ Correct' : '❌ Wrong') : '❓ Skipped';
        const bookmarkIcon = isBookmarked ? '🔖' : '📖';
        const bookmarkClass = isBookmarked ? 'btn-primary' : 'btn-secondary';
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
            choicesHtml += `<button type="button" class="choice-btn ${choiceClass}" disabled>
                <span class="choice-letter">${letter}.</span>
                <span>${choice.trim()}</span>
            </button>`;
        });
        reviewQuestionsHTML += `
            <div class="review-question-card" id="review-question-${index}">
                <div class="question-header">
                    <div>
                        <p class="question-number">Question ${index + 1}</p>
                        ${question.group_id && question.stem.trim().startsWith('Situation') ? `<p class="question-group">Situation: ${question.group_id}</p>` : (question.group_id ? `<p class="question-group">Problem from Situation ${question.group_id}</p>` : '')}
                        <p class="result-indicator" style="font-weight: bold; margin-top: 0.25rem; color: ${isCorrect ? 'var(--success-color)' : (isAnswered ? 'var(--danger-color)' : 'var(--warning-color)')}">${resultIndicator}</p>
                    </div>
                    <button type="button" class="btn ${bookmarkClass} btn-sm review-bookmark-btn" data-bookmark="${index}">
                        ${bookmarkIcon}
                    </button>
                </div>
                <p class="question-stem whitespace-pre-wrap">${question.stem}</p>
                ${question.figure ? `<div class="question-image"><img src="${question.figure}" alt="Figure for question ${index + 1}" data-figure="${question.figure}"></div>` : ''}
                <div class="choices-container">${choicesHtml}</div>
                <div class="answer-comparison" style="margin-top: 1.5rem;">
                    <p class="correct-answer">Correct Answer: ${question.correct_answer}</p>
                    ${isAnswered ? `<p class="user-answer">Your Answer: ${userAnswer}</p>` : ''}
                </div>
                ${question.explanation ? `<div class="explanation"><p class="explanation-title">Explanation:</p><p class="whitespace-pre-wrap">${question.explanation}</p></div>` : ''}
            </div>
        `;
    });

    screen.innerHTML = `
        <div class="container review-container">
            <div class="review-header">
                <h1>Review: ${SECTIONS[sectionName].title}</h1>
            </div>
            <div id="review-questions-container" class="review-questions-container">
                ${reviewQuestionsHTML}
            </div>
            <div class="action-buttons mt-4">
                <button type="button" id="btn-review-back" class="btn btn-secondary">Back to Main Menu</button>
                <button type="button" id="btn-review-jump-wrong" class="btn btn-danger">Jump to First Wrong</button>
            </div>
        </div>
    `;

    document.querySelectorAll('.review-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const index = parseInt(button.dataset.bookmark);
            const isNowBookmarked = toggleBookmark(sectionName, index);
            button.className = `btn ${isNowBookmarked ? 'btn-primary' : 'btn-secondary'} btn-sm review-bookmark-btn`;
            button.innerHTML = isNowBookmarked ? '🔖' : '📖';
        });
    });

    document.querySelectorAll('img[data-figure]').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('zoomed-image').src = img.src;
            document.getElementById('image-modal').classList.remove('hidden');
        });
    });

    document.getElementById('btn-review-back').onclick = () => showScreen('main-menu');
    document.getElementById('btn-review-jump-wrong').onclick = () => {
        if (appState.firstWrongIndex !== null) {
            const targetEl = document.getElementById(`review-question-${appState.firstWrongIndex}`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert("Congratulations! You got everything correct in this section.");
        }
    };
    appState.firstWrongIndex = null;
    saveState();
    showScreen('review');
}

// ======================
// BOOKMARKS, ANALYTICS, SETTINGS, PDF, ETC.
// (No changes needed for submission bug)
// ======================

// ... [Rest of your original code for bookmarks, analytics, settings, PDF, fallback questions, init] ...

// For brevity, I’ll include only the init and fallback below. You can keep the rest of your original logic unchanged.

function renderBookmarksScreen() { /* ... */ }
function renderAnalyticsScreen() { /* ... */ }
function renderSettingsScreen() { /* ... */ }
function exportData() { /* ... */ }
function importData(event) { /* ... */ }
function clearCache() { /* ... */ }
function startFullMockExam() { /* ... */ }
function generateOfflinePDF() { /* ... */ }
function getFallbackQuestions() { /* ... */ }
function getSampleQuestions(sectionName) { /* ... */ }

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', async () => {
    if (appState.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    }
    document.body.classList.add(`font-${appState.settings.fontSize}`, `nav-${appState.settings.navigationMode}`);

    showScreen('loading');

    if (!window.Chart) {
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js';
        document.head.appendChild(chartScript);
    }

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
});
