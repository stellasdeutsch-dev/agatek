import { PRODUCTS, productPath } from '../data/products';
const SITE = 'https://stellasdeutsch-dev.github.io/agatek/';
const pages = ['', 'podbor/', 'garazhnye-kovry/', 'fiksatory/', 'opt/', 'o-proizvodstve/', 'dostavka-i-oplata/', 'kontakty/', 'oferta/', 'personalnye-dannye/', ...new Set(PRODUCTS.map(productPath))];
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
