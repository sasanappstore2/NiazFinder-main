# RFC-001 --- Human Need Grammar (HNG)

**Version:** 1.0\
**Status:** Draft\
**Depends on:** RFC-000

## Purpose

Define a universal grammar capable of representing any marketplace need
independently of category.

## Philosophy

People do not think in categories. They think in goals, objects,
constraints and context.

The engine must translate natural language into this grammar before any
category selection.

## Canonical Structure

``` text
Actor
  ↓
Intent
  ↓
Action
  ↓
Object
  ↓
Attributes
  ↓
Constraints
  ↓
Location
  ↓
Time
  ↓
Budget
  ↓
Preference
```

## Core Nodes

### Actor

Who expresses the need.

### Intent

High-level purpose. Examples: - Buy - Sell - Rent - Repair - Replace -
Hire - Offer - Learn - Request Service

### Action

Concrete operation. Examples: replace, install, repair, compare, rent.

### Object

Primary subject. Examples: car, apartment, laptop, dog.

### Attributes

Descriptive properties. Examples: brand, color, model, bedrooms, size.

### Constraints

Hard requirements. Examples: must have parking, maximum price, within 2
days.

### Location

Free text first. Resolution happens later.

### Time

Immediate, tomorrow, next week...

### Budget

Money must never be inferred.

### Preference

Soft wishes. Examples: prefer Xiaomi, prefer owner, prefer near metro.

## Design Rules

1.  Every sentence maps to HNG.
2.  Category is derived later.
3.  Multiple intents are allowed.
4.  Unknown values remain null.
5.  Ambiguous values are preserved.
6.  Never invent missing information.

## Example

Input:

> ماشینم گیربکسش خراب شده، میخوام عوضش کنم، بنفشه هستم.

Intermediate HNG:

``` yaml
actor: user
intent: request_service
action: replace
object: gearbox
domain: automotive
location: "بنفشه"
constraints: []
budget: null
time: null
preference: null
ambiguity:
  - location
```

No category is assigned at this stage.

## Acceptance Criteria

-   Any marketplace request can be represented with HNG.
-   HNG remains independent from database schema.
-   Future AI models must produce identical HNG structures.

## Future RFCs

RFC-002 derives the Universal Need Model from HNG.
