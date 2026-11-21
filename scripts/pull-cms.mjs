// Забирает контент из Strapi перед сборкой: товары, группы, настройки, документы и фото.
// STRAPI_URL=http://localhost:1337 node scripts/pull-cms.mjs  →  src/data/cms.json + public/img/cms/*
// Без STRAPI_URL ничего не делает: сайт собирается из src/data/products.ts.
import fs from 'node:fs';
import path from 'node:path';
const API = process.env.STRAPI_URL?.replace(/\/$/, '');
const OUT = new URL('../src/data/cms.json', import.meta.url);
if (!API) {
  // старый снимок не должен попадать в сборку без Strapi
  fs.rmSync(OUT, { force: true }); fs.rmSync(new URL('../public/img/cms/', import.meta.url), { recursive: true, force: true });
  console.log('pull-cms: STRAPI_URL не задан — берём данные из products.ts'); process.exit(0);
}
const get = async (p) => { const r = await fetch(`${API}/api/${p}`); if (!r.ok) throw new Error(`${p}: ${r.status}`); return (await r.json()).data; };
const imgDir = new URL('../public/img/cms/', import.meta.url); fs.rmSync(imgDir, { recursive: true, force: true }); fs.mkdirSync(imgDir, { recursive: true });
const saved = new Map();
const img = async (f) => {
  if (!f) return '';
  if (saved.has(f.url)) return saved.get(f.url);
  const name = `${f.hash}${f.ext}`;
  const r = await fetch(f.url.startsWith('http') ? f.url : API + f.url);
  fs.writeFileSync(new URL(name, imgDir), Buffer.from(await r.arrayBuffer()));
  saved.set(f.url, `cms/${name}`); return `cms/${name}`;
};
const [products, groups, setting, documents] = await Promise.all([
  get('products?populate=*&sort=sort:asc&pagination[pageSize]=200'), get('groups?populate=*&sort=sort:asc'), get('setting'), get('documents?pagination[pageSize]=50'),
]);
const P = [];
for (const p of products) {
  const gallery = []; for (const f of p.images || []) gallery.push(await img(f));
  P.push({ slug: p.slug, group: p.group, title: p.title, short: p.short, sku: p.sku || '', price: p.price, img: gallery[0] || '', gallery,
    note: p.note || undefined, length: p.length ? Number(p.length) : undefined, specs: (p.specs || []).map((s) => [s.label, s.value]),
    set: p.set?.length ? p.set.map((s) => s.text) : undefined, text: p.text ? p.text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean) : undefined });
}
const G = {};
for (const g of groups) G[g.key] = { slug: g.slug, title: g.title, note: g.note || '', img: await img(g.image) };
fs.writeFileSync(OUT, JSON.stringify({ products: P, groups: G, setting, documents: documents.map((d) => ({ slug: d.slug, title: d.title, body: d.body || '' })) }, null, 1));
console.log(`pull-cms: ${P.length} товаров, ${Object.keys(G).length} групп, ${documents.length} документов, ${saved.size} фото`);
