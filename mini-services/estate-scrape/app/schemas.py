from __future__ import annotations

from pydantic import BaseModel, Field


class QAPair(BaseModel):
    question: str = Field(..., min_length=8)
    answer: str = Field(..., min_length=20)


class ArticleExtract(BaseModel):
    title: str = Field(..., min_length=4)
    summary: str = Field(..., min_length=30)
    topics: list[str] = Field(default_factory=list)
    qa_pairs: list[QAPair] = Field(default_factory=list)


class TrainingMessage(BaseModel):
    role: str
    content: str


class EstateKnowledgeRow(BaseModel):
    id: str
    messages: list[TrainingMessage]
    meta: dict = Field(default_factory=dict)
