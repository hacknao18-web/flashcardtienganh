(function () {
  function normalizeCard(item, index) {
    return {
      id: item.id || `${item.topic || 'topic'}-${item.word || 'word'}-${index}`,
      word: item.word || '',
      pos: item.pos || '',
      meaning: item.meaning || '',
      example: item.example || '',
      topic: item.topic || '',
      order: index
    };
  }

  function getCards() {
    const source = typeof VOCABULARY !== 'undefined' ? VOCABULARY : (window.VOCABULARY || []);
    return source.map(normalizeCard);
  }

  function getTopics(cards) {
    return [...new Set(cards.map((card) => card.topic).filter(Boolean))].sort();
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  }

  window.FlashcardData = {
    getCards,
    getTopics,
    shuffle,
    escapeHtml
  };
})();
