const HTML_ENTITIES = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
  '&apos;': "'",
};

function stripBoldTags(text) {
  return text.replace(/<\/?b>/g, '');
}

function decodeHtmlEntities(text) {
  return text.replace(/&quot;|&amp;|&lt;|&gt;|&#39;|&apos;/g, (match) => HTML_ENTITIES[match]);
}

function cleanNaverText(text) {
  return decodeHtmlEntities(stripBoldTags(text || ''));
}

function formatKoreanDate(pubDate) {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function extractSource(originallink) {
  try {
    return new URL(originallink).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttribute(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let glossaryHighlightRegex = null;
let glossaryHighlightRegexSource = null;

function buildGlossaryRegex(glossaryMap) {
  if (glossaryHighlightRegex && glossaryHighlightRegexSource === glossaryMap) {
    return glossaryHighlightRegex;
  }
  const sorted = [...glossaryMap.keys()].sort((a, b) => b.length - a.length);
  const pattern = sorted
    .map((term) => {
      const escaped = escapeRegExp(term);
      return /^[A-Za-z0-9]+$/.test(term) ? `\\b${escaped}\\b` : escaped;
    })
    .join('|');
  glossaryHighlightRegex = new RegExp(`(${pattern})`, 'g');
  glossaryHighlightRegexSource = glossaryMap;
  return glossaryHighlightRegex;
}

function highlightGlossaryTerms(text, glossaryMap, usedTerms) {
  if (!text || !glossaryMap || glossaryMap.size === 0) return text;
  const regex = buildGlossaryRegex(glossaryMap);
  return text.replace(regex, (match) => {
    if (usedTerms) {
      if (usedTerms.has(match)) return match;
      usedTerms.add(match);
    }
    return `<mark class="term" data-term="${escapeAttribute(match)}">${match}</mark>`;
  });
}
