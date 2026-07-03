const app = {
  cards: [],
  filtered: [],
  currentIndex: 0,
  isFlipped: false,
  topics: new Map(),
  progress: { learned: [], review: [] },
  statusFilter: 'all'
};

function cleanData() {
  for (const item of VOCABULARY) {
    if (item.meaning) item.meaning = item.meaning.replace(/([ựễổểệậẫữịụỹ])([bcdđghklmnpqrstvx])/g, '$1 $2');
    if (item.example) item.example = item.example.replace(/([ựễổểệậẫữịụỹ])([bcdđghklmnpqrstvx])/g, '$1 $2');
  }
}

function init() {
  cleanData();
  loadProgress();
  buildTopicList();
  app.cards = VOCABULARY.map((item, i) => ({ ...item, _id: i }));
  app.filtered = [...app.cards];

  document.getElementById('card-total').textContent = app.filtered.length;
  document.getElementById('topic-filter').addEventListener('change', onFilterChange);
  document.getElementById('prev-btn').addEventListener('click', prevCard);
  document.getElementById('next-btn').addEventListener('click', nextCard);
  document.getElementById('flip-btn').addEventListener('click', flipCard);
  document.getElementById('shuffle-btn').addEventListener('click', shuffleCards);
  document.getElementById('reset-btn').addEventListener('click', resetProgress);
  document.getElementById('card-container').addEventListener('click', flipCard);
  document.getElementById('learned-btn').addEventListener('click', markLearned);
  document.getElementById('review-btn').addEventListener('click', markReview);
  document.getElementById('status-filter').addEventListener('change', onStatusFilterChange);
  document.getElementById('speak-btn').addEventListener('click', (e) => { e.stopPropagation(); speakWord(); });
  document.getElementById('search-input').addEventListener('input', applyFilters);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevCard();
    if (e.key === 'ArrowRight') nextCard();
    if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); flipCard(); }
  });

  showCard(0);
  updateStatus();
}

function buildTopicList() {
  const topics = new Set();
  VOCABULARY.forEach((item) => {
    if (item.topic) topics.add(item.topic);
  });
  const sel = document.getElementById('topic-filter');
  [...topics].sort().forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

function onFilterChange() {
  applyFilters();
}

function onStatusFilterChange() {
  app.statusFilter = document.getElementById('status-filter').value;
  applyFilters();
}

function applyFilters() {
  const topicVal = document.getElementById('topic-filter').value;
  const statusVal = app.statusFilter;
  const searchVal = document.getElementById('search-input').value.trim().toLowerCase();

  let result = [...app.cards];

  if (searchVal) {
    result = result.filter((c) =>
      (c.word && c.word.toLowerCase().includes(searchVal)) ||
      (c.meaning && c.meaning.toLowerCase().includes(searchVal)) ||
      (c.example && c.example.toLowerCase().includes(searchVal))
    );
  }

  if (topicVal !== 'all') {
    result = result.filter((c) => c.topic === topicVal);
  }

  if (statusVal === 'review') {
    result = result.filter((c) => app.progress.review.includes(c._id));
  } else if (statusVal === 'learned') {
    result = result.filter((c) => app.progress.learned.includes(c._id));
  } else if (statusVal === 'none') {
    result = result.filter((c) => !app.progress.learned.includes(c._id) && !app.progress.review.includes(c._id));
  }

  app.filtered = result;
  app.currentIndex = 0;
  app.isFlipped = false;
  document.getElementById('card').classList.remove('flipped');
  document.getElementById('card-total').textContent = app.filtered.length;
  if (app.filtered.length > 0) {
    showCard(0);
  } else {
    showEmpty();
  }
  updateStatus();
}

function showCard(index) {
  const card = app.filtered[index];
  if (!card) return;

  document.getElementById('card').style.display = '';
  const empty = document.getElementById('empty-state');
  if (empty) empty.style.display = 'none';

  app.currentIndex = index;
  document.getElementById('card-index').textContent = index + 1;
  document.getElementById('card-word').textContent = card.word;
  document.getElementById('card-pos').textContent = card.pos || '';
  document.getElementById('card-meaning').textContent = card.meaning;
  document.getElementById('card-example').textContent = card.example || '(Chưa có ví dụ)';
  document.getElementById('card-topic').textContent = card.topic || '';
  updateMarkButtons(card);
}

function speakWord() {
  const card = app.filtered[app.currentIndex];
  if (!card || !card.word) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(card.word);
  utter.lang = 'en-US';
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function updateMarkButtons(card) {
  const learnedBtn = document.getElementById('learned-btn');
  const reviewBtn = document.getElementById('review-btn');
  learnedBtn.classList.toggle('active', app.progress.learned.includes(card._id));
  reviewBtn.classList.toggle('active', app.progress.review.includes(card._id));
}

function showEmpty() {
  document.getElementById('card').style.display = 'none';
  let empty = document.getElementById('empty-state');
  if (!empty) {
    empty = document.createElement('div');
    empty.id = 'empty-state';
    empty.className = 'empty-state';
    empty.innerHTML = '<h2>Không có thẻ nào</h2><p>Chọn chủ đề khác để học.</p>';
    document.getElementById('card-container').appendChild(empty);
  }
  empty.style.display = '';
}

function flipCard() {
  app.isFlipped = !app.isFlipped;
  document.getElementById('card').classList.toggle('flipped', app.isFlipped);
}

function prevCard() {
  if (app.filtered.length === 0) return;
  app.isFlipped = false;
  document.getElementById('card').classList.remove('flipped');
  const next = (app.currentIndex - 1 + app.filtered.length) % app.filtered.length;
  showCard(next);
}

function nextCard() {
  if (app.filtered.length === 0) return;
  app.isFlipped = false;
  document.getElementById('card').classList.remove('flipped');
  const next = (app.currentIndex + 1) % app.filtered.length;
  showCard(next);
}

function shuffleCards() {
  const current = app.filtered[app.currentIndex];
  for (let i = app.filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [app.filtered[i], app.filtered[j]] = [app.filtered[j], app.filtered[i]];
  }
  app.isFlipped = false;
  document.getElementById('card').classList.remove('flipped');
  showCard(0);
  updateStatus();
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('flashcard_progress');
    if (raw) app.progress = JSON.parse(raw);
  } catch { /* ignore */ }
}

function saveProgress() {
  localStorage.setItem('flashcard_progress', JSON.stringify(app.progress));
}

function updateStatus() {
  const total = app.cards.length;
  const learned = app.progress.learned.length;
  const review = app.progress.review.length;
  const none = total - new Set([...app.progress.learned, ...app.progress.review]).size;
  document.getElementById('learned-count').textContent = learned;
  document.getElementById('review-count').textContent = review;
  document.getElementById('none-count').textContent = none;
  const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('percent-text').textContent = 'Đã biết ' + pct + '% (' + learned + '/' + total + ')';
}

function markLearned() {
  const card = app.filtered[app.currentIndex];
  if (!card) return;
  const idx = app.progress.learned.indexOf(card._id);
  if (idx > -1) {
    app.progress.learned.splice(idx, 1);
  } else {
    app.progress.learned.push(card._id);
    const ri = app.progress.review.indexOf(card._id);
    if (ri > -1) app.progress.review.splice(ri, 1);
  }
  saveProgress();
  updateMarkButtons(card);
  updateStatus();
  advanceAfterMark(card);
}

function markReview() {
  const card = app.filtered[app.currentIndex];
  if (!card) return;
  const idx = app.progress.review.indexOf(card._id);
  if (idx > -1) {
    app.progress.review.splice(idx, 1);
  } else {
    app.progress.review.push(card._id);
    const li = app.progress.learned.indexOf(card._id);
    if (li > -1) app.progress.learned.splice(li, 1);
  }
  saveProgress();
  updateMarkButtons(card);
  updateStatus();
  advanceAfterMark(card);
}

function advanceAfterMark(card) {
  applyFilters();
  const nextIdx = app.filtered.findIndex((c) => c._id === card._id) + 1;
  if (nextIdx > 0 && nextIdx < app.filtered.length) {
    app.isFlipped = false;
    document.getElementById('card').classList.remove('flipped');
    showCard(nextIdx);
  }
}

function resetProgress() {
  if (!confirm('Xóa toàn bộ tiến độ học?')) return;
  app.progress = { learned: [], review: [] };
  saveProgress();
  applyFilters();
}

init();
