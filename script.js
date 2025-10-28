/* ===== RESET & BASE STYLES ===== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
:root {
    --primary-color: #9333ea;
    --primary-hover: #7e22ce;
    --secondary-color: #ede9fe;
    --secondary-text: #6b21a8;
    --danger-color: #dc2626;
    --danger-hover: #b91c1c;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --bg-light: #f9fafb;
    --bg-card-light: #ffffff;
    --text-light: #111827;
    --text-muted-light: #6b7280;
    --border-light: #e5e7eb;
    --bg-dark: #030712;
    --bg-card-dark: #111827;
    --text-dark: #f9fafb;
    --text-muted-dark: #9ca3af;
    --border-dark: #374151;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --radius: 0.5rem;
}
body {
    font-family: system-ui, -apple-system, sans-serif;
    background-color: var(--bg-light);
    color: var(--text-light);
    line-height: 1.5;
    transition: background-color 0.3s, color 0.3s;
    font-size: 1rem;
    overflow-x: hidden;
}
body.dark {
    background-color: var(--bg-dark);
    color: var(--text-dark);
}
body.font-small {
    font-size: 0.875rem;
}
body.font-large {
    font-size: 1.125rem;
}
body.nav-step {
    overflow-x: hidden;
}
/* ===== UTILITY CLASSES ===== */
.hidden {
    display: none !important;
}
.screen {
    min-height: 100vh;
}
.container {
    max-width: 768px;
    margin: 0 auto;
    padding: 1rem;
}
.text-center {
    text-align: center;
}
.flex {
    display: flex;
}
.flex-col {
    flex-direction: column;
}
.items-center {
    align-items: center;
}
.justify-center {
    justify-content: center;
}
.justify-between {
    justify-content: space-between;
}
.gap-4 {
    gap: 1rem;
}
.gap-2 {
    gap: 0.5rem;
}
.mt-4 {
    margin-top: 1rem;
}
.mb-4 {
    margin-bottom: 1rem;
}
.p-4 {
    padding: 1rem;
}
.rounded-lg {
    border-radius: var(--radius);
}
.whitespace-pre-wrap {
    white-space: pre-wrap;
}
.text-muted {
    color: var(--text-muted-light);
}
.dark .text-muted {
    color: var(--text-muted-dark);
}
.feature-badge {
    background: var(--primary-color);
    color: white;
    border-radius: 9999px;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
    font-weight: bold;
}
.feature-badge:hover {
    background: var(--primary-hover);
    cursor: pointer;
}
/* ===== CARD COMPONENT ===== */
.card {
    background: var(--bg-card-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}
.dark .card {
    background: var(--bg-card-dark);
}
/* ===== BUTTON COMPONENT ===== */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border-radius: 9999px;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    gap: 0.5rem;
    text-decoration: none;
}
.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.btn-primary {
    background: var(--primary-color);
    color: white;
}
.btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
}
.btn-secondary {
    background: var(--secondary-color);
    color: var(--secondary-text);
}
.dark .btn-secondary {
    background: var(--border-dark);
    color: var(--text-dark);
}
.btn-secondary:hover:not(:disabled) {
    background: #ddd6fe;
}
.dark .btn-secondary:hover:not(:disabled) {
    background: var(--border-dark);
}
.btn-danger {
    background: var(--danger-color);
    color: white;
}
.btn-danger:hover:not(:disabled) {
    background: var(--danger-hover);
}
.btn-text {
    background: transparent;
    color: var(--primary-color);
}
.dark .btn-text {
    color: #c084fc;
}
.btn-text:hover:not(:disabled) {
    background: var(--secondary-color);
}
.dark .btn-text:hover:not(:disabled) {
    background: var(--border-dark);
}
.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
}
.btn-lg {
    padding: 0.75rem 2rem;
    font-size: 1rem;
}
.icon {
    width: 1rem;
    height: 1rem;
    stroke: currentColor;
    fill: none;
}
/* ===== LOADING SCREEN ===== */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
}
.spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 4px solid #e5e7eb;
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
/* ===== MAIN MENU ===== */
.header {
    text-align: center;
    margin-bottom: 2rem;
}
.header h1 {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}
#progress-text {
    color: var(--text-muted-light);
}
.dark #progress-text {
    color: var(--text-muted-dark);
}
.section-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
}
@media (min-width: 768px) {
    .section-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
.section-card {
    background: var(--bg-card-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
}
.dark .section-card {
    background: var(--bg-card-dark);
}
.section-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}
.section-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.section-card-score {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--success-color);
}
.section-card-description {
    font-size: 0.875rem;
    color: var(--text-muted-light);
    margin-bottom: 1rem;
}
.dark .section-card-description {
    color: var(--text-muted-dark);
}
.progress-container {
    height: 0.5rem;
    background: #e5e7eb;
    border-radius: 9999px;
    margin-top: 0.75rem;
}
.dark .progress-container {
    background: var(--border-dark);
}
.progress-bar {
    height: 100%;
    background: var(--success-color);
    border-radius: 9999px;
    transition: width 0.3s ease;
}
.action-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}
.nav-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
}
/* ===== INSTRUCTIONS SCREEN ===== */
.section-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    text-align: center;
}
.dark .section-title {
    color: #c084fc;
}
.section-subtitle {
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
    margin-top: 0.5rem;
}
.instructions-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #fef3c7;
    border-left: 4px solid var(--warning-color);
}
.dark .instructions-box {
    background: #374151;
    border-left-color: #d97706;
}
.instructions-title {
    font-weight: bold;
}
.instructions-list {
    margin-top: 0.5rem;
    list-style-type: disc;
    list-style-position: inside;
    color: var(--text-light);
}
.dark .instructions-list {
    color: var(--text-dark);
}
.instructions-list li {
    margin-bottom: 0.25rem;
}
.quote {
    margin-top: 1.5rem;
    text-align: center;
    font-style: italic;
    color: var(--text-muted-light);
}
.dark .quote {
    color: var(--text-muted-dark);
}
/* ===== EXAM SCREEN ===== */
.exam-header {
    background: var(--bg-card-light);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 10;
}
.dark .exam-header {
    background: var(--bg-card-dark);
}
.exam-header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.exam-info h1 {
    font-size: 1.25rem;
    font-weight: bold;
}
.exam-info p {
    font-size: 0.875rem;
    color: var(--text-muted-light);
}
.dark .exam-info p {
    color: var(--text-muted-dark);
}
.exam-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.timer {
    font-family: monospace;
    font-size: 1.5rem;
    background: #f3f4f6;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
}
.dark .timer {
    background: #1f2937;
}
.exam-content {
    flex: 1;
    overflow-y: auto;
    background: #f3f4f6;
    padding: 1rem 0;
}
.dark .exam-content {
    background: #111827;
}
.questions-container {
    max-width: 56rem;
    margin: 0 auto;
}
.question-card {
    background: var(--bg-card-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}
.dark .question-card {
    background: var(--bg-card-dark);
}
.question-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
}
.question-number {
    font-weight: bold;
    font-size: 1.125rem;
    color: var(--primary-color);
}
.dark .question-number {
    color: #c084fc;
}
.question-group {
    font-size: 0.875rem;
    color: var(--text-muted-light);
}
.dark .question-group {
    color: var(--text-muted-dark);
}
.question-stem {
    font-size: 1rem;
    margin-bottom: 1.5rem;
}
.question-image {
    max-width: 100%;
    margin: 1.5rem 0;
    text-align: center;
}
.question-image img {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    cursor: zoom-in;
}
.choices-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
}
.choice-btn {
    display: flex;
    align-items: flex-start;
    text-align: left;
    background: #f3f4f6;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    cursor: pointer;
    font-size: 1rem;
    width: 100%;
    transition: background-color 0.1s, border-color 0.1s, box-shadow 0.1s;
    gap: 0.5rem;
}
.dark .choice-btn {
    background: #1f2937;
    border-color: var(--border-dark);
    color: var(--text-dark);
}
.choice-btn:hover {
    border-color: var(--primary-color);
}
.choice-btn.selected {
    background: var(--secondary-color);
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color);
    color: var(--secondary-text);
}
.dark .choice-btn.selected {
    background: #4b5563;
    border-color: #c084fc;
    box-shadow: 0 0 0 2px #c084fc;
    color: var(--text-dark);
}
.choice-letter {
    font-weight: bold;
    color: var(--primary-color);
    min-width: 1.5rem;
}
.choice-btn.selected .choice-letter {
    color: var(--secondary-text);
}
.dark .choice-btn.selected .choice-letter {
    color: #c084fc;
}
/* Exam Footer - Fixed for mobile */
.exam-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-card-light);
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
    padding: 0.75rem 0;
    z-index: 10;
    transition: transform 0.3s ease;
}
.dark .exam-footer {
    background: var(--bg-card-dark);
}
.exam-footer .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.exam-footer.hidden {
    transform: translateY(100%);
}
/* Step Navigation Mode */
.nav-step .question-card:not(.active-question) {
    display: none !important;
}
.nav-step .exam-footer #btn-jump-to-first {
    display: none !important;
}
.nav-step .exam-footer #btn-nav-next {
    display: inline-flex !important;
}
/* ===== RESULTS SCREEN ===== */
.results-container {
    padding: 2rem 0;
}
.results-card {
    background: var(--bg-card-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    text-align: center;
    margin-bottom: 2rem;
}
.dark .results-card {
    background: var(--bg-card-dark);
}
.score {
    font-size: 4rem;
    font-weight: bold;
    margin: 0.5rem 0;
}
.score.pass {
    color: var(--success-color);
}
.score.fail {
    color: var(--danger-color);
}
.score-message {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
}
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.stat-item {
    padding: 1rem;
    border-radius: var(--radius);
    background: #f3f4f6;
    font-size: 0.875rem;
}
.dark .stat-item {
    background: #1f2937;
}
.stat-value {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 0.25rem;
}
.wrong-answers-section {
    margin-top: 2rem;
}
.wrong-answer-card {
    background: var(--bg-card-light);
    border: 1px solid var(--danger-color);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
}
.dark .wrong-answer-card {
    background: var(--bg-card-dark);
}
.wrong-answer-card .question-number {
    color: var(--danger-color);
}
.answer-comparison {
    margin-top: 1rem;
    padding: 1rem;
    background: #fef2f2;
    border-radius: var(--radius);
    border: 1px solid #fca5a5;
}
.dark .answer-comparison {
    background: #374151;
    border-color: #ef4444;
}
.user-answer {
    color: var(--danger-color);
    font-weight: 600;
}
.correct-answer {
    color: var(--success-color);
    font-weight: 600;
    margin-top: 0.5rem;
}
.explanation {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light);
    text-align: left;
    font-size: 0.9rem;
}
.dark .explanation {
    border-top-color: var(--border-dark);
}
.explanation-title {
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}
/* ===== REVIEW SCREEN ===== */
.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}
.review-header h1 {
    font-size: 1.5rem;
    font-weight: bold;
}
.review-questions-container {
    max-width: 56rem;
    margin: 0 auto;
}
.review-question-card {
    margin-bottom: 2rem;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    padding: 1.5rem;
    background: var(--bg-card-light);
    box-shadow: var(--shadow);
}
.dark .review-question-card {
    border-color: var(--border-dark);
    background: var(--bg-card-dark);
}
.review-question-card .question-header {
    margin-bottom: 0.5rem;
}
.review-question-card .question-number {
    color: #374151;
}
.dark .review-question-card .question-number {
    color: var(--text-muted-dark);
}
.review-question-card .choices-container .choice-btn {
    cursor: default;
}
.review-question-card .choices-container .choice-btn:hover {
    border-color: var(--border-light);
}
.dark .review-question-card .choices-container .choice-btn:hover {
    border-color: var(--border-dark);
}
.review-question-card .choice-btn[data-correct="true"] {
    background: #d1fae5;
    border-color: var(--success-color);
    color: var(--success-color);
    box-shadow: 0 0 0 2px var(--success-color);
}
.dark .review-question-card .choice-btn[data-correct="true"] {
    background: #064e3b;
    border-color: var(--success-color);
    color: var(--success-color);
}
.review-question-card .choice-btn.selected:not([data-correct="true"]) {
    background: #fee2e2;
    border-color: var(--danger-color);
    color: var(--danger-color);
    box-shadow: 0 0 0 2px var(--danger-color);
}
.dark .review-question-card .choice-btn.selected:not([data-correct="true"]) {
    background: #7f1d1d;
    border-color: var(--danger-color);
    color: var(--danger-color);
}
.review-question-card .explanation {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
}
.review-question-card .explanation-title {
    color: var(--success-color);
}
/* ===== SETTINGS SCREEN ===== */
.settings-group {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-light);
}
.dark .settings-group {
    border-bottom-color: var(--border-dark);
}
.settings-group h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
}
.theme-switcher button.selected,
.font-switcher button.selected,
.nav-mode-switcher button.selected {
    background: var(--primary-color);
    color: white;
}
.theme-switcher, .font-switcher, .nav-mode-switcher, .data-options {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}
/* ===== MODAL ===== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
}
.modal-content {
    background: var(--bg-card-light);
    border-radius: var(--radius);
    padding: 1.5rem;
    max-width: 90%;
    max-height: 90%;
    position: relative;
}
.dark .modal-content {
    background: var(--bg-dark);
}
.modal-content img {
    max-width: 100%;
    max-height: 80vh;
    display: block;
    object-fit: contain;
}
.modal-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(255, 255, 255, 0.8);
    border: none;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    color: var(--text-light);
}
.dark .modal-close {
    background: rgba(0, 0, 0, 0.8);
    color: var(--text-dark);
}
.modal-close:hover {
    background: white;
}
.dark .modal-close:hover {
    background: black;
}
.zoomed-image {
    max-width: 100%;
    height: auto;
}
.confirm-modal {
    text-align: center;
    padding: 2rem;
    min-width: 300px;
}
.confirm-modal h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
}
.confirm-modal p {
    margin-bottom: 1.5rem;
    color: var(--text-muted-light);
}
.dark .confirm-modal p {
    color: var(--text-muted-dark);
}
.modal-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
}
/* ===== PDF CONTAINER ===== */
.printable-container {
    display: none;
    padding: 2rem;
    font-size: 1rem;
    line-height: 1.5;
    color: #111827;
    background: #fff;
    min-height: 100vh;
}
.printable-section {
    margin-bottom: 40px;
}
.printable-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 15px;
    margin-bottom: 20px;
}
.printable-title {
    font-size: 1.5rem;
    font-weight: bold;
    text-align: center;
}
.printable-subtitle {
    font-size: 1.125rem;
    text-align: center;
    color: #6b7280;
    margin-top: 0.5rem;
}
.printable-question {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
}
.printable-question h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 0;
}
.printable-stem {
    margin: 1rem 0;
}
.printable-choices {
    margin-top: 1.5rem;
}
.printable-choice {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background: #f3f4f6;
}
.printable-figure {
    text-align: center;
    margin: 1.5rem 0;
}
.printable-figure img {
    max-width: 100%;
    height: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
}
.printable-explanation {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
}
.printable-footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 1.5rem;
    margin-top: 3rem;
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
}
/* ===== PRINT STYLES ===== */
@media print {
  /* Hide non-essential elements */
  body > *:not(.printable-container) {
    display: none !important;
  }
  /* Container styles for print */
  .printable-container {
    padding: 1.5cm;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
    page-break-inside: avoid;
    width: 100% !important;
    max-width: 100% !important;
  }
  .printable-section {
    page-break-before: always;
  }
  .printable-question {
    page-break-inside: avoid;
    margin-bottom: 30px;
    padding: 15px;
    border: 1px solid #e5e7eb;
    border-radius: 0;
  }
  .printable-question h3 {
    font-size: 14pt;
    margin-top: 0;
  }
  .printable-stem {
    margin: 15px 0;
    font-size: 12pt;
    line-height: 1.6;
  }
  .printable-choices {
    margin: 20px 0;
  }
  .printable-choice {
    padding: 8px 12px;
    margin: 5px 0;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #f9fafb;
  }
  .printable-figure {
    text-align: center;
    margin: 20px 0;
    page-break-inside: avoid;
  }
  .printable-figure img {
    max-width: 100%;
    height: auto;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
  }
  .printable-explanation {
    margin-top: 20px;
    padding: 12px;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
  }
  .printable-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 15px;
    margin-bottom: 20px;
    text-align: center;
  }
  .printable-title {
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .printable-subtitle {
    font-size: 14pt;
    color: #4b5563;
  }
  .printable-footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 15px;
    margin-top: 30px;
    text-align: center;
    font-size: 10pt;
    color: #6b7280;
  }
  /* Hide elements not needed in print */
  .printable-container .no-print {
    display: none !important;
  }
}
/* ===== ACCESSIBILITY & MOBILE OPTIMIZATIONS ===== */
:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}
/* Review Screen Enhancements */
.review-controls {
    margin-bottom: 1.5rem;
}
.review-controls select,
.review-controls input {
    width: auto;
    max-width: 200px;
    padding: 0.5rem;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
}
/* ===== NEW FEATURES ===== */
/* Feature 1: Progress Bar */
.progress-bar-container {
    width: 100%;
    height: 12px;
    background: var(--border-light);
    border-radius: 9999px;
    margin: 1rem 0;
    overflow: hidden;
}
.progress-bar-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: 9999px;
    width: 0%;
    transition: width 0.3s ease;
}
/* Feature 2: Flagged Questions */
.flagged-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    background: var(--warning-color);
    border-radius: 50%;
    margin-left: 5px;
    vertical-align: middle;
}
.flagged-question .question-number {
    color: var(--warning-color);
}
/* Feature 3: Time Spent Indicator */
.time-spent {
    font-size: 0.75rem;
    color: var(--text-muted-light);
    margin-top: 0.25rem;
}
.dark .time-spent {
    color: var(--text-muted-dark);
}
/* Feature 4: Note-taking */
.note-container {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
}
.note-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}
.note-textarea {
    width: 100%;
    height: 80px;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    padding: 0.5rem;
    resize: vertical;
}
/* Feature 5: Question Filter */
.filter-badge {
    background: var(--primary-color);
    color: white;
    border-radius: 9999px;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
    font-weight: bold;
    margin-left: 5px;
}
/* Feature 6: Question Highlighting */
.highlighted {
    background-color: #f0f9ff;
    border-left: 4px solid var(--primary-color);
    padding-left: 1rem;
}
/* Feature 7: Difficulty Rating */
.difficulty-badge {
    display: inline-block;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-left: 5px;
}
.difficulty-easy {
    background: #d1fae5;
    color: #047857;
}
.difficulty-medium {
    background: #fde68a;
    color: #854d0e;
}
.difficulty-hard {
    background: #fca5a5;
    color: #991b1b;
}
/* Feature 8: Answer Pattern Analysis */
.answer-pattern {
    padding: 0.5rem;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
}
.pattern-title {
    font-weight: bold;
}
.pattern-description {
    font-size: 0.875rem;
    color: var(--text-muted-light);
}
/* Feature 9: Study Focus Generator */
.study-focus-item {
    padding: 0.75rem;
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
}
.study-focus-item strong {
    color: var(--primary-color);
}
.study-focus-item:nth-child(1) {
    background: #f0f9ff;
    border-color: var(--primary-color);
}
.study-focus-item:nth-child(2) {
    background: #fef3c7;
    border-color: var(--warning-color);
}
/* Feature 10: Performance Stats */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.stat-item {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--bg-card-light);
    font-size: 0.875rem;
}
.dark .stat-item {
    background: var(--bg-card-dark);
}
.stat-value {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 0.25rem;
}
/* ===== MOBILE OPTIMIZATIONS ===== */
@media (max-width: 768px) {
    .exam-footer {
        padding: 0.6rem 0;
    }
    .exam-controls {
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
    }
    .timer {
        font-size: 1.25rem;
        padding: 0.4rem 0.8rem;
    }
    .action-buttons {
        flex-direction: column;
        width: 100%;
    }
    .nav-buttons {
        width: 100%;
    }
    .btn {
        width: 100%;
        max-width: none;
    }
    .btn-sm {
        font-size: 0.7rem;
        padding: 0.3rem 0.6rem;
    }
    .btn-lg {
        font-size: 0.9rem;
        padding: 0.5rem 1.5rem;
    }
    .exam-content {
        padding-bottom: 4rem; /* Extra space for footer */
    }
    /* Hide jump button on mobile in step mode */
    .nav-step .exam-footer #btn-jump-to-first {
        display: none;
    }
    /* Better mobile question layout */
    .question-stem {
        font-size: 0.95rem;
    }
    .choices-container {
        gap: 0.5rem;
    }
    .choice-btn {
        padding: 0.6rem 0.8rem;
        font-size: 0.9rem;
    }
    /* Mobile-specific review features */
    .review-controls {
        flex-direction: column;
        gap: 0.5rem;
    }
    .review-controls select,
    .review-controls input {
        max-width: 100%;
    }
    /* PDF Container Mobile */
    .printable-container {
        padding: 1.5cm;
        font-size: 10pt;
    }
    .printable-title {
        font-size: 16pt;
    }
    .printable-question h3 {
        font-size: 12pt;
    }
    .printable-stem {
        font-size: 10pt;
    }
}

// =========================
// App State & Constants
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

    showScreen('instructions');
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
      showScreen('instructions');
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
  document.getElementById('btn-custom-exam').addEventListener('click', () => showScreen('custom-exam'));
  document.getElementById('btn-custom-exam-back').addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('btn-instructions-back').addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('btn-start-exam').addEventListener('click', () => showScreen('exam'));
  document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
  document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('main-menu'));

  // Initial screen
  document.getElementById('screen-loading').classList.add('hidden');
  showScreen('main-menu');
});
