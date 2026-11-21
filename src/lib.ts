export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const u = (p = '') => `${BASE}/${p.replace(/^\//, '')}`;
export const pimg = (id: string) => u(`img/p/${id}.webp`);
export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
export const COMPANY = {
  phone: '+7 904 767-67-65', tel: '+79047676765', phoneOpt: '+7 843 266-21-00', telOpt: '+78432662100', phoneMsk: '+7 926 559-93-98', telMsk: '+79265599398',
  email: 'agatek@bk.ru', emailMsk: 'agatek-m@mail.ru', hours: 'Пн–Пт, 9:00–17:00', msk: 'Москва, 1-й Нагатинский проезд, 12',
  legal: 'ИП Накипов Наиль Фарукович · ИНН 165900124200 · ОГРНИП 317169000131545',
  video: { garazh: 'JdldVA1zKUU', antibuksa: 'nU8UvtbM67E' }, youtube: 'https://www.youtube.com/channel/UCjapMa7ejqL1Ay8gTfzXbVw',
};
