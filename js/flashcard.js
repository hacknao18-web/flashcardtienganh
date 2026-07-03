(function () {
  const app = {
    cards: [],
    filtered: [],
    currentIndex: 0,
    isFlipped: false,
    progress: { version: 3, cards: {} },
    statusFilter: 'all',
    dark: false,
    mode: 'learn',
    quiz: null,
    mcq: null,
    matching: null,

    init() {
      window.FlashcardUI.initElements();
      this.cards = window.FlashcardData.getCards();
      this.filtered = [...this.cards];
      this.progress = window.FlashcardProgress.load(this.cards);
      this.dark = window.FlashcardProgress.loadDark();
      window.FlashcardUI.setDark(this.dark);
      window.FlashcardUI.populateTopics(window.FlashcardData.getTopics(this.cards));
      this.quiz = window.FlashcardQuiz.createQuiz(this);
      this.mcq = window.FlashcardQuiz.createMCQ(this);
      this.matching = window.FlashcardMatching.createMatching(this);
      this.bindEvents();
      window.FlashcardUI.setMode('learn');
      this.showCard(0);
      window.FlashcardUI.updateStatus(this.progress, this.cards);
      this.registerServiceWorker();
    },

    bindEvents() {
      const ui = window.FlashcardUI.el;
      ui['topic-filter'].addEventListener('change', () => this.applyFilters());
      ui['status-filter'].addEventListener('change', () => {
        this.statusFilter = ui['status-filter'].value;
        this.applyFilters();
      });
      ui['search-input'].addEventListener('input', () => this.applyFilters());
      document.getElementById('prev-btn').addEventListener('click', () => this.prevCard());
      document.getElementById('next-btn').addEventListener('click', () => this.nextCard());
      document.getElementById('flip-btn').addEventListener('click', () => this.flipCard());
      document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleCards());
      document.getElementById('reset-btn').addEventListener('click', () => this.resetProgress());
      document.getElementById('learned-btn').addEventListener('click', () => this.markCurrent('learned'));
      document.getElementById('review-btn').addEventListener('click', () => this.markCurrent('review'));
      document.getElementById('correct-btn').addEventListener('click', () => this.quiz.mark(true));
      document.getElementById('wrong-btn').addEventListener('click', () => this.quiz.mark(false));
      ui['card-container'].addEventListener('click', () => this.flipCard());
      ui['speak-btn'].addEventListener('click', (event) => {
        event.stopPropagation();
        this.speakWord();
      });
      ui['dark-toggle'].addEventListener('click', () => this.toggleDark());
      ui['learn-tab'].addEventListener('click', () => this.returnToLearn());
      ui['quiz-btn'].addEventListener('click', () => this.quiz.start());
      ui['mcq-btn'].addEventListener('click', () => this.mcq.start());
      ui['matching-btn'].addEventListener('click', () => this.matching.start());
      document.addEventListener('keydown', (event) => this.handleKey(event));
    },

    returnToLearn() {
      this.mode = 'learn';
      window.FlashcardUI.setMode('learn');
      this.applyFilters();
    },

    stopModes() {
      if (this.mode === 'quiz') this.quiz.state.done = false;
      if (this.mode === 'mcq') this.mcq.state.done = false;
      if (this.mode === 'matching') this.matching.state.done = false;
      window.FlashcardUI.setMode('learn');
    },

    applyFilters() {
      if (this.mode !== 'learn') {
        this.mode = 'learn';
        window.FlashcardUI.setMode('learn');
      }
      const topic = window.FlashcardUI.el['topic-filter'].value;
      const search = window.FlashcardUI.el['search-input'].value.trim().toLowerCase();
      this.filtered = this.cards.filter((card) => {
        const matchesTopic = topic === 'all' || card.topic === topic;
        const status = window.FlashcardProgress.statusOf(this.progress, card.id);
        const matchesStatus = this.statusFilter === 'all' || status === this.statusFilter;
        const haystack = `${card.word} ${card.meaning} ${card.example}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        return matchesTopic && matchesStatus && matchesSearch;
      });
      this.currentIndex = 0;
      this.isFlipped = false;
      window.FlashcardUI.setFlipped(false);
      this.showCard(0);
      window.FlashcardUI.updateStatus(this.progress, this.cards);
    },

    showCard(index) {
      const card = this.filtered[index];
      this.currentIndex = index;
      window.FlashcardUI.el['card-total'].textContent = this.filtered.length;
      if (!card) {
        window.FlashcardUI.showEmpty('Không có thẻ nào', 'Chọn chủ đề hoặc bộ lọc khác để học.');
        return;
      }
      window.FlashcardUI.renderCard(card, index, this.filtered.length, this.progress);
    },

    flipCard() {
      if (this.mode !== 'learn' && this.mode !== 'quiz') return;
      this.isFlipped = !this.isFlipped;
      window.FlashcardUI.setFlipped(this.isFlipped);
    },

    prevCard() {
      if (!this.filtered.length || this.mode !== 'learn') return;
      this.isFlipped = false;
      window.FlashcardUI.setFlipped(false);
      this.showCard((this.currentIndex - 1 + this.filtered.length) % this.filtered.length);
    },

    nextCard() {
      if (!this.filtered.length || this.mode !== 'learn') return;
      this.isFlipped = false;
      window.FlashcardUI.setFlipped(false);
      this.showCard((this.currentIndex + 1) % this.filtered.length);
    },

    shuffleCards() {
      if (this.mode !== 'learn') return;
      this.filtered = window.FlashcardData.shuffle(this.filtered);
      this.isFlipped = false;
      window.FlashcardUI.setFlipped(false);
      this.showCard(0);
    },

    markCurrent(status) {
      const card = this.filtered[this.currentIndex];
      if (!card) return;
      window.FlashcardProgress.toggle(this.progress, card.id, status);
      window.FlashcardUI.updateStatus(this.progress, this.cards);
      this.applyFilters();
    },

    weightedQueue() {
      const dueIds = new Set(window.FlashcardProgress.dueCards(this.progress, this.filtered).map((card) => card.id));
      const review = this.filtered.filter((card) => dueIds.has(card.id));
      const unlearned = this.filtered.filter((card) => window.FlashcardProgress.statusOf(this.progress, card.id) === 'none');
      const learned = this.filtered.filter((card) => window.FlashcardProgress.statusOf(this.progress, card.id) === 'learned');
      return [
        ...window.FlashcardData.shuffle(review),
        ...window.FlashcardData.shuffle(unlearned),
        ...window.FlashcardData.shuffle(learned)
      ];
    },

    speakWord() {
      const card = this.filtered[this.currentIndex];
      if (!card || !card.word || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(card.word);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    },

    toggleDark() {
      this.dark = !this.dark;
      window.FlashcardProgress.saveDark(this.dark);
      window.FlashcardUI.setDark(this.dark);
    },

    resetProgress() {
      if (!confirm('Xóa toàn bộ tiến độ học?')) return;
      this.progress = window.FlashcardProgress.reset();
      window.FlashcardProgress.save(this.progress);
      this.applyFilters();
    },

    handleKey(event) {
      if (event.key === 'ArrowLeft') this.prevCard();
      if (event.key === 'ArrowRight') this.nextCard();
      if (event.key === ' ' || event.key === 'Space') {
        event.preventDefault();
        this.flipCard();
      }
      if (this.mode === 'quiz') {
        if (event.key === '1') this.quiz.mark(true);
        if (event.key === '2') this.quiz.mark(false);
      }
      if (this.mode === 'mcq') {
        const n = Number.parseInt(event.key, 10);
        const btn = Number.isInteger(n) ? document.querySelectorAll('.mcq-opt')[n - 1] : null;
        if (btn) btn.click();
      }
    },

    registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      if (location.protocol === 'file:') return;
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };

  window.FlashcardApp = app;
})();
