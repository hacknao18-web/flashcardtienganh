(function () {
  function createMatching(app) {
    const state = {
      matched: 0,
      selected: null,
      locked: false,
      batch: [],
      done: false
    };

    function start() {
      if (app.filtered.length < 2) {
        alert('Cần ít nhất 2 thẻ để chơi nối từ.');
        return;
      }
      app.stopModes();
      app.mode = 'matching';
      state.matched = 0;
      state.selected = null;
      state.locked = false;
      state.done = false;
      window.FlashcardUI.setMode('matching');
      build();
    }

    function stop() {
      state.done = false;
      app.mode = 'learn';
      window.FlashcardUI.setMode('learn');
      app.applyFilters();
    }

    function build() {
      state.batch = window.FlashcardData.shuffle(app.filtered).slice(0, 7);
      state.matched = 0;
      window.FlashcardUI.el['matching-matched'].textContent = '0';
      window.FlashcardUI.el['matching-total'].textContent = state.batch.length;
      render();
    }

    function render() {
      const grid = window.FlashcardUI.el['matching-grid'];
      grid.innerHTML = '';
      const left = window.FlashcardData.shuffle(state.batch.map((card) => ({ id: card.id, side: 'en', text: card.word })));
      let right = window.FlashcardData.shuffle(state.batch.map((card) => ({ id: card.id, side: 'vi', text: card.meaning || '(?)' })));
      if (right.some((item, index) => item.id === left[index].id)) {
        right = [...right.slice(1), right[0]];
      }
      left.forEach((leftItem, index) => {
        const row = document.createElement('div');
        row.className = 'matching-row';
        row.appendChild(createItem(leftItem));
        row.appendChild(createItem(right[index]));
        grid.appendChild(row);
      });
    }

    function createItem(item) {
      const el = document.createElement('div');
      el.className = 'matching-item';
      el.dataset.id = item.id;
      el.dataset.side = item.side;
      el.textContent = item.text;
      el.addEventListener('click', () => click(el));
      return el;
    }

    function click(el) {
      if (state.locked || el.classList.contains('matched')) return;
      if (state.selected === el) {
        el.classList.remove('selected');
        state.selected = null;
        return;
      }
      if (!state.selected) {
        el.classList.add('selected');
        state.selected = el;
        return;
      }
      const first = state.selected;
      if (first.dataset.side === el.dataset.side) {
        first.classList.remove('selected');
        el.classList.add('selected');
        state.selected = el;
        return;
      }
      state.locked = true;
      if (first.dataset.id === el.dataset.id) {
        first.classList.remove('selected');
        first.classList.add('matched');
        el.classList.add('matched');
        state.selected = null;
        state.matched++;
        window.FlashcardUI.el['matching-matched'].textContent = state.matched;
        window.FlashcardProgress.mark(app.progress, first.dataset.id, 'learned');
        window.FlashcardUI.updateStatus(app.progress, app.cards);
        state.locked = false;
        if (state.matched >= state.batch.length) complete();
      } else {
        first.classList.remove('selected');
        first.classList.add('error');
        el.classList.add('error');
        state.selected = null;
        setTimeout(() => {
          first.classList.remove('error');
          el.classList.remove('error');
          state.locked = false;
        }, 700);
      }
    }

    function complete() {
      state.done = true;
      window.FlashcardUI.el['matching-grid'].innerHTML = '<div style="text-align:center;padding:20px"><h2>Hoàn thành!</h2><p>Đã ghép đúng tất cả các cặp.</p></div>';
    }

    return { state, start, stop, build };
  }

  window.FlashcardMatching = {
    createMatching
  };
})();
