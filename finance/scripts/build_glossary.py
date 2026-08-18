#!/usr/bin/env python3
"""
한국은행 "경제금융용어 700선" PDF에서 용어/정의 쌍을 추출해 data/glossary.json 생성.

사용법:
    pip3 install -r scripts/requirements.txt
    python3 scripts/build_glossary.py
"""
import json
import re
import sys
import tempfile
from pathlib import Path

import pdfplumber
import requests

BOK_PDF_URL = (
    "https://www.bok.or.kr/fileSrc/portal/9b9ee59b5cdb4206abc5a1a3a1844ba6"
    "/3/202306301117493201.pdf"
)
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "glossary.json"

SAMPLE_KEYWORDS = ["금리", "환율", "인플레이션", "코스피", "GDP"]


def download_pdf() -> Path:
    print(f"다운로드 중: {BOK_PDF_URL}")
    resp = requests.get(BOK_PDF_URL, timeout=60)
    resp.raise_for_status()
    tmp_path = Path(tempfile.gettempdir()) / "bok_glossary_700.pdf"
    tmp_path.write_bytes(resp.content)
    print(f"저장 완료: {tmp_path} ({len(resp.content) / 1_000_000:.1f}MB)")
    return tmp_path


def group_lines(chars):
    """char 리스트를 top 좌표 기준으로 줄 단위로 묶고, 각 줄은 x0 순으로 정렬."""
    chars = sorted(chars, key=lambda c: c["top"])
    lines = []
    current = []
    current_top = None
    for c in chars:
        if current_top is None or abs(c["top"] - current_top) <= 2.5:
            current.append(c)
            current_top = c["top"] if current_top is None else current_top
        else:
            lines.append(current)
            current = [c]
            current_top = c["top"]
    if current:
        lines.append(current)
    return [sorted(line, key=lambda c: c["x0"]) for line in lines]


def is_heading_line(line_chars) -> bool:
    return any(
        "Bold" in c["fontname"] and "NanumSquare" not in c["fontname"] and c["size"] >= 12.5
        for c in line_chars
    )


def is_header_or_index_line(line_chars, text: str) -> bool:
    if any("NanumSquare" in c["fontname"] for c in line_chars):
        return True
    stripped = text.strip()
    if stripped.isdigit():
        return True  # 페이지 하단 쪽번호
    if "경제금융용어" in stripped and "700선" in stripped:
        return True  # 우측 페이지 상단 러닝헤더 (10X10Bold, 작은 크기)
    return False


def is_related_terms_line(line_chars, text) -> bool:
    return any("YDIYGO" in c["fontname"] for c in line_chars) or text.strip().startswith("연관검색어")


def line_text(line_chars) -> str:
    return "".join(c["text"] for c in line_chars)


def extract_entries(pdf_path: Path):
    entries = []
    current_term = None
    current_body = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if "발행인" in page_text and "편집인" in page_text:
                break  # 판권 페이지 도달 -> 종료

            lines = group_lines(page.chars)
            for line_chars in lines:
                text = line_text(line_chars)
                if not text.strip():
                    continue
                if is_header_or_index_line(line_chars, text):
                    continue
                if is_heading_line(line_chars):
                    if current_term is not None:
                        entries.append((current_term, "".join(current_body)))
                    current_term = text.strip()
                    current_body = []
                    continue
                if is_related_terms_line(line_chars, text):
                    continue
                if current_term is not None:
                    current_body.append(text)

    if current_term is not None:
        entries.append((current_term, "".join(current_body)))

    return entries


def clean_entries(raw_entries):
    cleaned = []
    dropped = 0
    for term, definition in raw_entries:
        term = re.sub(r"\s+", " ", term).strip()
        definition = re.sub(r"[ \t]+", " ", definition).strip()
        if len(term) < 2 or len(definition) < 5:
            dropped += 1
            continue
        cleaned.append({"term": term, "definition": definition})
    return cleaned, dropped


def print_samples(entries):
    print("\n=== 뉴스 관련 키워드 샘플 ===")
    shown = []
    for kw in SAMPLE_KEYWORDS:
        for e in entries:
            if kw in e["term"] and e not in shown:
                shown.append(e)
                break
    for e in entries:
        if len(shown) >= 10:
            break
        if any(kw in e["term"] for kw in SAMPLE_KEYWORDS) and e not in shown:
            shown.append(e)
    for e in shown[:10]:
        print(f"\n[{e['term']}]")
        print(e["definition"][:150] + ("..." if len(e["definition"]) > 150 else ""))


def main():
    pdf_path = download_pdf()
    raw_entries = extract_entries(pdf_path)
    print(f"\n추출된 원시 항목 수: {len(raw_entries)}")

    entries, dropped = clean_entries(raw_entries)
    print(f"필터링 후 최종 항목 수: {len(entries)} (제외: {dropped}개)")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n저장 완료: {OUTPUT_PATH}")

    print_samples(entries)


if __name__ == "__main__":
    sys.exit(main())
