"""
Evaluation script using RAGAS metrics.
Run after ingesting test documents:
  python eval.py

Set TEST_DOC_IDS in .env or pass doc_ids directly.
"""

import json
import os
from typing import List, Dict

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall, context_precision

from retriever import retrieve_chunks, query_documents

# ---------------------------------------------------------------------------
# Sample QA pairs — replace with questions relevant to YOUR uploaded papers
# ---------------------------------------------------------------------------
TEST_QUESTIONS = [
    "What are the main findings of the study?",
    "What methodology was used in the research?",
    "What limitations does the paper acknowledge?",
    "What future work do the authors suggest?",
    "How does this paper compare to prior work?",
]

GROUND_TRUTHS = [
    # Fill these in with expected answers after uploading your test documents
    "The study found significant improvements in the target metric.",
    "The authors used a mixed-methods approach combining surveys and experiments.",
    "The paper acknowledges limited sample size and potential selection bias.",
    "Authors suggest scaling the approach to larger datasets in future work.",
    "This paper improves upon prior baselines by 15% on the benchmark.",
]


def run_eval(doc_ids: List[str] = None):
    print("Running RAGAS evaluation...\n")

    questions = []
    answers = []
    contexts = []
    ground_truths = []

    for q, gt in zip(TEST_QUESTIONS, GROUND_TRUTHS):
        result = query_documents(q, doc_ids=doc_ids)
        chunks = retrieve_chunks(q, doc_ids=doc_ids)

        questions.append(q)
        answers.append(result["answer"])
        contexts.append([c["text"] for c in chunks])
        ground_truths.append(gt)

        print(f"Q: {q}")
        print(f"A: {result['answer'][:200]}...\n")

    dataset = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        }
    )

    scores = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        ],
    )

    print("\n=== RAGAS Evaluation Results ===")
    print(f"Faithfulness:        {scores['faithfulness']:.3f}")
    print(f"Answer Relevancy:    {scores['answer_relevancy']:.3f}")
    print(f"Context Precision:   {scores['context_precision']:.3f}")
    print(f"Context Recall:      {scores['context_recall']:.3f}")
    print("================================\n")

    output = {
        "scores": {
            "faithfulness": scores["faithfulness"],
            "answer_relevancy": scores["answer_relevancy"],
            "context_precision": scores["context_precision"],
            "context_recall": scores["context_recall"],
        },
        "num_questions": len(questions),
    }

    with open("eval_results.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Results saved to eval_results.json")
    return output


if __name__ == "__main__":
    doc_ids = os.getenv("TEST_DOC_IDS", "").split(",") if os.getenv("TEST_DOC_IDS") else None
    run_eval(doc_ids=doc_ids)
