# RFC-000 --- NiazFinder Cognitive Engine (NCE)

**Version:** 1.0\
**Status:** Draft

## Vision

The NiazFinder Cognitive Engine (NCE) transforms natural human needs
into structured, validated, machine-understandable knowledge with
minimal user effort.

Users describe needs naturally. The platform is responsible for
understanding them.

------------------------------------------------------------------------

## Mission

Enable every user to publish any need by writing naturally instead of
filling forms.

------------------------------------------------------------------------

## Core Principles

1.  Humans describe needs; they do not fill forms.
2.  Categories are an implementation detail.
3.  AI extracts meaning; business rules make decisions.
4.  Never guess critical information.
5.  Ask the minimum number of clarification questions.
6.  Every question has a cost.
7.  Prefer structured extraction over free-form conversation.
8.  Prefer retrieval over memorized knowledge.
9.  Keep AI stateless; keep workflow state in the application.
10. Replaceable AI models are a design requirement.

------------------------------------------------------------------------

## Design Goals

-   Understand meaning instead of keywords.
-   Produce deterministic structured output.
-   Minimize user interaction.
-   Support every marketplace domain.
-   Scale without redesign.

------------------------------------------------------------------------

## Non-Goals

The Cognitive Engine is not:

-   a chatbot
-   business logic
-   pricing logic
-   moderation
-   search engine
-   database

------------------------------------------------------------------------

## High-Level Pipeline

``` text
User
  ↓
Normalization
  ↓
Meaning Extraction
  ↓
Intent
  ↓
Entity Extraction
  ↓
Candidate Retrieval
  ↓
Validation
  ↓
Ambiguity Resolution
  ↓
Structured Need
```

------------------------------------------------------------------------

## Responsibilities

### LLM

-   Understand user intent
-   Extract entities
-   Detect ambiguity
-   Estimate confidence
-   Produce structured output
-   Generate one clarification question when required

### Rule Engine

-   Marketplace policies
-   Validation
-   Category mapping
-   Workflow decisions

### Retrieval Layer

-   Locations
-   Categories
-   Brands
-   Known entities

### State Engine

-   Conversation state
-   Missing fields
-   Confirmation tracking

------------------------------------------------------------------------

## Success Criteria

The system succeeds when:

-   Users feel they only described their need.
-   Developers receive structured data.
-   AI can be replaced without changing the architecture.

------------------------------------------------------------------------

## Long-Term Vision

NCE becomes the common understanding layer powering:

-   AI Intake
-   AI Search
-   AI Matching
-   AI Recommendations
-   AI Agents
-   Voice
-   Vision

------------------------------------------------------------------------

> Humans should adapt to reality. Software should adapt to humans.
