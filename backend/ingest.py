import hashlib
import uuid
from pathlib import Path
from typing import List, Dict, Any

import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pypdf import PdfReader

from config import (
    CHROMA_PERSIST_DIR,
    COLLECTION_NAME,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_MODEL,
    OPENAI_API_KEY,
)


def get_chroma_collection():
    client = chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return collection


def get_embeddings():
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        openai_api_key=OPENAI_API_KEY,
    )


def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"text": text, "page": i + 1})
    return pages


def extract_text_from_txt(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    return [{"text": text, "page": 1}]


def extract_text(file_path: str) -> List[Dict[str, Any]]:
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in {".txt", ".md"}:
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def ingest_document(file_path: str, filename: str) -> Dict[str, Any]:
    doc_id = str(uuid.uuid4())

    pages = extract_text(file_path)
    if not pages:
        raise ValueError("No text could be extracted from document.")

    full_text = " ".join(p["text"] for p in pages)
    content_hash = hashlib.md5(full_text.encode()).hexdigest()

    collection = get_chroma_collection()

    existing = collection.get(where={"content_hash": content_hash}, limit=1)
    if existing["ids"]:
        existing_doc_id = existing["metadatas"][0]["doc_id"]
        return {
            "doc_id": existing_doc_id,
            "filename": filename,
            "chunks": 0,
            "pages": len(pages),
            "duplicate": True,
        }

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    embedder = get_embeddings()

    all_chunks = []
    all_ids = []
    all_metadatas = []

    for page_data in pages:
        chunks = splitter.split_text(page_data["text"])
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_p{page_data['page']}_c{i}"
            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append(
                {
                    "doc_id": doc_id,
                    "filename": filename,
                    "page": page_data["page"],
                    "chunk_index": i,
                    "content_hash": content_hash,
                }
            )

    batch_size = 100
    for i in range(0, len(all_chunks), batch_size):
        batch_texts = all_chunks[i : i + batch_size]
        batch_ids = all_ids[i : i + batch_size]
        batch_metas = all_metadatas[i : i + batch_size]
        batch_embeddings = embedder.embed_documents(batch_texts)

        collection.add(
            ids=batch_ids,
            documents=batch_texts,
            embeddings=batch_embeddings,
            metadatas=batch_metas,
        )

    return {
        "doc_id": doc_id,
        "filename": filename,
        "chunks": len(all_chunks),
        "pages": len(pages),
        "duplicate": False,
    }


def delete_document(doc_id: str) -> bool:
    collection = get_chroma_collection()
    existing = collection.get(where={"doc_id": doc_id})
    if not existing["ids"]:
        return False
    collection.delete(ids=existing["ids"])
    return True


def list_documents() -> List[Dict[str, Any]]:
    collection = get_chroma_collection()
    results = collection.get(include=["metadatas"])
    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "doc_id": doc_id,
                "filename": meta["filename"],
                "pages": meta.get("page", 1),
            }
    return list(seen.values())
