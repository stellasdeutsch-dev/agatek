// Товары, которые продаются на сайте: гаражные ковры, антибукса, фиксаторы.
// Названия, цены, артикулы и характеристики — со старого сайта агатэк.рф (ноябрь 2026).
export type Product = {
  slug: string; group: 'garazh' | 'antibuksa' | 'fiksatory'; title: string; short: string; sku: string; price: number;
  img: string; gallery: string[]; note?: string; specs: [string, string][]; set?: string[]; text?: string[]; length?: number;
};
const GARAGE_SPECS: [string, string][] = [['Ширина', '500 мм'], ['Высота борта', '45 мм'], ['Толщина', '5 мм'], ['В комплекте', '2 полосы и фиксатор']];
const STATIC_PRODUCTS: Product[] = [
  { slug: '4-2-m', group: 'garazh', title: 'Гаражные ковры, длина 4,2 м (2 полосы)', short: 'Гаражные ковры 4,2 м', sku: 'A.001.01.H', price: 23000, length: 4.2,
    img: 'garazh-kovry', gallery: ['garazh-kovry', 'garazh-kovry-fiksator', 'garazh-mazda', 'garazh-koleso'], note: 'В комплект входит фиксатор гаражных ковров',
    specs: [['Длина', '4,2 м'], ...GARAGE_SPECS], set: ['2 полосы гаражного ковра', 'Фиксатор гаражных ковров'] },
  { slug: '5-m', group: 'garazh', title: 'Гаражные ковры, длина 5 м (2 полосы)', short: 'Гаражные ковры 5 м', sku: 'A.001.02.H', price: 27000, length: 5,
    img: 'garazh-kovry', gallery: ['garazh-kovry', 'garazh-kovry-fiksator', 'garazh-mazda', 'garazh-koleso'], note: 'В комплект входит фиксатор гаражных ковров',
    specs: [['Длина', '5 м'], ...GARAGE_SPECS], set: ['2 полосы гаражного ковра', 'Фиксатор гаражных ковров'] },
  { slug: '6-m', group: 'garazh', title: 'Гаражные ковры, длина 6 м (2 полосы)', short: 'Гаражные ковры 6 м', sku: 'A.001.03.H', price: 30000, length: 6,
    img: 'garazh-kovry', gallery: ['garazh-kovry', 'garazh-kovry-fiksator', 'garazh-mazda', 'garazh-koleso'], note: 'В комплект входит фиксатор гаражных ковров',
    specs: [['Длина', '6 м'], ...GARAGE_SPECS], set: ['2 полосы гаражного ковра', 'Фиксатор гаражных ковров'] },
  { slug: 'pod-bamper', group: 'garazh', title: 'Гаражный ковёр под бампер', short: 'Ковёр под бампер', sku: 'A.001.04.H', price: 3000,
    img: 'kover-pod-bamper', gallery: ['kover-pod-bamper', 'kover-pod-bamper-chertezh'], specs: [['Габаритные размеры', '1250 × 1100 мм']] },
  { slug: 'fiksator-garazhnyh-kovrov', group: 'garazh', title: 'Фиксатор гаражных ковров (2 шт.)', short: 'Фиксатор гаражных ковров', sku: 'A.001.08.H', price: 3000,
    img: 'fiksator-garazh', gallery: ['fiksator-garazh', 'garazh-kovry-fiksator'], note: 'Фиксатор идёт в комплекте с гаражными коврами', specs: [['В упаковке', '2 шт.']] },
  { slug: 'antibuksa', group: 'antibuksa', title: 'Антибукса — антипробуксовочная резиновая лента (2 ленты)', short: 'Антибукса, 2 ленты', sku: '', price: 3500,
    img: 'antibuksa', gallery: ['antibuksa', 'antibuksa-3d', 'antibuksa-shipy', 'antibuksa-sneg-3', 'antibuksa-bagazhnik'],
    specs: [['Размеры', '940 × 200 × 27 мм'], ['В комплекте', '2 ленты'], ['Высота шипов', '7 мм'], ['Высота протектора', '10 мм'], ['Материал', 'высокопрочная резина']],
    text: ['Противопробуксовочная лента предназначена для преодоления труднопроходимых участков дороги. Грязь, снег, гололёд больше не помеха.', 'Длина ленты 90 см, её легко поместить в багажник любого легкового автомобиля, не занимая лишнего пространства.', 'Антибукса изготовлена из высокопрочной резины и подходит не только для легковых, но и для грузовых автомобилей.'] },
  { slug: 'fiksator-avtomobilnyh-kovrov', group: 'fiksatory', title: 'Фиксатор автомобильных ковров (на 2 коврика)', short: 'Фиксатор автомобильных ковров', sku: 'A.001.06.H', price: 250,
    img: 'fiksator-avto', gallery: ['fiksator-avto'], specs: [['Рассчитан на', '2 коврика']] },
  { slug: 'klipsy', group: 'fiksatory', title: 'Клипсы для крепления автоковров', short: 'Клипсы', sku: 'A.001.05.H', price: 80,
    img: 'klipsy', gallery: ['klipsy', 'krepezh-nabor'], specs: [['Подходят', 'на ковры любой марки автомобилей']],
    text: ['Клипсы для крепления автоковров. Возможно установить на ковры любой марки автомобилей.', 'Идеально подходят для штатного крепления ковров на автомобили Opel, Ford, Chevrolet, Volkswagen, Renault, Skoda, Audi, Seat.'] },
  { slug: 'vkrutka', group: 'fiksatory', title: 'Вкрутка', short: 'Вкрутка', sku: 'A.001.05.H', price: 80, img: 'vkrutka', gallery: ['vkrutka', 'krepezh-nabor'], specs: [] },
];
const STATIC_GROUPS = {
  garazh: { slug: 'garazhnye-kovry', title: 'Гаражные ковры', note: 'Защита пола от реагентов, воды и грязи', icon: 'garage', img: 'garazh-kovry', from: 23000 },
  antibuksa: { slug: 'antibuksa', title: 'Антибукса', note: 'Лента против пробуксовки в снегу и грязи', icon: 'snow', img: 'antibuksa', from: 3500 },
  fiksatory: { slug: 'fiksatory', title: 'Фиксаторы', note: 'Клипсы и фиксаторы для ковров в салоне', icon: 'clip', img: 'krepezh-nabor', from: 80 },
} as const;

// Если перед сборкой выполнен scripts/pull-cms.mjs, данные берутся из Strapi (src/data/cms.json).
const cmsFile = import.meta.glob('./cms.json', { eager: true, import: 'default' }) as Record<string, any>;
export const CMS = cmsFile['./cms.json'] ?? null;
export const PRODUCTS: Product[] = CMS?.products?.length ? CMS.products : STATIC_PRODUCTS;
const from = (g: string, fb: number) => { const ps = PRODUCTS.filter((p) => p.group === g); return ps.length ? Math.min(...ps.map((p) => p.price)) : fb; };
export const GROUPS = Object.fromEntries(Object.entries(STATIC_GROUPS).map(([k, g]) => [k, { ...g, ...(CMS?.groups?.[k] ?? {}), from: from(k, g.from) }])) as unknown as typeof STATIC_GROUPS;
export const byGroup = (g: Product['group']) => PRODUCTS.filter((p) => p.group === g);
export const productPath = (p: Product) => (p.group === 'antibuksa' ? 'antibuksa/' : `${GROUPS[p.group].slug}/${p.slug}/`);
