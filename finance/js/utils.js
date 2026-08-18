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
