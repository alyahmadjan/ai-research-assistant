import re


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_repeated_headers_footers(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    freq = {}
    for line in lines:
        if len(line) > 3:
            freq[line] = freq.get(line, 0) + 1
    repeated = {line for line, count in freq.items() if count > max(2, len(lines) // 10)}
    cleaned = [line for line in lines if line not in repeated]
    return "\n".join(cleaned).strip()
