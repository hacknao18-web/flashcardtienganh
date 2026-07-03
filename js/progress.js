(function () {
  const PROGRESS_KEY = 'flashcard_progress_v2';
  const LEGACY_PROGRESS_KEY = 'flashcard_progress';
  const DARK_KEY = 'flashcard_dark';

  function normalizeProgress(raw, cards) {
    const ids = new Set(cards.map((card) => card.id));
    const fromList = (list) => Array.isArray(list) ? list.filter((id) => ids.has(id)) : [];
    return {
      learned: fromList(raw && raw.learned),
      review: fromList(raw && raw.review)
    };
  }

  function migrateLegacy(raw, cards) {
    if (!raw || !Array.isArray(raw.learned) && !Array.isArray(raw.review)) {
      return { learned: [], review: [] };
    }
    const byIndex = new Map(cards.map((card, index) => [index, card.id]));
    const convert = (list) => (Array.isArray(list) ? list : [])
      .map((value) => typeof value === 'number' ? byIndex.get(value) : value)
      .filter(Boolean);
    return {
      learned: convert(raw.learned),
      review: convert(raw.review)
    };
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function load(cards) {
    const current = readJson(PROGRESS_KEY);
    if (current) return normalizeProgress(current, cards);
    const legacy = migrateLegacy(readJson(LEGACY_PROGRESS_KEY), cards);
    save(legacy);
    return normalizeProgress(legacy, cards);
  }

  function save(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function loadDark() {
    return localStorage.getItem(DARK_KEY) === 'true';
  }

  function saveDark(value) {
    localStorage.setItem(DARK_KEY, value ? 'true' : 'false');
  }

  function mark(progress, id, status) {
    progress.learned = progress.learned.filter((item) => item !== id);
    progress.review = progress.review.filter((item) => item !== id);
    if (status === 'learned') progress.learned.push(id);
    if (status === 'review') progress.review.push(id);
    save(progress);
  }

  function toggle(progress, id, status) {
    const list = status === 'learned' ? progress.learned : progress.review;
    mark(progress, id, list.includes(id) ? 'none' : status);
  }

  function statusOf(progress, id) {
    if (progress.learned.includes(id)) return 'learned';
    if (progress.review.includes(id)) return 'review';
    return 'none';
  }

  function counts(progress, cards) {
    const learned = progress.learned.length;
    const review = progress.review.length;
    const marked = new Set([...progress.learned, ...progress.review]).size;
    return {
      learned,
      review,
      none: Math.max(cards.length - marked, 0),
      percent: cards.length ? Math.round((learned / cards.length) * 100) : 0
    };
  }

  window.FlashcardProgress = {
    load,
    save,
    loadDark,
    saveDark,
    mark,
    toggle,
    statusOf,
    counts
  };
})();
