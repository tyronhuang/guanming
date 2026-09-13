global.window = globalThis;
Object.assign(globalThis, require('lunar-javascript'));
globalThis.iztro = require('iztro');
require('../js/data/strokes.js'); require('../js/data/texts.js'); require('../js/calc.js'); require('../js/match-calc.js');
const now = new Date('2026-09-13');
const P = (s, g, gender, y, m, d, h, mi, extra = {}) => FT.analyze({ surname: s, given: g, gender, calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi, ...extra }, now);
const cases = [
  [P('林', '志明', '男', 1988, 8, 8, 9, 0), P('陳', '雅婷', '女', 1990, 5, 17, 10, 30)],
  [P('王', '大明', '男', 1984, 3, 1, 0, 0, { hourUnknown: true }), P('李', '美玲', '女', 1990, 11, 22, 0, 0, { hourUnknown: true })],
  [P('', '', '男', 2000, 1, 15, 23, 30), P('歐陽', '娜', '女', 2002, 2, 10, 6, 0)]
];
for (const [g, b] of cases) {
  const m = FT.match(g, b);
  console.log(`\n== total ${m.total} ${m.grade} | skipped: ${m.skipped.join(' / ')} | gua ${m.gua.g.name}${m.gua.g.group} ${m.gua.b.name}${m.gua.b.group}`);
  m.methods.forEach((x) => console.log(`  [${x.cat}] ${x.title} ${x.score} ${x.verdict} | ${x.left} × ${x.right} | ${x.text.slice(0, 70)}`));
  console.log('  tips:', m.tips.length);
}
console.log('\nmingGua 1990男', FT.mingGua(1990, '男').name, '1990女', FT.mingGua(1990, '女').name, '2000男', FT.mingGua(2000, '男').name, '2000女', FT.mingGua(2000, '女').name, '1986男(5→坤)', FT.mingGua(1986, '男').name);
console.log('taiSui 午/午', FT.taiSui('午', '午'), '子/午', FT.taiSui('子', '午'), '寅/巳', FT.taiSui('寅', '巳'));
console.log('branch 寅亥', FT.branchRelations('寅', '亥'), '巳申', FT.branchRelations('巳', '申'));
try { FT.validateInput({ year: 1990, month: 3, day: 1, leap: true, calendar: 'lunar' }); } catch (e) { console.log('validate:', e.message); }
