// Общий скрипт: корзина (localStorage), меню, галерея, количество, 3D-сцены по требованию.
type Item = { slug: string; title: string; price: number; img: string; url: string; qty: number };
const KEY = 'agatek-cart';
const read = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (c: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} ; paint(); document.dispatchEvent(new CustomEvent('cart')); };
export const cart = { read, write };
(window as any).__cart = cart;

function paint() {
  const n = read().reduce((a, i) => a + i.qty, 0);
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => { el.textContent = String(n); el.hidden = n === 0; });
}
paint();

const toast = document.querySelector<HTMLElement>('[data-toast]');
let tt = 0;
function say(text: string) {
  if (!toast) return;
  toast.querySelector('[data-toast-t]')!.textContent = text;
  toast.hidden = false; requestAnimationFrame(() => toast.classList.add('on'));
  clearTimeout(tt); tt = window.setTimeout(() => { toast.classList.remove('on'); setTimeout(() => (toast.hidden = true), 250); }, 2600);
}

// «В корзину»: data-add='{"slug":..}' и необязательный источник количества data-qty-from
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-add]');
  if (!b) return;
  e.preventDefault();
  const it = JSON.parse(b.dataset.add!);
  const q = b.dataset.qtyFrom ? Number(document.querySelector<HTMLElement>(b.dataset.qtyFrom)?.textContent || 1) : 1;
  const c = read(); const f = c.find((x) => x.slug === it.slug);
  if (f) f.qty += q; else c.push({ ...it, qty: q });
  write(c); say(`${it.title}: добавлено в корзину`);
  b.classList.add('added'); setTimeout(() => b.classList.remove('added'), 900);
});

// количество
document.querySelectorAll<HTMLElement>('[data-qty]').forEach((q) => {
  const v = q.querySelector('span')!;
  q.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    const n = Math.max(1, Math.min(99, Number(v.textContent) + (b.dataset.d === '+' ? 1 : -1)));
    v.textContent = String(n);
  });
});

// галерея
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
  const main = g.querySelector<HTMLImageElement>('[data-main]');
  g.querySelectorAll<HTMLButtonElement>('.thumb').forEach((t) => t.addEventListener('click', () => {
    g.querySelectorAll('.thumb').forEach((x) => x.setAttribute('aria-current', 'false'));
    t.setAttribute('aria-current', 'true');
    if (t.dataset.view === '3d') { g.classList.add('is-3d'); return; }
    g.classList.remove('is-3d');
    if (main) { main.src = t.dataset.src!; main.classList.toggle('cover', t.dataset.cover === '1'); }
  }));
});

// меню на планшете и телефоне
const mb = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
const mn = document.querySelector<HTMLElement>('[data-menu]');
mb?.addEventListener('click', () => {
  const open = mn!.hidden; mn!.hidden = !open; mb.setAttribute('aria-expanded', String(open));
  mb.innerHTML = open ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h11"/></svg>';
  mb.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
});

// переключатели длины: data-len-group, кнопки [data-len]
document.querySelectorAll<HTMLElement>('[data-len-group]').forEach((g) => {
  g.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-len]'); if (!b) return;
    g.querySelectorAll('[data-len]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.dispatchEvent(new CustomEvent('len', { detail: { len: Number(b.dataset.len), slug: b.dataset.slug, price: b.dataset.price, el: b } }));
  });
});

// 3D: подгружаем three.js только когда сцена попадает в экран
const scenes = document.querySelectorAll<HTMLElement>('[data-3d]');
if (scenes.length) {
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      import('./three-scenes').then((m) => m.mount(en.target as HTMLElement)).catch((err) => console.warn('3D', err));
    });
  }, { rootMargin: '200px' });
  scenes.forEach((s) => io.observe(s));
}

// выбор длины меняет цену, «В корзину» и ссылку
document.addEventListener('len', (e: any) => {
  const b = e.detail.el as HTMLElement;
  document.querySelectorAll<HTMLElement>('[data-lenp]').forEach((w) => {
    w.querySelectorAll('[data-len]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.slug === b.dataset.slug)));
    const pr = w.querySelector('[data-len-price]'); if (pr) pr.textContent = b.dataset.price!;
    const ad = w.querySelector<HTMLElement>('[data-len-add]'); if (ad) ad.dataset.add = b.dataset.addJson!;
    const ln = w.querySelector<HTMLAnchorElement>('[data-len-link]'); if (ln) ln.href = b.dataset.url!;
  });
  document.querySelectorAll<HTMLElement>('[data-len-text]').forEach((t) => (t.textContent = String(e.detail.len).replace('.', ',') + ' м'));
});

// формы без сервера: открываем письмо с заполненными полями
document.querySelectorAll<HTMLFormElement>('form[data-mailform]').forEach((f) => f.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!f.reportValidity()) return;
  const body = [...new FormData(f).entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
  location.href = `mailto:${f.dataset.to}?subject=${encodeURIComponent(f.dataset.subject || 'Заявка с сайта')}&body=${encodeURIComponent(body)}`;
}));
