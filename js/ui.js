(function () {
  const ids = [
    'dark-toggle', 'topic-filter', 'card-index', 'card-total', 'search-input',
    'card-container', 'card', 'card-pos', 'card-word', 'speak-btn',
    'card-meaning', 'card-example-label', 'card-example', 'card-topic',
    'learned-btn', 'review-btn', 'mark-buttons', 'quiz-buttons', 'mcq-container', 'mcq-word', 'mcq-options',
    'mcq-score', 'mcq-correct', 'mcq-wrong', 'mcq-rate', 'matching-container',
    'matching-grid', 'matching-score', 'matching-matched', 'matching-total',
    'quiz-score', 'quiz-correct', 'quiz-wrong', 'quiz-rate', 'shuffle-btn',
    'status-filter', 'learned-count', 'review-count', 'none-count',
    'progress-fill', 'percent-text', 'quiz-btn', 'mcq-btn', 'matching-btn'
  ];

  const el = {};

  function initElements() {
    ids.forEach((id) => {
      el[id] = document.getElementById(id);
    });
    return el;
  }

  function populateTopics(topics) {
    topics.forEach((topic) => {
      const opt = document.createElement('option');
      opt.value = topic;
      opt.textContent = topic;
      el['topic-filter'].appendChild(opt);
    });
  }

  function setDark(enabled) {
    document.body.classList.toggle('dark', enabled);
    el['dark-toggle'].textContent = enabled ? '☀️' : '🌙';
  }

  function renderCard(card, index, total, progress) {
    if (!card) return showEmpty('Không có thẻ nào', 'Chọn chủ đề hoặc bộ lọc khác để học.');
    el.card.style.display = '';
    const empty = document.getElementById('empty-state');
    if (empty) empty.style.display = 'none';
    el['card-index'].textContent = index + 1;
    el['card-total'].textContent = total;
    el['card-word'].textContent = card.word;
    el['card-pos'].textContent = card.pos || '';
    el['speak-btn'].style.display = 'flex';
    el['card-meaning'].textContent = card.meaning;
    el['card-example-label'].textContent = 'Ví dụ';
    el['card-example'].textContent = card.example || '(Chưa có ví dụ)';
    el['card-topic'].textContent = card.topic || '';
    el['learned-btn'].classList.toggle('active', progress.learned.includes(card.id));
    el['review-btn'].classList.toggle('active', progress.review.includes(card.id));
  }

  function showEmpty(title, text) {
    el.card.style.display = 'none';
    let empty = document.getElementById('empty-state');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'empty-state';
      empty.className = 'empty-state';
      el['card-container'].appendChild(empty);
    }
    empty.style.display = '';
    empty.innerHTML = `<h2>${title}</h2><p>${text}</p>`;
  }

  function setFlipped(flipped) {
    el.card.classList.toggle('flipped', flipped);
  }

  function updateStatus(progress, cards) {
    const stats = window.FlashcardProgress.counts(progress, cards);
    el['learned-count'].textContent = stats.learned;
    el['review-count'].textContent = stats.review;
    el['none-count'].textContent = stats.none;
    el['progress-fill'].style.width = `${stats.percent}%`;
    el['percent-text'].textContent = `Đã biết ${stats.percent}% (${stats.learned}/${cards.length})`;
  }

  function setMode(mode) {
    const isLearn = mode === 'learn';
    el['card-container'].style.display = mode === 'mcq' || mode === 'matching' ? 'none' : '';
    el['mark-buttons'].style.display = isLearn ? 'flex' : 'none';
    el['quiz-buttons'].style.display = mode === 'quiz' ? 'flex' : 'none';
    el['quiz-score'].style.display = mode === 'quiz' ? '' : 'none';
    el['mcq-container'].style.display = mode === 'mcq' ? '' : 'none';
    el['mcq-score'].style.display = mode === 'mcq' ? '' : 'none';
    el['matching-container'].style.display = mode === 'matching' ? '' : 'none';
    el['matching-score'].style.display = mode === 'matching' ? '' : 'none';
    el['shuffle-btn'].disabled = !isLearn;
    el['shuffle-btn'].style.opacity = isLearn ? '' : '0.4';
    el['quiz-btn'].classList.toggle('active', mode === 'quiz');
    el['mcq-btn'].classList.toggle('active', mode === 'mcq');
    el['matching-btn'].classList.toggle('active', mode === 'matching');
    el['quiz-btn'].textContent = mode === 'quiz' ? '📖 Học' : '📝 Flashcard';
    el['mcq-btn'].textContent = mode === 'mcq' ? '📖 Học' : '📋 Trắc nghiệm';
    el['matching-btn'].textContent = mode === 'matching' ? '📖 Học' : '🔗 Nối từ';
  }

  function updateQuizScore(correct, wrong) {
    const total = correct + wrong;
    const rate = total ? Math.round((correct / total) * 100) : 0;
    el['quiz-correct'].textContent = correct;
    el['quiz-wrong'].textContent = wrong;
    el['quiz-rate'].textContent = `${rate}%`;
  }

  function updateMCQScore(correct, wrong) {
    const total = correct + wrong;
    const rate = total ? Math.round((correct / total) * 100) : 0;
    el['mcq-correct'].textContent = correct;
    el['mcq-wrong'].textContent = wrong;
    el['mcq-rate'].textContent = `${rate}%`;
  }

  window.FlashcardUI = {
    el,
    initElements,
    populateTopics,
    setDark,
    renderCard,
    showEmpty,
    setFlipped,
    updateStatus,
    setMode,
    updateQuizScore,
    updateMCQScore
  };
})();
