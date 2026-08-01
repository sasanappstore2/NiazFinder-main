# Real-estate ontology blueprint

**Status:** Blueprint v1 · Target ontology — map onto existing slugs gradually  
**Rule:** Every subtype defines required, optional, relationships, validation, matching.

---

## 1. Intent × tenure (cross-cutting)

| Dimension | Values |
|-----------|--------|
| Tenure | Rent · Sale · Mortgage · Pre-sale · Short-term rental · Investment |
| Deal shape | Full deposit · Deposit+rent · Monthly rent · Daily · Buy · Sell |

Tenure intersects every property class below.

---

## 2. Property classes & subtypes

### Residential

| Subtype | Required (min) | Optional | Notes |
|---------|----------------|----------|-------|
| Apartment | city, deal, rooms or area | neighborhood, floor, parking, budget/rahn/rent | Highest volume |
| Villa | city, deal, area | garden, floors, neighborhood | |
| Suite / studio | city, deal | area, furnished | |
| Room share | city, deal | gender prefs, deposit | Careful matching |

### Commercial

| Subtype | Required | Optional |
|---------|----------|----------|
| Shop / storefront | city, deal, area | street frontage, use type |
| Office | city, deal, area | partition, parking |
| Mixed-use | city, deal | residential+commercial flags |

### Industrial / logistics

| Subtype | Required | Optional |
|---------|----------|----------|
| Warehouse | city, deal, area | height, truck access |
| Workshop | city, deal | power, usage |

### Land & agri

| Subtype | Required | Optional |
|---------|----------|----------|
| Land | city, deal, area | zoning, buildable |
| Garden | city, deal | water rights |
| Farm | city, deal | crop, water |

### Hospitality / short-term

| Subtype | Required | Optional |
|---------|----------|----------|
| Short-term rental | city, dates or duration, capacity | amenities, house rules |

---

## 3. Relationships

- **Parent class → subtype** (taxonomy)  
- **Subtype → template fields** (Dynamic Schema)  
- **Subtype → matching occupation slugs** (business side)  
- **Location** city ⊃ neighborhood; cross-city mentions → ambiguity  
- **Budget fields** mutually constrain by tenure (rahn/rent vs buy budget)

---

## 4. Validation rules (examples)

1. Rent tenure ⇒ forbid buy-only budget as sole money field when rahn/rent present in text.  
2. Area must be positive finite; Persian magnitude normalized.  
3. Neighborhood without city ⇒ ask or infer city from scope — don’t invent.  
4. Commercial subtype under ambiguous “مغازه/دفتر” ⇒ abstain or disambiguate — don’t force.  
5. Confidence < threshold ⇒ no auto-apply for category.

---

## 5. Matching rules (examples)

| Need subtype | Prefer business occupations |
|--------------|-----------------------------|
| Apartment rent/sale | real-estate-agent, … |
| Shop | commercial broker / agent occupations |
| Warehouse | industrial / commercial agents |
| Short-term | hospitality / STR managers if modeled |

Exact slug maps live in config (`need-to-occupation-map` etc.) — ontology doc states **intent**; code owns **ids**.

---

## 6. Implementation mapping

1. Inventory current `src/config/categories` leaves vs this matrix.  
2. Gap list → Phase 6.  
3. Each new leaf: template + rules pack + golden + corpus tags.  
4. No Presentation hardcoding of subtype logic.

---

## 7. Non-RE note

Other verticals follow the same template shape; this file is the **gold-standard pattern**, not the only vertical forever.
