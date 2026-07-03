(function () {
  function createQuiz(app) {
    const state = {
      queue: [],
      index: 0,
      correct: 0,
      wrong: 0,
      retried: new Set(),
      done: false
    };

    function buildQueue() {
      const dueIds = new Set(window.FlashcardProgress.dueCards(app.progress, app.filtered).map((card) => card.id));
      const review = app.filtered.filter((card) => dueIds.has(card.id));
      const unlearned = app.filtered.filter((card) => window.FlashcardProgress.statusOf(app.progress, card.id) === 'none');
      const learned = app.filtered.filter((card) => window.FlashcardProgress.statusOf(app.progress, card.id) === 'learned');
      state.queue = [
        ...window.FlashcardData.shuffle(review),
        ...window.FlashcardData.shuffle(unlearned),
        ...window.FlashcardData.shuffle(learned)
      ];
      state.index = 0;
    }

    function start() {
      app.stopModes();
      app.mode = 'quiz';
      state.correct = 0;
      state.wrong = 0;
      state.retried = new Set();
      state.done = false;
      buildQueue();
      window.FlashcardUI.setMode('quiz');
      if (!state.queue.length) return complete();
      show();
    }

    function stop() {
      state.done = false;
      app.mode = 'learn';
      window.FlashcardUI.setMode('learn');
      app.applyFilters();
    }

    function show() {
      const card = state.queue[state.index];
      if (!card) return complete();
      app.isFlipped = false;
      window.FlashcardUI.setFlipped(false);
      window.FlashcardUI.renderCard({
        ...card,
        word: card.meaning || '(Không có nghĩa)',
        pos: '❓ Tìm từ tiếng Anh',
        meaning: card.word,
        example: card.pos || '',
        topic: card.topic
      }, state.index, state.queue.length, app.progress);
      window.FlashcardUI.el['speak-btn'].style.display = 'none';
      window.FlashcardUI.el['card-example-label'].textContent = card.pos ? 'Loại từ' : '';
      window.FlashcardUI.updateQuizScore(state.correct, state.wrong);
    }

    function mark(correct) {
      const card = state.queue[state.index];
      if (!card) return;
      if (correct) {
        window.FlashcardProgress.mark(app.progress, card.id, 'learned');
        state.correct++;
      } else {
        window.FlashcardProgress.mark(app.progress, card.id, 'review');
        state.wrong++;
        if (!state.retried.has(card.id)) {
          state.retried.add(card.id);
          state.queue.push(card);
        }
      }
      state.index++;
      window.FlashcardUI.updateStatus(app.progress, app.cards);
      if (state.index >= state.queue.length) return complete();
      show();
    }

    function complete() {
      state.done = true;
      const total = state.correct + state.wrong;
      const rate = total ? Math.round((state.correct / total) * 100) : 0;
      window.FlashcardUI.showEmpty('Hoàn thành!', `Đúng: ${state.correct} | Sai: ${state.wrong} | Tỉ lệ: ${rate}%`);
    }

    return { state, start, stop, show, mark };
  }

  function createMCQ(app) {
    const state = {
      queue: [],
      index: 0,
      correct: 0,
      wrong: 0,
      locked: false,
      done: false
    };

    function start() {
      if (app.filtered.length < 2) {
        alert('Cần ít nhất 2 thẻ để làm trắc nghiệm.');
        return;
      }
      app.stopModes();
      app.mode = 'mcq';
      state.queue = app.weightedQueue();
      state.index = 0;
      state.correct = 0;
      state.wrong = 0;
      state.done = false;
      window.FlashcardUI.setMode('mcq');
      window.FlashcardUI.updateMCQScore(0, 0);
      show();
    }

    function stop() {
      state.done = false;
      app.mode = 'learn';
      window.FlashcardUI.setMode('learn');
      app.applyFilters();
    }

    function distractors(card, count) {
      const sameTopic = app.filtered.filter((item) => item.id !== card.id && item.topic === card.topic && item.meaning);
      const fallback = app.filtered.filter((item) => item.id !== card.id && item.meaning);
      const pool = window.FlashcardData.shuffle([...sameTopic, ...fallback]);
      const seen = new Set();
      const result = [];
      for (const item of pool) {
        if (result.length >= count) break;
        if (!seen.has(item.meaning)) {
          seen.add(item.meaning);
          result.push({ text: item.meaning, correct: false });
        }
      }
      return result;
    }

    function show() {
      const card = state.queue[state.index];
      if (!card) return complete();
      const ui = window.FlashcardUI.el;
      ui['mcq-options'].innerHTML = '';
      ui['mcq-word'].innerHTML = card.pos
        ? `<div class="mcq-pos">${card.pos}</div>${window.FlashcardData.escapeHtml(card.word)}`
        : window.FlashcardData.escapeHtml(card.word);
      const choices = window.FlashcardData.shuffle([
        { text: card.meaning || '(Không có nghĩa)', correct: true },
        ...distractors(card, 3)
      ]);
      choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'mcq-opt';
        btn.textContent = choice.text;
        btn.dataset.correct = choice.correct ? '1' : '0';
        btn.addEventListener('click', () => select(btn));
        ui['mcq-options'].appendChild(btn);
      });
    }

    function select(btn) {
      if (state.locked) return;
      state.locked = true;
      const buttons = document.querySelectorAll('.mcq-opt');
      buttons.forEach((item) => { item.disabled = true; });
      const card = state.queue[state.index];
      if (btn.dataset.correct === '1') {
        btn.classList.add('correct');
        state.correct++;
        window.FlashcardProgress.mark(app.progress, card.id, 'learned');
      } else {
        btn.classList.add('wrong');
        buttons.forEach((item) => {
          if (item.dataset.correct === '1') item.classList.add('correct');
        });
        state.wrong++;
        window.FlashcardProgress.mark(app.progress, card.id, 'review');
      }
      window.FlashcardUI.updateMCQScore(state.correct, state.wrong);
      window.FlashcardUI.updateStatus(app.progress, app.cards);
      setTimeout(() => {
        state.locked = false;
        state.index++;
        if (state.index >= state.queue.length) complete();
        else show();
      }, 900);
    }

    function complete() {
      state.done = true;
      const total = state.correct + state.wrong;
      const rate = total ? Math.round((state.correct / total) * 100) : 0;
      window.FlashcardUI.el['mcq-word'].innerHTML = `<div style="text-align:center;padding:20px"><h2>Hoàn thành!</h2><p>Đúng: ${state.correct} | Sai: ${state.wrong} | Tỉ lệ: ${rate}%</p></div>`;
      window.FlashcardUI.el['mcq-options'].innerHTML = '';
    }

    return { state, start, stop, show };
  }

  window.FlashcardQuiz = {
    createQuiz,
    createMCQ
  };
})();
