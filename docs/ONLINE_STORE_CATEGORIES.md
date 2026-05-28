# Online store categories (Iran e-commerce)

Taxonomy for **product verticals** sold online in Iran — aligned with Digikala/Basalam category trees, not a list of shop domains.

Registry: [`src/config/online-stores.ts`](../src/config/online-stores.ts)

## Design rules

- Leaf slugs use prefix `online-` and `depth: 1`.
- Physical shops stay in [`business-occupations.ts`](../src/config/business-occupations.ts) (`retail-trade`).
- Wizard: tab «فروشگاه اینترنتی»; max **3 selections total** with occupations tab.
- Stored in `BusinessProfile.categorySlugs` (API: `occupationSlugs`).

## Sectors → leaves (78 pickable)

| Sector | Leaves |
|--------|--------|
| `online-fashion` | clothing, footwear, traditional, hijab, bags, accessories |
| `online-jewelry-watches` | costume jewelry, gold/silver, watches, gems |
| `online-digital` | mobile, laptop, parts, gaming, AV, camera, accessories, smart home |
| `online-home-kitchen` | appliances, small kitchen, cookware, decor, furniture, bedding, carpet, lighting, textiles |
| `online-beauty-health` | cosmetics, perfume, hair, hygiene, supplements, medical consumer, herbal |
| `online-food-grocery` | supermarket, fresh, nuts/saffron, dairy, organic, beverages |
| `online-kids-baby` | baby gear, toys, kids clothing, maternity |
| `online-sports-travel` | sporting, outdoor, luggage, bicycle |
| `online-auto-motor` | auto parts, motorcycle parts, car accessories, tires |
| `online-books-culture` | books, stationery, music instruments, art supplies |
| `online-pets-plants` | pets, plants, garden tools |
| `online-gifts-crafts` | handicrafts, collectibles, flowers, religious, party |
| `online-office-b2b` | office, industrial tools, building materials, packaging |
| `online-specialty` | eyewear, CCTV, solar, fabric, tailoring supplies |
| `online-platform` | marketplace, single brand, dropshipping, social commerce, B2B wholesale |

## Digikala / Basalam coverage checklist

| Marketplace area | Online store slugs |
|--------------------|-------------------|
| مد و پوشاک | `online-clothing-apparel`, `online-footwear`, … |
| دیجیتال | `online-mobile-tablet`, `online-laptop-computer`, … |
| خانه و آشپزخانه | `online-home-appliances`, `online-furniture`, … |
| آرایشی بهداشتی | `online-cosmetics-skincare`, `online-perfume-fragrance`, … |
| خوراکی | `online-supermarket-grocery`, `online-dried-nuts-saffron`, … |
| خودرو | `online-auto-parts`, `online-tires`, … |
| کتاب و فرهنگ | `online-books`, `online-stationery` |
| باسلام: دست‌ساز / محلی | `online-handicrafts-traditional`, `online-herbal-traditional` |
| بدلیجات (user case) | `online-costume-jewelry` |

## Need matching

See [`need-to-occupation-map.ts`](../src/config/need-to-occupation-map.ts) — online slugs added alongside physical retail where buyers shop online.
