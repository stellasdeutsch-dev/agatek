// После сборки: неразрывные пробелы в текстах dist/*.html — после однобуквенных слов, перед тире,
// между числом и единицей, внутри цен («27 000 ₽»). Скрипты, стили и атрибуты не трогаем.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const NB = ' ';
const fix = (t) => t
  .replace(/(^|[\s(«„>])([а-яёА-ЯЁ]) (?=\S)/g, `$1$2${NB}`)
  .replace(/ (—|–)(?=\s)/g, `${NB}$1`)
  .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`)
  .replace(/(\d) (₽|мм|м|см|шт\.?|кг|мин)(?=[\s.,;:)»]|$)/g, `$1${NB}$2`)
  .replace(/(№|§) (\d)/g, `$1${NB}$2`);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
let n = 0;
for (const f of walk('dist')) {
  const src = readFileSync(f, 'utf8');
  const keep = [];
  const masked = src.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  const out = masked.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<') || !part.trim()) return part;
    const r = fix(part); if (r !== part) n++; return r;
  }).join('').replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
  writeFileSync(f, out);
}
console.log('typograf: исправлено фрагментов', n);
