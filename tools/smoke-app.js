const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

function createElement(id = '') {
  return {
    id,
    style: {},
    dataset: {},
    disabled: false,
    value: id === 'topic-filter' || id === 'status-filter' ? 'all' : '',
    textContent: '',
    innerHTML: '',
    children: [],
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); },
      toggle(value, force) {
        const shouldAdd = force === undefined ? !this.values.has(value) : !!force;
        if (shouldAdd) this.values.add(value);
        else this.values.delete(value);
      }
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    setAttribute(name, value) {
      this[name] = value;
    }
  };
}

const elements = new Map(ids.map((id) => [id, createElement(id)]));

global.window = global;
global.document = {
  body: createElement('body'),
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  },
  createElement(tag) {
    return createElement(tag);
  },
  addEventListener() {},
  querySelectorAll() {
    return [];
  }
};
global.navigator = {};
global.localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); },
  removeItem(key) { this.store.delete(key); }
};
global.confirm = () => true;
global.alert = (message) => {
  throw new Error(`Unexpected alert: ${message}`);
};

[
  'vocab-data.js',
  'js/data.js',
  'js/progress.js',
  'js/ui.js',
  'js/quiz.js',
  'js/matching.js',
  'js/flashcard.js'
].forEach((file) => {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
});

window.FlashcardApp.init();
if (window.FlashcardApp.cards.length !== 638) {
  throw new Error(`Expected 638 cards, got ${window.FlashcardApp.cards.length}`);
}
window.FlashcardApp.nextCard();
window.FlashcardApp.flipCard();
window.FlashcardApp.markCurrent('learned');
if (window.FlashcardApp.progress.learned.length !== 1) {
  throw new Error('Mark learned smoke check failed');
}
window.FlashcardApp.quiz.start();
if (window.FlashcardApp.mode !== 'quiz') throw new Error('Quiz tab smoke check failed');
window.FlashcardApp.returnToLearn();
window.FlashcardApp.mcq.start();
if (window.FlashcardApp.mode !== 'mcq') throw new Error('MCQ tab smoke check failed');
window.FlashcardApp.returnToLearn();
window.FlashcardApp.matching.start();
if (window.FlashcardApp.mode !== 'matching') throw new Error('Matching tab smoke check failed');
window.FlashcardApp.returnToLearn();

console.log('app smoke ok');
