---
title: "Architecture: RAG Grounding"
tags: [architecture, ai]
status: partial
---

# RAG Grounding (`src/lib/rag/`)

## هدف
Retrieval-Augmented Generation — پاسخ‌های LLM را با داده واقعی پروژه (نه صرفاً دانش عمومی مدل) زمین‌گیر (ground) می‌کند.

## کاربرد شناخته‌شده: Hybrid RAG برای تشخیص شهر/استان
طراحی مجموعه‌داده/embedding/retrieval برای grounding مکان در intake — به [[../../Research/README|Research/]] مراجعه کنید برای یافته‌های تحقیقی زمینه‌ای (baseline embedding models، چرا `bge-m3` انتخاب شد نه Gemini/e5).

## دادهٔ مرتبط
`AGENT RAG LOCATION HIERARCHY` و `INTAKE AGENT RAG` (بخش‌های pgvector در schema).

## روابط
- [[intake-hybrid-rules-llm|Architecture/AI/intake-hybrid-rules-llm]]
- [[../Backend/geo-map|Architecture/Backend/geo-map]]

## فرضیه
جزئیات دقیق pipeline retrieval (chunking، top-k، re-ranking) در این جلسه از کد استخراج نشد.
