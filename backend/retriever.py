from typing import List, Dict, Any, Optional

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage

from config import (
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    LLM_PROVIDER,
    LLM_MODEL,
    EMBEDDING_MODEL,
    TOP_K_RESULTS,
)
from ingest import get_chroma_collection, get_embeddings


SYSTEM_PROMPT = """You are a precise research assistant. Your job is to answer questions using ONLY the context provided below.

Rules:
- Base every claim strictly on the provided context. Do not use prior knowledge.
- After each claim, cite the source using the format [filename, p.X].
- If the context does not contain enough information, say so clearly.
- When comparing multiple papers, structure your answer with clear sections.
- Be concise but thorough. Prefer bullet points for lists of findings.
"""


def get_llm():
    if LLM_PROVIDER == "anthropic":
        return ChatAnthropic(
            model=LLM_MODEL or "claude-3-haiku-20240307",
            anthropic_api_key=ANTHROPIC_API_KEY,
            max_tokens=2048,
        )
    return ChatOpenAI(
        model=LLM_MODEL or "gpt-4o-mini",
        openai_api_key=OPENAI_API_KEY,
        temperature=0.1,
        max_tokens=2048,
    )


def retrieve_chunks(
    query: str,
    doc_ids: Optional[List[str]] = None,
    top_k: int = TOP_K_RESULTS,
) -> List[Dict[str, Any]]:
    collection = get_chroma_collection()
    embedder = get_embeddings()

    query_embedding = embedder.embed_query(query)

    where_filter = None
    if doc_ids:
        if len(doc_ids) == 1:
            where_filter = {"doc_id": doc_ids[0]}
        else:
            where_filter = {"doc_id": {"$in": doc_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    if results["ids"] and results["ids"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append(
                {
                    "text": doc,
                    "filename": meta.get("filename", "Unknown"),
                    "page": meta.get("page", 1),
                    "doc_id": meta.get("doc_id", ""),
                    "relevance_score": round(1 - dist, 4),
                }
            )

    return sorted(chunks, key=lambda x: x["relevance_score"], reverse=True)


def build_context(chunks: List[Dict[str, Any]]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {chunk['filename']}, p.{chunk['page']}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(context_parts)


def query_documents(
    question: str,
    doc_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    chunks = retrieve_chunks(question, doc_ids=doc_ids)

    if not chunks:
        return {
            "answer": "No relevant content found. Please upload documents first or select specific documents to search.",
            "sources": [],
            "chunks_used": 0,
        }

    context = build_context(chunks)

    user_message = f"""Context from research documents:

{context}

---

Question: {question}

Answer based strictly on the context above, with citations."""

    llm = get_llm()
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    response = llm.invoke(messages)
    answer = response.content

    unique_sources = {}
    for chunk in chunks:
        key = f"{chunk['doc_id']}_{chunk['page']}"
        if key not in unique_sources:
            unique_sources[key] = {
                "filename": chunk["filename"],
                "page": chunk["page"],
                "doc_id": chunk["doc_id"],
                "excerpt": chunk["text"][:300] + "..." if len(chunk["text"]) > 300 else chunk["text"],
                "relevance_score": chunk["relevance_score"],
            }

    return {
        "answer": answer,
        "sources": list(unique_sources.values()),
        "chunks_used": len(chunks),
    }
