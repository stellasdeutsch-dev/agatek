export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const u = (p = '') => `${BASE}/${p.replace(/^\//, '')}`;
export const pimg = (id: string) => (id.includes('/') ? u(`img/${id}`) : u(`img/p/${id}.webp`));
export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
import { CMS } from './data/products';
const S = CMS?.setting ?? {};
const tel = (v: string) => '+' + v.replace(/\D/g, '');
const STATIC_COMPANY = {
  phone: '+7 904 767-67-65', tel: '+79047676765', phoneOpt: '+7 843 266-21-00', telOpt: '+78432662100', phoneMsk: '+7 926 559-93-98', telMsk: '+79265599398',
  email: 'agatek@bk.ru', emailMsk: 'agatek-m@mail.ru', hours: 'Пн–Пт, 9:00–17:00', msk: 'Москва, 1-й Нагатинский проезд, 12',
  legal: 'ИП Накипов Наиль Фарукович · ИНН 165900124200 · ОГРНИП 317169000131545',
  video: { garazh: 'JdldVA1zKUU', antibuksa: 'nU8UvtbM67E' }, youtube: 'https://www.youtube.com/channel/UCjapMa7ejqL1Ay8gTfzXbVw',
};
export const COMPANY = {
  ...STATIC_COMPANY,
  ...(S.phone ? { phone: S.phone, tel: tel(S.phone) } : {}),
  ...(S.phoneOpt ? { phoneOpt: S.phoneOpt, telOpt: tel(S.phoneOpt) } : {}),
  ...(S.phoneMsk ? { phoneMsk: S.phoneMsk, telMsk: tel(S.phoneMsk) } : {}),
  ...(S.email ? { email: S.email } : {}), ...(S.emailMsk ? { emailMsk: S.emailMsk } : {}),
  ...(S.hours ? { hours: S.hours } : {}), ...(S.addressMsk ? { msk: S.addressMsk } : {}), ...(S.legal ? { legal: S.legal } : {}),
  ...(S.youtube ? { youtube: S.youtube } : {}),
  hero: { title: S.heroTitle || 'Гаражные ковры', accent: S.heroAccent || 'от производителя', lead: S.heroLead || 'Защищают пол гаража и собирают стекающие с машины реагенты, воду и грязь. Упор в конце полосы подскажет, где остановиться.' },
};
