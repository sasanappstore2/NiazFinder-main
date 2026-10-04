const text = '196 متر آپارتمان میخوام  شهرک دانشگاه تهران، ۱۲۲۴ میلیون رهن 66 میلیون اجاره';
const norm = (t: string) => t.normalize('NFKC')
  .replace(/[يى]/gu, 'ی').replace(/ك/gu, 'ک').replace(/[ۀة]/gu, 'ه')
  .replace(/[أإآ]/gu, 'ا').replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
  .replace(/[۰-۹٠-٩]/gu, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/\u200c/gu, ' ').replace(/[^\p{L}\p{N}()]+/gu, ' ').replace(/\s+/gu, ' ').trim();
const t = norm(text);
console.log('normalized:', t);
for (const label of ['شهرک دانشگاه', 'شهرک دانشگاه تهران']) {
  const tokens = norm(label).split(' ').filter(Boolean);
  const pattern = tokens.map((s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('\\s*');
  const re = new RegExp(`(?:^|\\s)(${pattern})(?=\\s|$|[،,؛.!؟])`, 'gu');
  const ms = [...t.matchAll(re)];
  console.log(label, '->', ms.map((m) => [m[1], m.index]));
}
