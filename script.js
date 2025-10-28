// =========================
// Core App State
// =========================
const SECTIONS = {
  AMSTHEC: { total: 75, time: 5 * 3600 },
  HPGE: { total: 50, time: 4 * 3600 },
  PSAD: { total: 75, time: 5 * 3600 }
};

let appState = {
  fullQuestionBank: [],
  currentExam: null,
  currentSection: null,
  settings: {
    theme: 'light',
    fontSize: 'medium',
    navMode: 'scroll',
    autoSave: true,
    showTimer: true,
    randomizeQuestions: true,
    showProgress: true,
    showDifficulty: true
  }
};

// =========================
// Utility Functions
// =========================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupQuestionsById(questions) {
  const map = {};
  questions.forEach(q => {
    const gid = q.group_id || `__single_${q._internal_id || Math.random().toString(36).slice(2, 9)}`;
    if (!map[gid]) map[gid] = [];
    map[gid].push(q);
  });
  return map;
}

function isSituationGroup(group) {
  return group.some(q => (q.stem || '').trim().startsWith('Situation'));
}

function calculateSituationGroups(totalQuestions) {
  const calc = (totalQuestions - 5) / 3;
  if (!isFinite(calc) || calc <= 0) return 0;
  return Math.floor(calc / 5) * 5;
}

function randomizeExam(groupsObj, totalQuestions) {
  const groups = Object.values(groupsObj);
  const situationGroups = groups.filter(isSituationGroup);
  const otherGroups = groups.filter(g => !isSituationGroup(g));

  let numSituationGroups = calculateSituationGroups(totalQuestions);
  numSituationGroups = Math.min(numSituationGroups, situationGroups.length);

  const selectedSituations = shuffleArray(situationGroups).slice(0, numSituationGroups);
  const shuffledOthers = shuffleArray(otherGroups);

  const exam = [];
  selectedSituations.forEach(g => exam.push(...g));

  let remaining = totalQuestions - exam.length;
  for (const g of shuffledOthers) {
    if (remaining <= 0) break;
    if (g.length <= remaining) {
      exam.push(...g);
      remaining -= g.length;
    } else {
      exam.push(...g.slice(0, remaining));
      remaining = 0;
      break;
    }
  }

  if (exam.length < totalQuestions) {
    const allQuestions = Object.values(groupsObj).flat();
    const candidates = allQuestions.filter(q => !exam.includes(q));
    exam.push(...shuffleArray(candidates).slice(0, totalQuestions - exam.length));
  }

  return exam.slice(0, totalQuestions);
}

function randomizeAcrossSections(allQuestionsBySection, totalQuestions) {
  const sections = Object.keys(allQuestionsBySection);
  const base = Math.floor(totalQuestions / sections.length);
  let remainder = totalQuestions - base * sections.length;

  const counts = {};
  sections.forEach(s => counts[s] = base);
  const shuffled = shuffleArray(sections);
  for (let i = 0; i < remainder; i++) {
    counts[shuffled[i % shuffled.length]] += 1;
  }

  let finalExam = [];
  for (const sec of sections) {
    const pool = allQuestionsBySection[sec] || [];
    if (pool.length === 0) continue;
    const groups = groupQuestionsById(pool);
    const part = randomizeExam(groups, counts[sec]);
    finalExam.push(...part);
  }

  if (finalExam.length < totalQuestions) {
    const allPool = Object.values(allQuestionsBySection).flat();
    const extras = allPool.filter(q => !finalExam.includes(q));
    finalExam.push(...shuffleArray(extras).slice(0, totalQuestions - finalExam.length));
  }

  return finalExam.slice(0, totalQuestions);
}

// =========================
// DOM Helpers
// =========================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`screen-${id}`);
  if (el) el.classList.remove('hidden');
}

function switchScreen(id) {
  showScreen(id);
}

// =========================
// Question Bank Loading
// =========================
async function loadQuestionBank() {
  try {
    const res = await fetch('question_bank.json');
    if (!res.ok) throw new Error('Failed to load question_bank.json');
    const data = await res.json();
    appState.fullQuestionBank = data.map((q, idx) => ({
      ...q,
      _internal_id: q.id || `q_${idx}`,
      correct_answer: (q.correct_answer || '').toString().trim().toUpperCase()
    }));
    renderAnswerDistribution();
  } catch (err) {
    console.error('Failed to load question bank:', err);
    appState.fullQuestionBank = [];
  }
}

// =========================
// Answer Distribution
// =========================
function computeAnswerDistribution() {
  const bank = appState.fullQuestionBank || [];
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const q of bank) {
    const a = q.correct_answer;
    if (['A', 'B', 'C', 'D'].includes(a)) counts[a]++;
  }
  const total = counts.A + counts.B + counts.C + counts.D;
  return { counts, total };
}

function renderAnswerDistribution() {
  const { counts, total } = computeAnswerDistribution();
  const container = document.getElementById('distribution-stats');
  const totalEl = document.getElementById('ad-total');
  if (!container || !totalEl) return;

  totalEl.textContent = `Total: ${total}`;
  container.innerHTML = '';

  const keys = ['A', 'B', 'C', 'D'];
  const classes = { A: 'bar-A', B: 'bar-B', C: 'bar-C', D: 'bar-D' };

  for (const k of keys) {
    const count = counts[k] || 0;
    const pct = total > 0 ? (count / total) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'dist-row';
    row.innerHTML = `
      <div class="dist-label">${k}</div>
      <div class="dist-bar-wrap">
        <div class="dist-bar ${classes[k]}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="dist-count">${count} (${pct.toFixed(1)}%)</div>
    `;
    container.appendChild(row);
  }
}

// =========================
// Custom Exam Logic
// =========================
function setupCustomExamBuilder() {
  const countSlider = document.getElementById('question-count');
  const timeSlider = document.getElementById('time-limit');
  const countValue = document.getElementById('question-count-value');
  const timeValue = document.getElementById('time-limit-value');

  function updateTimeDisplay() {
    const n = parseInt(countSlider.value, 10);
    countValue.textContent = n;
    const minutes = (n / 5) * 22.5;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    timeValue.textContent = `${h}h ${m}m`;
    timeSlider.value = Math.min(10, Math.max(1, h));
  }

  countSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();

  document.getElementById('btn-create-custom-exam').addEventListener('click', async () => {
    const total = parseInt(countSlider.value, 10);
    const amsthec = document.getElementById('amsthec-include').checked;
    const hpge = document.getElementById('hpge-include').checked;
    const psad = document.getElementById('psad-include').checked;

    const sections = [];
    if (amsthec) sections.push('AMSTHEC');
    if (hpge) sections.push('HPGE');
    if (psad) sections.push('PSAD');

    if (sections.length === 0) {
      alert('Please select at least one section.');
      return;
    }

    if (sections.length === 3 && total < 210) {
      alert('Minimum 210 questions required when selecting all sections.');
      return;
    }

    const bank = appState.fullQuestionBank;
    if (sections.length === 1) {
      const sec = sections[0];
      const pool = bank.filter(q => q.section === sec);
      const groups = groupQuestionsById(pool);
      appState.currentExam = randomizeExam(groups, total);
      appState.currentSection = sec;
    } else {
      const bySection = { AMSTHEC: [], HPGE: [], PSAD: [] };
      bank.forEach(q => {
        if (bySection[q.section]) bySection[q.section].push(q);
      });
      appState.currentExam = randomizeAcrossSections(bySection, total);
      appState.currentSection = 'ALL';
    }

    localStorage.setItem('currentExam', JSON.stringify(appState.currentExam));
    localStorage.setItem('currentSection', appState.currentSection);

    document.getElementById('instruction-section-title').textContent =
      sections.length === 1 ? `${sections[0]} Custom Exam` : 'All Sections (Custom Exam)';

    switchScreen('instructions');
  });
}

// =========================
// Main Menu Rendering
// =========================
function renderSectionCards() {
  const grid = document.getElementById('section-grid');
  grid.innerHTML = '';

  for (const [key, info] of Object.entries(SECTIONS)) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-card-header">
        <div class="section-card-title">${key}</div>
        <div class="section-card-score">${info.total} Qs</div>
      </div>
      <div class="section-card-description">${getSectionDescription(key)}</div>
      <div class="action-buttons">
        <div class="nav-buttons">
          <button type="button" class="btn btn-primary start-section" data-section="${key}">Start</button>
          <button type="button" class="btn btn-secondary">Instructions</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  document.querySelectorAll('.start-section').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const section = e.target.dataset.section;
      const pool = appState.fullQuestionBank.filter(q => q.section === section);
      const groups = groupQuestionsById(pool);
      appState.currentExam = randomizeExam(groups, SECTIONS[section].total);
      appState.currentSection = section;
      localStorage.setItem('currentExam', JSON.stringify(appState.currentExam));
      localStorage.setItem('currentSection', section);
      document.getElementById('instruction-section-title').textContent = `${section} Section`;
      switchScreen('instructions');
    });
  });
}

function getSectionDescription(section) {
  const map = {
    AMSTHEC: 'Mathematics, Surveying & Transportation Engineering',
    HPGE: 'Hydraulics & Geotechnical Engineering',
    PSAD: 'Structural Design & Construction'
  };
  return map[section] || '';
}

// =========================
// Initialization
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestionBank();
  renderSectionCards();
  setupCustomExamBuilder();

  // Navigation
  document.getElementById('btn-custom-exam').addEventListener('click', () => switchScreen('custom-exam'));
  document.getElementById('btn-custom-exam-back').addEventListener('click', () => switchScreen('main-menu'));
  document.getElementById('btn-instructions-back').addEventListener('click', () => switchScreen('main-menu'));
  document.getElementById('btn-start-exam').addEventListener('click', () => switchScreen('exam'));
  document.getElementById('btn-settings').addEventListener('click', () => switchScreen('settings'));
  document.getElementById('btn-settings-back').addEventListener('click', () => switchScreen('main-menu'));

  // Initial screen
  document.getElementById('screen-loading').classList.add('hidden');
  switchScreen('main-menu');
});
