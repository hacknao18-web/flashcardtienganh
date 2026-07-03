const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'vocabulary.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);

const errors = [];
const warnings = [];
const ids = new Set();
const wordTopic = new Set();
const validTopic = /^\d+:\s+\S/;
const mojibake = /Ã|á»|Ä|Æ/;
const wordHasPos = /\s(n\.|v\.|adj\.|adv\.)$/;

function issue(list, index, message) {
  list.push(`#${index + 1}: ${message}`);
}

data.forEach((item, index) => {
  if (!item.id) issue(errors, index, 'missing id');
  if (!item.word) issue(errors, index, 'missing word');
  if (!item.meaning) issue(errors, index, 'missing meaning');
  if (!item.topic) issue(errors, index, 'missing topic');
  if (item._id !== undefined) issue(errors, index, 'uses unstable _id');
  if (item.id && ids.has(item.id)) issue(errors, index, `duplicate id ${item.id}`);
  if (item.id) ids.add(item.id);
  if (item.topic && !validTopic.test(item.topic)) issue(errors, index, `invalid topic "${item.topic}"`);
  if (mojibake.test(JSON.stringify(item))) issue(errors, index, 'possible mojibake encoding');
  if (wordHasPos.test(item.word || '')) issue(errors, index, `word includes part of speech "${item.word}"`);

  const duplicateKey = `${(item.topic || '').toLowerCase()}|${(item.word || '').toLowerCase()}`;
  if (wordTopic.has(duplicateKey)) issue(warnings, index, `duplicate word in same topic "${item.word}"`);
  wordTopic.add(duplicateKey);
});

console.log(`Checked ${data.length} cards.`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length) {
  console.error(errors.slice(0, 50).join('\n'));
}
if (warnings.length) {
  console.warn(warnings.slice(0, 20).join('\n'));
}

process.exit(errors.length ? 1 : 0);
