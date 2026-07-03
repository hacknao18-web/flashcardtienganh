(function () {
  const PROGRESS_KEY = 'flashcard_progress_v3';
  const LEGACY_V2_KEY = 'flashcard_progress_v2';
  const LEGACY_V1_KEY = 'flashcard_progress';
  const DARK_KEY = 'flashcard_dark';
  const DAY_MS = 24 * 60 * 60 * 1000;

  function today() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(days) {
    const date = today();
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function emptyProgress() {
    return { version: 3, cards: {} };
  }

  function knownIds(cards) {
    return new Set(cards.map((card) => card.id));
  }

  function normalizeRecord(record) {
    return {
      status: record.status === 'learned' || record.status === 'review' ? record.status : 'none',
      dueDate: record.dueDate || isoDate(today()),
      ease: Number.isFinite(Number(record.ease)) ? Number(record.ease) : 2.5,
      interval: Number.isFinite(Number(record.interval)) ? Number(record.interval) : 0,
      lastReviewed: record.lastReviewed || null,
      repetitions: Number.isFinite(Number(record.repetitions)) ? Number(record.repetitions) : 0,
      lapses: Number.isFinite(Number(record.lapses)) ? Number(record.lapses) : 0
    };
  }

  function normalizeProgress(raw, cards) {
    const ids = knownIds(cards);
    const progress = emptyProgress();
    const source = raw && raw.cards && typeof raw.cards === 'object' ? raw.cards : {};
    Object.entries(source).forEach(([id, record]) => {
      if (ids.has(id)) progress.cards[id] = normalizeRecord(record || {});
    });
    return progress;
  }

  function legacyListToIds(list, cards) {
    const byIndex = new Map(cards.map((card, index) => [index, card.id]));
    return (Array.isArray(list) ? list : [])
      .map((value) => typeof value === 'number' ? byIndex.get(value) : value)
      .filter(Boolean);
  }

  function migrateListProgress(raw, cards) {
    const ids = knownIds(cards);
    const progress = emptyProgress();
    legacyListToIds(raw && raw.learned, cards).forEach((id) => {
      if (!ids.has(id)) return;
      progress.cards[id] = {
        status: 'learned',
        dueDate: addDays(1),
        ease: 2.5,
        interval: 1,
        lastReviewed: isoDate(today()),
        repetitions: 1,
        lapses: 0
      };
    });
    legacyListToIds(raw && raw.review, cards).forEach((id) => {
      if (!ids.has(id)) return;
      progress.cards[id] = {
        status: 'review',
        dueDate: isoDate(today()),
        ease: 2.3,
        interval: 0,
        lastReviewed: isoDate(today()),
        repetitions: 0,
        lapses: 1
      };
    });
    return progress;
  }

  function load(cards) {
    const current = readJson(PROGRESS_KEY);
    if (current) return normalizeProgress(current, cards);

    const v2 = readJson(LEGACY_V2_KEY);
    if (v2) {
      const migrated = migrateListProgress(v2, cards);
      save(migrated);
      return migrated;
    }

    const v1 = readJson(LEGACY_V1_KEY);
    const migrated = migrateListProgress(v1, cards);
    save(migrated);
    return migrated;
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

  function isDue(record) {
    if (!record || !record.dueDate) return false;
    return new Date(`${record.dueDate}T00:00:00`).getTime() <= today().getTime();
  }

  function getRecord(progress, id) {
    return progress.cards && progress.cards[id] ? normalizeRecord(progress.cards[id]) : null;
  }

  function cardState(progress, id) {
    const record = getRecord(progress, id);
    if (!record || record.status === 'none') {
      return {
        status: 'none',
        label: 'Chưa học',
        difficulty: 'Mới',
        nextReview: 'Học lần đầu',
        dueDate: null,
        ease: 2.5,
        interval: 0,
        lastReviewed: null
      };
    }

    const due = isDue(record);
    if (record.status === 'review' || due) {
      return {
        ...record,
        status: 'review',
        label: 'Cần ôn',
        difficulty: record.lapses > 1 ? 'Rất khó' : 'Khó',
        nextReview: due ? 'Hôm nay' : record.dueDate
      };
    }

    return {
      ...record,
      status: 'learned',
      label: 'Đã biết',
      difficulty: record.ease >= 2.7 ? 'Dễ' : 'Vừa',
      nextReview: record.dueDate
    };
  }

  function statusOf(progress, id) {
    return cardState(progress, id).status;
  }

  function mark(progress, id, status) {
    if (!progress.cards) progress.cards = {};
    if (status === 'none') {
      delete progress.cards[id];
      save(progress);
      return;
    }

    const previous = getRecord(progress, id) || normalizeRecord({});
    const now = isoDate(today());
    if (status === 'learned') {
      const ease = Math.min(3, Number((previous.ease + 0.1).toFixed(2)));
      const baseInterval = previous.interval > 0 ? previous.interval : 1;
      const interval = previous.repetitions > 0 ? Math.max(1, Math.round(baseInterval * ease)) : 1;
      progress.cards[id] = {
        status: 'learned',
        dueDate: addDays(interval),
        ease,
        interval,
        lastReviewed: now,
        repetitions: previous.repetitions + 1,
        lapses: previous.lapses
      };
    } else if (status === 'review') {
      progress.cards[id] = {
        status: 'review',
        dueDate: now,
        ease: Math.max(1.3, Number((previous.ease - 0.2).toFixed(2))),
        interval: 0,
        lastReviewed: now,
        repetitions: previous.repetitions,
        lapses: previous.lapses + 1
      };
    }
    save(progress);
  }

  function toggle(progress, id, status) {
    const record = getRecord(progress, id);
    if (record && record.status === status && statusOf(progress, id) === status) {
      mark(progress, id, 'none');
      return;
    }
    mark(progress, id, status);
  }

  function dueCards(progress, cards) {
    return cards
      .filter((card) => statusOf(progress, card.id) === 'review')
      .sort((a, b) => {
        const aDate = cardState(progress, a.id).dueDate || '9999-12-31';
        const bDate = cardState(progress, b.id).dueDate || '9999-12-31';
        return aDate.localeCompare(bDate);
      });
  }

  function counts(progress, cards) {
    let learned = 0;
    let review = 0;
    let none = 0;
    cards.forEach((card) => {
      const status = statusOf(progress, card.id);
      if (status === 'learned') learned++;
      else if (status === 'review') review++;
      else none++;
    });
    return {
      learned,
      review,
      none,
      percent: cards.length ? Math.round((learned / cards.length) * 100) : 0
    };
  }

  function reset() {
    return emptyProgress();
  }

  window.FlashcardProgress = {
    load,
    save,
    loadDark,
    saveDark,
    mark,
    toggle,
    statusOf,
    cardState,
    dueCards,
    counts,
    reset
  };
})();
