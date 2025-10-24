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
        const response = await fetch('data/question_bank.json');
        if (!response.ok) {
            throw new Error(`Failed to load question bank: ${response.status}`);
        }
        const questionBank = await response.json();
        console.log(`Loaded ${questionBank.length} questions from question bank`);
        appState.fullQuestionBank = questionBank;
        return questionBank;
    } catch (error) {
        console.error('Error loading question bank:', error);
        // Fallback to sample questions if the file doesn't exist
        appState.fullQuestionBank = getFallbackQuestions();
        return appState.fullQuestionBank;
    }
}

function getQuestionsForSection(sectionName) {
    if (!appState.fullQuestionBank || appState.fullQuestionBank.length === 0) {
        console.warn('Question bank not loaded, using fallback questions');
        return getSampleQuestions(sectionName);
    }
    
    // Filter questions for the current section
    const sectionQuestions = appState.fullQuestionBank.filter(q => q.section === sectionName);
    console.log(`Found ${sectionQuestions.length} questions for section ${sectionName}`);
    
    // Apply the grouping logic
    const processedQuestions = processQuestionsWithGroups(sectionQuestions);
    
    // Limit to section requirements
    const requiredTotal = SECTION_REQUIREMENTS[sectionName].total;
    const finalQuestions = processedQuestions.slice(0, requiredTotal);
    
    console.log(`Returning ${finalQuestions.length} questions for ${sectionName} (required: ${requiredTotal})`);
    return finalQuestions;
}

function processQuestionsWithGroups(questions) {
    // Group questions by group_id
    const groupMap = {};
    
    questions.forEach(question => {
        const groupKey = question.group_id || `single-${Math.random().toString(36).substring(2, 8)}`;
        if (!groupMap[groupKey]) {
            groupMap[groupKey] = [];
        }
        groupMap[groupKey].push(question);
    });
    
    // Sort groups: situation questions first within each group
    const processedGroups = Object.values(groupMap).map(group => {
        const situationQuestion = group.find(q => q.stem.trim().startsWith('Situation'));
        if (situationQuestion) {
            const otherQuestions = group.filter(q => q !== situationQuestion);
            return [situationQuestion, ...otherQuestions];
        }
        return group;
    });
    
    // Shuffle groups (Fisher-Yates shuffle)
    const shuffledGroups = shuffleArray(processedGroups);
    
    // Flatten groups
    let orderedQuestions = shuffledGroups.flat();
    
    // Post-flatten fix: prevent "Situation" in last few questions
    const checkLastN = 5;
    const badIndex = orderedQuestions
        .slice(-checkLastN)
        .findIndex(q => q.stem.trim().startsWith('Situation'));

    if (badIndex !== -1) {
        const situationQ = orderedQuestions[orderedQuestions.length - checkLastN + badIndex];
        const situationGroupId = situationQ.group_id;

        // Remove all questions from same group
        const remaining = orderedQuestions.filter(q => q.group_id !== situationGroupId);
        const movedGroup = orderedQuestions.filter(q => q.group_id === situationGroupId);

        // Insert the group into the middle
        const insertPos = Math.floor(remaining.length / 2);
        remaining.splice(insertPos, 0, ...movedGroup);

        orderedQuestions = remaining;
    }

    return orderedQuestions;
}

// Fisher-Yates shuffle algorithm
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
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show the requested screen
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) {
        screen.classList.remove('hidden');
        appState.view = screenId;
        
        // Initialize screen if needed
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
                    <span>${['📐','🏗️','📊'][idx % 3]}</span>
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

    // Event listeners for section buttons
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
    
    // Other button listeners
    document.getElementById('btn-full-mock').addEventListener('click', startFullMockExam);
    document.getElementById('btn-settings').addEventListener('click', showSettingsScreen);
    document.getElementById('btn-bookmarks').addEventListener('click', showBookmarksScreen);
    document.getElementById('btn-analytics').addEventListener('click', showAnalyticsScreen);
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
// EXAM SCREEN
// ======================
function loadQuestionsForSection(sectionName) {
    const sectionQuestions = getQuestionsForSection(sectionName);
    appState.examQuestions = sectionQuestions;
    
    console.log(`Loaded ${sectionQuestions.length} questions for ${sectionName}`);
    
    if (!appState.answers[sectionName]) {
        appState.answers[sectionName] = new Array(sectionQuestions.length).fill(null);
    }
    
    appState.timeLeft = SECTIONS[sectionName].time;
    startTimer();
}

function startTimer() {
    clearInterval(appState.timerInterval);
    
    appState.timerInterval = setInterval(() => {
        appState.timeLeft--;
        document.getElementById('exam-timer').textContent = formatTime(appState.timeLeft);
        
        if (appState.timeLeft <= 0) {
            clearInterval(appState.timerInterval);
            submitExam();
        }
    }, 1000);
}

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
        
        questionCard.innerHTML = `
            <div class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    ${question.group_id ? `<p class="question-group">Situation: ${question.group_id}</p>` : ''}
                </div>
                <button class="btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'} btn-sm" data-bookmark="${index}">
                    🔖
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

    // Add event listeners
    document.querySelectorAll('[data-bookmark]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.bookmark);
            toggleBookmark(appState.currentSection, index);
            
            // Update button appearance
            const isBookmarked = appState.bookmarks.some(b => 
                b.section === appState.currentSection && b.questionIndex === index
            );
            e.target.className = `btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'} btn-sm`;
        });
    });

    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.closest('.choice-btn').dataset.question);
            const choice = e.target.closest('.choice-btn').dataset.choice;
            
            selectAnswer(questionIndex, choice);
            
            // Update UI
            const questionCard = document.getElementById(`question-${questionIndex}`);
            questionCard.querySelectorAll('.choice-btn').forEach(choiceBtn => {
                choiceBtn.classList.remove('selected');
            });
            e.target.closest('.choice-btn').classList.add('selected');
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
    
    document.getElementById('btn-submit-exam').onclick = submitExam;
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
    
    // Render wrong answers if any
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
        
        // Add image zoom functionality to wrong answer images
        list.querySelectorAll('img[data-figure]').forEach(img => {
            img.addEventListener('click', () => {
                document.getElementById('zoomed-image').src = img.src;
                document.getElementById('image-modal').classList.remove('hidden');
            });
        });
    }
    
    // Event listeners
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
    const questions = getQuestionsForSection(sectionName);
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
    
    // Add image zoom functionality
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
// BOOKMARKS
// ======================
function toggleBookmark(section, index) {
    const id = `${section}-${index}`;
    const exists = appState.bookmarks.some(b => b.id === id);
    
    if (exists) {
        appState.bookmarks = appState.bookmarks.filter(b => b.id !== id);
    } else {
        appState.bookmarks.push({
            id,
            section,
            questionIndex: index,
            timestamp: new Date().toISOString()
        });
    }
    
    saveState();
}

// ======================
// OTHER SCREENS (SETTINGS, BOOKMARKS, ANALYTICS)
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
    
    // Set current values
    document.getElementById('setting-theme').value = appState.settings.theme;
    document.getElementById('setting-font').value = appState.settings.fontSize;
    
    // Event listeners
    document.getElementById('setting-theme').onchange = (e) => {
        appState.settings.theme = e.target.value;
        
        if (appState.settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
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
            <h1 class="section-title">🔖 Bookmarked Questions</h1>
    `;
    
    if (appState.bookmarks.length === 0) {
        content += `
            <div class="card text-center">
                <p>No bookmarks yet.</p>
            </div>
        `;
    } else {
        content += '<div class="bookmarks-list">';
        
        appState.bookmarks.forEach(bookmark => {
            content += `
                <div class="card bookmark-item">
                    <div class="bookmark-info">
                        <span>${bookmark.section} — Q${bookmark.questionIndex + 1}</span>
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
    
    // Go to question functionality
    document.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const [section, index] = e.target.dataset.go.split('-');
            appState.currentSection = section;
            loadQuestionsForSection(section);
            showScreen('exam');
            
            // Scroll to the bookmarked question
            setTimeout(() => {
                const questionElement = document.getElementById(`question-${index}`);
                if (questionElement) {
                    questionElement.scrollIntoView({ behavior: 'smooth' });
                }
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
    
    let content = `
        <div class="container">
            <h1 class="section-title">Performance Analytics</h1>
    `;
    
    if (Object.keys(appState.results).length === 0) {
        content += `
            <div class="card text-center">
                <h2>No Analytics Available</h2>
                <p>Complete at least one exam section to see your performance analytics.</p>
            </div>
        `;
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
                        <div class="detail-item">
                            <span>Correct Answers:</span>
                            <span>${result.correct}</span>
                        </div>
                        <div class="detail-item">
                            <span>Incorrect Answers:</span>
                            <span>${result.wrong.length}</span>
                        </div>
                        <div class="detail-item">
                            <span>Unanswered:</span>
                            <span>${result.total - result.correct - result.wrong.length}</span>
                        </div>
                    </div>
                    
                    <button class="btn btn-text" data-review="${sectionName}">Review Wrong Answers</button>
                </div>
            `;
        });
        
        content += '</div>';
    }
    
    content += `
            <div class="action-buttons">
                <button id="btn-analytics-back" class="btn btn-secondary">Back to Main Menu</button>
            </div>
        </div>
    `;
    
    screen.innerHTML = content;
    document.body.appendChild(screen);
    showScreen('analytics');
    
    // Review buttons
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
// RESET & FULL MOCK EXAM
// ======================
function resetExam() {
    if (!confirm('Are you sure you want to reset all exam data? This cannot be undone.')) return;
    
    appState.answers = {};
    appState.results = {};
    appState.bookmarks = [];
    
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examResults');
    localStorage.removeItem('examBookmarks');
    
    showScreen('main-menu');
}

function startFullMockExam() {
    resetExam(); // Full mock starts fresh
    appState.currentSection = 'AMSTHEC';
    showScreen('instructions');
}

// ======================
// FALLBACK QUESTIONS
// ======================
function getFallbackQuestions() {
    const fallbackQuestions = [];
    
    // AMSTHEC - 75 questions (Mathematics, Surveying & Transportation Engineering)
    for (let i = 1; i <= 75; i++) {
        let stem, choices, correctAnswer;
        
        if (i <= 15) {
            // Group 1: Algebra and Calculus
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Algebraic Problem Set ${groupNum} - Solve the following equation: ${getAlgebraEquation(groupNum, qInGroup)}`;
            choices = getAlgebraChoices(groupNum, qInGroup);
            correctAnswer = getAlgebraAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            // Group 2: Geometry and Trigonometry
            const groupNum = Math.ceil((i - 15) / 5);
            const qInGroup = ((i - 16) % 5) + 1;
            stem = `Situation: Geometric Analysis ${groupNum} - ${getGeometryQuestion(groupNum, qInGroup)}`;
            choices = getGeometryChoices(groupNum, qInGroup);
            correctAnswer = getGeometryAnswer(groupNum, qInGroup);
        } else if (i <= 45) {
            // Group 3: Surveying
            const groupNum = Math.ceil((i - 30) / 5);
            const qInGroup = ((i - 31) % 5) + 1;
            stem = `Situation: Surveying Problem ${groupNum} - ${getSurveyingQuestion(groupNum, qInGroup)}`;
            choices = getSurveyingChoices(groupNum, qInGroup);
            correctAnswer = getSurveyingAnswer(groupNum, qInGroup);
        } else if (i <= 60) {
            // Group 4: Transportation Engineering
            const groupNum = Math.ceil((i - 45) / 5);
            const qInGroup = ((i - 46) % 5) + 1;
            stem = `Situation: Transportation Design ${groupNum} - ${getTransportationQuestion(groupNum, qInGroup)}`;
            choices = getTransportationChoices(groupNum, qInGroup);
            correctAnswer = getTransportationAnswer(groupNum, qInGroup);
        } else {
            // Individual questions
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
            "figure": i % 10 === 0 ? "https://via.placeholder.com/300x200?text=Math+Diagram" : null
        });
    }
    
    // HPGE - 50 questions (Hydraulics & Geotechnical Engineering)
    for (let i = 1; i <= 50; i++) {
        let stem, choices, correctAnswer;
        
        if (i <= 10) {
            // Group 1: Fluid Mechanics
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Fluid Mechanics Analysis ${groupNum} - ${getFluidMechanicsQuestion(groupNum, qInGroup)}`;
            choices = getFluidMechanicsChoices(groupNum, qInGroup);
            correctAnswer = getFluidMechanicsAnswer(groupNum, qInGroup);
        } else if (i <= 20) {
            // Group 2: Hydraulics
            const groupNum = Math.ceil((i - 10) / 5);
            const qInGroup = ((i - 11) % 5) + 1;
            stem = `Situation: Hydraulic System ${groupNum} - ${getHydraulicsQuestion(groupNum, qInGroup)}`;
            choices = getHydraulicsChoices(groupNum, qInGroup);
            correctAnswer = getHydraulicsAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            // Group 3: Soil Mechanics
            const groupNum = Math.ceil((i - 20) / 5);
            const qInGroup = ((i - 21) % 5) + 1;
            stem = `Situation: Soil Analysis ${groupNum} - ${getSoilMechanicsQuestion(groupNum, qInGroup)}`;
            choices = getSoilMechanicsChoices(groupNum, qInGroup);
            correctAnswer = getSoilMechanicsAnswer(groupNum, qInGroup);
        } else {
            // Individual questions
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
    
    // PSAD - 75 questions (Structural Design & Construction)
    for (let i = 1; i <= 75; i++) {
        let stem, choices, correctAnswer;
        
        if (i <= 15) {
            // Group 1: Structural Analysis
            const groupNum = Math.ceil(i / 5);
            const qInGroup = ((i - 1) % 5) + 1;
            stem = `Situation: Structural Analysis ${groupNum} - ${getStructuralAnalysisQuestion(groupNum, qInGroup)}`;
            choices = getStructuralAnalysisChoices(groupNum, qInGroup);
            correctAnswer = getStructuralAnalysisAnswer(groupNum, qInGroup);
        } else if (i <= 30) {
            // Group 2: Concrete Design
            const groupNum = Math.ceil((i - 15) / 5);
            const qInGroup = ((i - 16) % 5) + 1;
            stem = `Situation: Concrete Structure ${groupNum} - ${getConcreteDesignQuestion(groupNum, qInGroup)}`;
            choices = getConcreteDesignChoices(groupNum, qInGroup);
            correctAnswer = getConcreteDesignAnswer(groupNum, qInGroup);
        } else if (i <= 45) {
            // Group 3: Steel Design
            const groupNum = Math.ceil((i - 30) / 5);
            const qInGroup = ((i - 31) % 5) + 1;
            stem = `Situation: Steel Structure ${groupNum} - ${getSteelDesignQuestion(groupNum, qInGroup)}`;
            choices = getSteelDesignChoices(groupNum, qInGroup);
            correctAnswer = getSteelDesignAnswer(groupNum, qInGroup);
        } else if (i <= 60) {
            // Group 4: Construction Management
            const groupNum = Math.ceil((i - 45) / 5);
            const qInGroup = ((i - 46) % 5) + 1;
            stem = `Situation: Construction Project ${groupNum} - ${getConstructionQuestion(groupNum, qInGroup)}`;
            choices = getConstructionChoices(groupNum, qInGroup);
            correctAnswer = getConstructionAnswer(groupNum, qInGroup);
        } else {
            // Individual questions
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

// Helper functions for generating realistic questions
function getAlgebraEquation(group, question) {
    const equations = [
        "2x + 5 = 15",
        "x² - 4x + 4 = 0", 
        "3x - 7 = 2x + 8",
        "x² + 6x + 9 = 0",
        "4x + 3 = 2x - 5"
    ];
    return equations[(group + question) % equations.length];
}

function getAlgebraChoices(group, question) {
    const base = (group * 10 + question) % 4;
    return [
        `${base + 1}`,
        `${base + 2}`,
        `${base + 3}`,
        `${base + 4}`
    ];
}

function getAlgebraAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question) % 4];
}

function getGeometryQuestion(group, question) {
    const questions = [
        "Calculate the area of a triangle with base 8m and height 5m",
        "Find the volume of a cylinder with radius 3m and height 10m",
        "Determine the circumference of a circle with diameter 14m",
        "Calculate the surface area of a sphere with radius 7m",
        "Find the diagonal of a rectangle with sides 6m and 8m"
    ];
    return questions[(group + question) % questions.length];
}

function getGeometryChoices(group, question) {
    const base = (group * 15 + question * 3) % 20;
    return [
        `${base + 10} m²`,
        `${base + 15} m²`,
        `${base + 20} m²`,
        `${base + 25} m²`
    ];
}

function getGeometryAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question * 2) % 4];
}

function getSurveyingQuestion(group, question) {
    const questions = [
        "A level instrument is set up between points A and B. The reading at A is 2.5m and at B is 1.8m. What is the difference in elevation?",
        "A 100m tape is 0.02m too long. What correction should be applied to a measured distance of 250m?",
        "Calculate the horizontal distance when slope distance is 150m and vertical angle is 5°",
        "Determine the area of a triangular plot with sides 80m, 60m, and 100m",
        "A theodolite reading has a vertical angle of 15°30'. Convert this to decimal degrees"
    ];
    return questions[(group + question) % questions.length];
}

function getSurveyingChoices(group, question) {
    const base = (group * 8 + question * 2) % 10;
    return [
        `${0.7 + base * 0.1} m`,
        `${0.8 + base * 0.1} m`,
        `${0.9 + base * 0.1} m`,
        `${1.0 + base * 0.1} m`
    ];
}

function getSurveyingAnswer(group, question) {
    return ["A", "B", "C", "D"][(group * 3 + question) % 4];
}

function getTransportationQuestion(group, question) {
    const questions = [
        "Calculate the stopping sight distance for a vehicle traveling at 80 km/h on a level road",
        "Determine the superelevation required for a curve with radius 300m and design speed 60 km/h",
        "Calculate the number of vehicles per hour for a traffic flow with average speed 50 km/h and density 25 veh/km",
        "Determine the pavement thickness required for a subgrade CBR of 8% and traffic of 1 million ESALs",
        "Calculate the degree of curve for a circular curve with radius 200m"
    ];
    return questions[(group + question) % questions.length];
}

function getTransportationChoices(group, question) {
    const base = (group * 12 + question * 3) % 50;
    return [
        `${base + 50} m`,
        `${base + 55} m`,
        `${base + 60} m`,
        `${base + 65} m`
    ];
}

function getTransportationAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question * 4) % 4];
}

function getFluidMechanicsQuestion(group, question) {
    const questions = [
        "Calculate the pressure at a depth of 10m in water",
        "Determine the velocity head for water flowing at 3 m/s",
        "Calculate the Reynolds number for flow in a 0.3m diameter pipe with velocity 2 m/s and kinematic viscosity 1×10⁻⁶ m²/s",
        "Determine the head loss due to friction in a 100m long, 0.2m diameter pipe with flow rate 0.1 m³/s",
        "Calculate the force exerted by a water jet of diameter 0.1m and velocity 20 m/s on a stationary flat plate"
    ];
    return questions[(group + question) % questions.length];
}

function getFluidMechanicsChoices(group, question) {
    const base = (group * 15 + question * 2) % 100;
    return [
        `${base + 50} kPa`,
        `${base + 60} kPa`,
        `${base + 70} kPa`,
        `${base + 80} kPa`
    ];
}

function getFluidMechanicsAnswer(group, question) {
    return ["A", "B", "C", "D"][(group * 2 + question) % 4];
}

function getHydraulicsQuestion(group, question) {
    const questions = [
        "Calculate the discharge through a rectangular channel 3m wide with depth 2m and velocity 1.5 m/s",
        "Determine the critical depth in a rectangular channel 4m wide with discharge 20 m³/s",
        "Calculate the energy loss in a sudden expansion from 0.5m to 1.0m diameter with velocity 3 m/s",
        "Determine the Manning's roughness coefficient for a concrete channel with velocity 2 m/s, hydraulic radius 1.5m, and slope 0.001",
        "Calculate the specific energy for flow in a rectangular channel with depth 2m and velocity 2.5 m/s"
    ];
    return questions[(group + question) % questions.length];
}

function getHydraulicsChoices(group, question) {
    const base = (group * 8 + question) % 20;
    return [
        `${base + 5} m³/s`,
        `${base + 6} m³/s`,
        `${base + 7} m³/s`,
        `${base + 8} m³/s`
    ];
}

function getHydraulicsAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question * 3) % 4];
}

function getSoilMechanicsQuestion(group, question) {
    const questions = [
        "Calculate the void ratio for soil with specific gravity 2.65, water content 20%, and degree of saturation 80%",
        "Determine the effective stress at a depth of 5m in saturated clay with unit weight 18 kN/m³",
        "Calculate the compression index for normally consolidated clay with liquid limit 45%",
        "Determine the shear strength of sand with friction angle 30° and normal stress 100 kPa",
        "Calculate the settlement of a 2m thick clay layer with compression index 0.3, initial void ratio 1.0, and stress increase from 100 to 200 kPa"
    ];
    return questions[(group + question) % questions.length];
}

function getSoilMechanicsChoices(group, question) {
    const base = (group * 10 + question * 2) % 10;
    return [
        `${0.5 + base * 0.1}`,
        `${0.6 + base * 0.1}`,
        `${0.7 + base * 0.1}`,
        `${0.8 + base * 0.1}`
    ];
}

function getSoilMechanicsAnswer(group, question) {
    return ["A", "B", "C", "D"][(group * 4 + question) % 4];
}

function getStructuralAnalysisQuestion(group, question) {
    const questions = [
        "Calculate the maximum bending moment in a simply supported beam of span 6m with uniformly distributed load 20 kN/m",
        "Determine the deflection at midspan of a cantilever beam 3m long with point load 10 kN at free end",
        "Calculate the force in a truss member using method of joints",
        "Determine the fixed end moments for a beam with uniformly distributed load",
        "Calculate the slope at the end of a propped cantilever beam"
    ];
    return questions[(group + question) % questions.length];
}

function getStructuralAnalysisChoices(group, question) {
    const base = (group * 15 + question * 3) % 50;
    return [
        `${base + 40} kN·m`,
        `${base + 45} kN·m`,
        `${base + 50} kN·m`,
        `${base + 55} kN·m`
    ];
}

function getStructuralAnalysisAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question) % 4];
}

function getConcreteDesignQuestion(group, question) {
    const questions = [
        "Calculate the moment capacity of a rectangular beam 300mm × 500mm with 4-20mm diameter bars, f'c=25 MPa, fy=415 MPa",
        "Determine the development length for a 16mm diameter bar in concrete with f'c=30 MPa",
        "Calculate the shear strength provided by concrete for a beam with f'c=25 MPa, bw=300mm, d=450mm",
        "Determine the required area of steel for a slab with moment 50 kN·m/m, f'c=25 MPa, fy=415 MPa",
        "Calculate the cracking moment for a beam with modulus of rupture 3.5 MPa and section modulus 2×10⁶ mm³"
    ];
    return questions[(group + question) % questions.length];
}

function getConcreteDesignChoices(group, question) {
    const base = (group * 20 + question * 4) % 100;
    return [
        `${base + 150} kN·m`,
        `${base + 160} kN·m`,
        `${base + 170} kN·m`,
        `${base + 180} kN·m`
    ];
}

function getConcreteDesignAnswer(group, question) {
    return ["A", "B", "C", "D"][(group * 2 + question * 2) % 4];
}

function getSteelDesignQuestion(group, question) {
    const questions = [
        "Calculate the design strength in tension for a steel plate 200mm × 10mm with fy=250 MPa",
        "Determine the buckling strength of a steel column 3m long, pinned at both ends, with moment of inertia 5×10⁶ mm⁴ and fy=250 MPa",
        "Calculate the moment capacity of a steel beam with plastic section modulus 1.5×10⁶ mm³ and fy=250 MPa",
        "Determine the required bolt diameter for a connection with shear force 100 kN using Grade 4.6 bolts",
        "Calculate the deflection of a steel beam under service loads"
    ];
    return questions[(group + question) % questions.length];
}

function getSteelDesignChoices(group, question) {
    const base = (group * 25 + question * 5) % 200;
    return [
        `${base + 400} kN`,
        `${base + 420} kN`,
        `${base + 440} kN`,
        `${base + 460} kN`
    ];
}

function getSteelDesignAnswer(group, question) {
    return ["A", "B", "C", "D"][(group * 3 + question) % 4];
}

function getConstructionQuestion(group, question) {
    const questions = [
        "Calculate the duration of a critical path in a project network",
        "Determine the cost of concrete for a foundation 10m × 5m × 1m at $150 per cubic meter",
        "Calculate the productivity of an excavator with bucket capacity 1.5 m³, cycle time 30 seconds, and efficiency 80%",
        "Determine the safety factor for a slope with cohesion 20 kPa, friction angle 25°, and height 5m",
        "Calculate the required formwork area for a column 0.4m × 0.4m × 3m high"
    ];
    return questions[(group + question) % questions.length];
}

function getConstructionChoices(group, question) {
    const base = (group * 30 + question * 6) % 50;
    return [
        `${base + 20} days`,
        `${base + 25} days`,
        `${base + 30} days`,
        `${base + 35} days`
    ];
}

function getConstructionAnswer(group, question) {
    return ["A", "B", "C", "D"][(group + question * 5) % 4];
}

// Individual question generators
function getIndividualMathQuestion(index) {
    const questions = [
        "Solve the differential equation dy/dx = 2x",
        "Calculate the integral of x² from 0 to 3",
        "Find the limit of (sin x)/x as x approaches 0",
        "Determine the derivative of ln(x)",
        "Calculate the area under the curve y = x² from x=1 to x=3"
    ];
    return questions[index % questions.length];
}

function getIndividualMathChoices(index) {
    const base = index % 20;
    return [
        `${base + 1}`,
        `${base + 2}`,
        `${base + 3}`,
        `${base + 4}`
    ];
}

function getIndividualMathAnswer(index) {
    return ["A", "B", "C", "D"][index % 4];
}

function getIndividualHPGEQuestion(index) {
    const questions = [
        "Calculate the permeability of soil from falling head test",
        "Determine the consolidation settlement",
        "Calculate the factor of safety against sliding",
        "Determine the seepage quantity through an earth dam",
        "Calculate the bearing capacity of a shallow foundation"
    ];
    return questions[index % questions.length];
}

function getIndividualHPGEChoices(index) {
    const base = index % 15;
    return [
        `${base + 1}×10⁻⁵ cm/s`,
        `${base + 2}×10⁻⁵ cm/s`,
        `${base + 3}×10⁻⁵ cm/s`,
        `${base + 4}×10⁻⁵ cm/s`
    ];
}

function getIndividualHPGEAnswer(index) {
    return ["A", "B", "C", "D"][index % 4];
}

function getIndividualPSADQuestion(index) {
    const questions = [
        "Calculate the natural frequency of a building",
        "Determine the wind load on a structure",
        "Calculate the seismic base shear",
        "Determine the fire resistance rating required",
        "Calculate the thermal movement in a steel bridge"
    ];
    return questions[index % questions.length];
}

function getIndividualPSADChoices(index) {
    const base = index % 10;
    return [
        `${0.5 + base * 0.1} Hz`,
        `${0.6 + base * 0.1} Hz`,
        `${0.7 + base * 0.1} Hz`,
        `${0.8 + base * 0.1} Hz`
    ];
}

function getIndividualPSADAnswer(index) {
    return ["A", "B", "C", "D"][index % 4];
}

function getSampleQuestions(sectionName) {
    return getFallbackQuestions().filter(q => q.section === sectionName);
}

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', async () => {
    // Apply theme
    if (appState.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    
    // Show loading screen
    showScreen('loading');
    
    try {
        // Load the question bank
        await loadQuestionBank();
        
        // Simulate loading for better UX
        setTimeout(() => {
            showScreen('main-menu');
        }, 1000);
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still show main menu even if question bank fails
        setTimeout(() => {
            showScreen('main-menu');
        }, 1000);
    }
    
    // Modal close functionality
    document.getElementById('close-image-modal').onclick = () => {
        document.getElementById('image-modal').classList.add('hidden');
    };
    
    document.getElementById('image-modal').onclick = (e) => {
        if (e.target.id === 'image-modal') {
            document.getElementById('image-modal').classList.add('hidden');
        }
    };
});