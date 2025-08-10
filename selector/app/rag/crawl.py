from typing import List, Dict, Any
import re
import httpx
from bs4 import BeautifulSoup
from readability import Document


def _clean_html(html: str) -> str:
    doc = Document(html)
    summary_html = doc.summary()
    soup = BeautifulSoup(summary_html, 'lxml')
    # remove scripts/styles
    for tag in soup(['script', 'style', 'noscript']):
        tag.extract()
    text = soup.get_text("\n")
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


async def fetch_and_extract(urls: List[str], source: str = "web") -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": "ict-selection-assistant/1.0"}) as client:
        for u in urls:
            try:
                r = await client.get(u)
                r.raise_for_status()
                text = _clean_html(r.text)
                if text:
                    out.append({"id": u, "text": text, "meta": {"source": source, "url": u}})
            except Exception:
                continue
    return out


