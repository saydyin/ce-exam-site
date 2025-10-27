// =========================
// Basic Config
// =========================
const SECTIONS = {
  AMSTHEC: { name: "AMSTHEC", total: 75, time: 5 * 3600 },
  HPGE: { name: "HPGE", total: 50, time: 4 * 3600 },
  PSAD: { name: "PSAD", total: 75, time: 5 * 3600 }
};

let appState = {
  fullQuestionBank: [],
  settings: { randomizeQuestions: true },
  customExam: { questionCount: 50, timeLimit: (50/5)*22.5*60 }
};

// -------------------------
// Load question bank & render main-menu distribution
// -------------------------
async function loadQuestionBankAndRender() {
  try {
    const res = await fetch('question_bank.json');
    if (!res.ok) throw new Error('Failed to load question_bank.json');
    const data = await res.json();
    appState.fullQuestionBank = data;
  } catch (err) {
    console.error('Could not load question bank:', err);
    appState.fullQuestionBank = [];
  }
  renderAnswerDistribution();
  attachMainMenuButtons();
  renderCustomExamButton();
}

// -------------------------
// Answer distribution (gather all correct_answer from question_bank.json)
// -------------------------
function computeDistributionFromBank() {
  const bank = appState.fullQuestionBank || [];
  const counts = { A:0, B:0, C:0, D:0 };
  for (const q of bank) {
    const a = (q.correct_answer || '').toString().trim().toUpperCase();
    if (['A','B','C','D'].includes(a)) counts[a]++;
  }
  const total = counts.A + counts.B + counts.C + counts.D;
  return { counts, total };
}

function renderAnswerDistribution() {
  const { counts, total } = computeDistributionFromBank();
  const card = document.getElementById('answer-distribution-card');
  const stats = document.getElementById('distribution-stats');
  document.getElementById('ad-total').textContent = `Total questions: ${total}`;
  stats.innerHTML = '';

  const keys = ['A','B','C','D'];
  const classes = { A:'bar-A', B:'bar-B', C:'bar-C', D:'bar-D' };

  for (const k of keys) {
    const count = counts[k] || 0;
    const pct = total > 0 ? Math.round((count/total)*1000)/10 : 0;
    const row = document.createElement('div');
    row.className = 'dist-row';
    row.innerHTML = `
      <div class="dist-label">${k}</div>
      <div class="dist-bar-wrap"><div class="dist-bar ${classes[k]}" style="width:${pct}%;"></div></div>
      <div class="dist-count">${count} (${pct}%)</div>
    `;
    stats.appendChild(row);
  }
}

// -------------------------
// Custom exam UI injection (placed below section cards)
// -------------------------
function renderCustomExamButton() {
  const target = document.getElementById('custom-exam-area');
  if (!target) return;
  target.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700">Custom Random Exam</div>
        <div class="text-muted">Create exam with group-safe randomization</div>
      </div>
      <div style="margin-top:0.75rem">
        <label for="ce-questions">Questions (10–200, step 5)</label>
        <input id="ce-questions" type="number" min="10" max="200" step="5" value="${appState.customExam.questionCount}" style="margin-left:0.5rem;padding:0.4rem;border-radius:6px" />
        <div style="margin-top:0.5rem" id="ce-time-display"></div>
        <div style="margin-top:0.75rem">
          <button id="btn-open-custom" class="btn btn-primary">Open Custom Builder</button>
        </div>
      </div>
    </div>
  `;
  const input = document.getElementById('ce-questions');
  const display = document.getElementById('ce-time-display');
  function updateTime() {
    let n = parseInt(input.value) || 10;
    if (n < 10) n = 10;
    if (n > 200) n = 200;
    // snap to multiple of 5
    n = Math.round(n / 5) * 5;
    input.value = n;
    const minutes = (n/5) * 22.5;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    display.textContent = `Time: ${h}h ${m}m (${minutes} minutes total)`;
    appState.customExam.questionCount = n;
    appState.customExam.timeLimit = (n/5) * 22.5 * 60;
  }
  input.addEventListener('input', updateTime);
  updateTime();

  document.getElementById('btn-open-custom').addEventListener('click', () => {
    showScreen('custom-exam');
    // set field in custom builder
    const qField = document.getElementById('questionCount');
    if (qField) qField.value = appState.customExam.questionCount;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      const minutes = (appState.customExam.questionCount/5)*22.5;
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      timeDisplay.textContent = `Time: ${h}h ${m}m`;
    }
  });
}

// -------------------------
// Screen helper (basic show/hide for our minimal screens)
// -------------------------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.remove('hidden');
  else {
    // if id is 'main-menu', show main menu
    if (id === 'main-menu') document.getElementById('screen-main-menu').classList.remove('hidden');
  }
}

// -------------------------
// Attach main-menu buttons (Settings / Instructions / Results etc.)
// -------------------------
function attachMainMenuButtons() {
  document.getElementById('btn-settings')?.addEventListener('click', () => alert('Settings placeholder'));
  document.getElementById('btn-instructions')?.addEventListener('click', () => {
    showScreen('instructions');
  });
  document.getElementById('ins-back')?.addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('ce-back')?.addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('btn-results')?.addEventListener('click', () => alert('Results placeholder'));

  // section start buttons - minimal behavior
  document.getElementById('btn-amsthec')?.addEventListener('click', () => alert('Start AMSTHEC (placeholder)'));
  document.getElementById('btn-hpge')?.addEventListener('click', () => alert('Start HPGE (placeholder)'));
  document.getElementById('btn-psad')?.addEventListener('click', () => alert('Start PSAD (placeholder)'));

  // Custom exam builder actions
  document.getElementById('generateExamBtn')?.addEventListener('click', () => {
    const n = parseInt(document.getElementById('questionCount').value) || 10;
    appState.customExam.questionCount = n;
    appState.customExam.timeLimit = (n/5) * 22.5 * 60;
    // We just inform user and close (you told no live exam/result required)
    alert(`Custom exam generated: ${n} questions. Time ${Math.round(appState.customExam.timeLimit/60)} minutes.`);
    showScreen('main-menu');
  });
}

// =========================
// Grouping & Randomization Utilities
// =========================

// Group an array of questions into an object keyed by group_id (standalone created as singletons)
function groupQuestionsById(questions) {
  const map = {};
  questions.forEach(q => {
    const gid = q.group_id || `__single_${Math.random().toString(36).slice(2,9)}`;
    if (!map[gid]) map[gid] = [];
    map[gid].push(q);
  });
  return map;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function isSituationGroup(group) {
  return group.some(q => (q.stem || '').trim().startsWith('Situation'));
}

// Your exact formula: (totalQuestions - 5) / 3 -> round down to nearest multiple of 5
function calculateSituationGroups(totalQuestions) {
  const calc = (totalQuestions - 5) / 3;
  if (isNaN(calc) || calc <= 0) return 0;
  const roundedDownTo5 = Math.floor(calc / 5) * 5;
  return roundedDownTo5;
}

/**
 * randomizeExam
 * groupsObj: map of group_id -> array of questions
 * totalQuestions: desired total question count
 *
 * This implementation:
 * - chooses up to numSituationGroups situation groups (3 questions each)
 * - places them first (keeps internal order)
 * - fills the remainder with other groups and single questions
 *
 * Returns array of questions length <= totalQuestions (trimmed to exact if needed)
 */
function randomizeExam(groupsObj, totalQuestions) {
  const groupArray = Object.values(groupsObj);
  const situationGroups = groupArray.filter(isSituationGroup);
  const otherGroups = groupArray.filter(g => !isSituationGroup(g));

  // number of situation groups by user formula
  let numSituationGroups = calculateSituationGroups(totalQuestions);
  // Ensure not more than available
  numSituationGroups = Math.min(numSituationGroups, situationGroups.length);

  const rndSit = shuffleArray(situationGroups).slice(0, numSituationGroups);
  const rndOther = shuffleArray(otherGroups);

  const exam = [];
  // Add situation groups first (each group may vary in size but typically 3)
  for (const g of rndSit) {
    exam.push(...g);
  }

  // Fill remaining slots
  let remaining = totalQuestions - exam.length;
  for (const g of rndOther) {
    if (remaining <= 0) break;
    if (g.length <= remaining) {
      exam.push(...g);
      remaining -= g.length;
    } else {
      // take slice of group if it would exceed remaining (preserves question order)
      exam.push(...g.slice(0, remaining));
      remaining = 0;
      break;
    }
  }

  // If still remaining, try to take leftover single questions from any groups
  if (remaining > 0) {
    const leftovers = [];
    for (const g of rndOther) {
      for (const q of g) {
        if (!exam.includes(q)) leftovers.push(q);
      }
    }
    const extra = shuffleArray(leftovers).slice(0, remaining);
    exam.push(...extra);
    remaining = totalQuestions - exam.length;
  }

  // Ensure exactly totalQuestions
  if (exam.length > totalQuestions) return exam.slice(0, totalQuestions);
  return exam;
}

// =========================
// Simple demo: provide function to preview a randomized custom exam (for your testing)
// =========================
window.previewCustomRandomExam = function() {
  const bank = appState.fullQuestionBank || [];
  if (!bank.length) { alert('No questions loaded'); return; }
  const groups = groupQuestionsById(bank);
  const exam = randomizeExam(groups, appState.customExam.questionCount);
  console.log('Preview exam: ', exam.map((q,i) => ({ idx:i+1, group_id:q.group_id, stem: q.stem ? q.stem.slice(0,80) : '' })));
  alert(`Previewed custom exam in console. ${exam.length} questions generated.`);
};

// =========================
// Init
// =========================
document.addEventListener('DOMContentLoaded', () => {
  loadQuestionBankAndRender();
  // Quick bindings for screens
  document.getElementById('btn-open-custom')?.addEventListener('click', () => showScreen('custom-exam'));
  document.getElementById('ce-back')?.addEventListener('click', () => showScreen('main-menu'));
  showScreen('main-menu');
});
