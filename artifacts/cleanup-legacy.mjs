import fs from 'node:fs';
const file = 'src/components/App.tsx';
let source = fs.readFileSync(file, 'utf8');
const obsolete = ['_LegacyDashboard','_LegacySubjectsPage','_LegacyAbiturPage','_LegacySettingsPage','_UnusedDashboard','_UnusedSubjectsPage','_UnusedAreaSummary','_UnusedSubjectModal','_UnusedPerformanceModal','_UnusedModalFrame','_UnusedConfirmDelete','_UnusedCalculationModal','_DuplicateRulesPage','_OldOfficialCalculatorPage'];
function endOfFunction(start) {
  const open = source.indexOf('{', start);
  let depth = 0;
  let state = 'code';
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (state === 'line-comment') { if (c === '\n') state = 'code'; continue; }
    if (state === 'block-comment') { if (c === '*' && n === '/') { state = 'code'; i++; } continue; }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (c === '\\') { i++; continue; }
      if ((state === 'single' && c === "'") || (state === 'double' && c === '"') || (state === 'template' && c === '`')) state = 'code';
      continue;
    }
    if (c === '/' && n === '/') { state = 'line-comment'; i++; continue; }
    if (c === '/' && n === '*') { state = 'block-comment'; i++; continue; }
    if (c === "'") { state = 'single'; continue; }
    if (c === '"') { state = 'double'; continue; }
    if (c === '`') { state = 'template'; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return i + 1;
  }
  throw new Error(`Could not close function at ${start}`);
}
for (const name of obsolete) {
  const matches = [...source.matchAll(new RegExp(`function ${name}\\s*\\(`, 'g'))];
  if (!matches.length) continue;
  if (matches.length !== 1) throw new Error(`${name} found ${matches.length} times`);
  const start = matches[0].index;
  let end = endOfFunction(start);
  while (end < source.length && source[end] === '\n') end++;
  source = source.slice(0, start) + source.slice(end);
}
fs.writeFileSync(file, source);

const duplicatedNames = ['_UnusedSubjectModal','_UnusedPerformanceModal','_UnusedModalFrame','_UnusedConfirmDelete','_UnusedCalculationModal','_DuplicateRulesPage2','_OldOfficialCalculatorPage2'];
for (const name of duplicatedNames) {
  const matches = [...source.matchAll(new RegExp(`function ${name}\\s*\\(`, 'g'))];
  for (const match of matches.slice(0, -1).reverse()) {
    const start = match.index;
    let end = endOfFunction(start);
    while (end < source.length && source[end] === '\n') end++;
    source = source.slice(0, start) + source.slice(end);
  }
}
fs.writeFileSync(file, source);

const duplicateToKeep = ['_DuplicateRulesPage2a','_OldOfficialCalculatorPage2b'];
for (const name of duplicateToKeep) {
  const matches = [...source.matchAll(new RegExp(`function ${name}\\s*\\(`, 'g'))];
  for (const match of matches.slice(0, -1).reverse()) {
    const start = match.index;
    let end = endOfFunction(start);
    while (end < source.length && source[end] === '\n') end++;
    source = source.slice(0, start) + source.slice(end);
  }
}
fs.writeFileSync(file, source);
