from typing import Dict, Any, List


def split_sentences(text: str) -> List[str]:
    # naive sentence split for CN/EN punctuation
    if not text:
        return []
    seps = set("。！？!?\n")
    buf: List[str] = []
    cur = []
    for ch in text:
        cur.append(ch)
        if ch in seps:
            buf.append("".join(cur).strip())
            cur = []
    if cur:
        buf.append("".join(cur).strip())
    return [s for s in buf if s]


def chunk_document(
    doc_id: str,
    text: str,
    strategy: str = "sentence",
    max_chars: int = 400,
    overlap: int = 50,
) -> List[Dict[str, Any]]:
    if not text:
        return []
    if strategy == "paragraph":
        parts = [p.strip() for p in text.split("\n\n") if p.strip()]
    else:
        parts = split_sentences(text)

    # pack into windows up to max_chars with overlap
    chunks: List[Dict[str, Any]] = []
    buf: List[str] = []
    buf_len = 0
    idx = 0
    for sent in parts:
        if buf_len + len(sent) <= max_chars or not buf:
            buf.append(sent)
            buf_len += len(sent)
        else:
            text_chunk = "".join(buf).strip()
            if text_chunk:
                chunks.append({"doc_id": doc_id, "chunk_id": idx, "text": text_chunk})
                idx += 1
            # overlap: keep tail of buffer
            tail = text_chunk[-overlap:] if overlap > 0 else ""
            buf = [tail, sent] if tail else [sent]
            buf_len = len("".join(buf))
    if buf:
        text_chunk = "".join(buf).strip()
        if text_chunk:
            chunks.append({"doc_id": doc_id, "chunk_id": idx, "text": text_chunk})
    return chunks


