const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const BLOCK_TAGS = 'p|div|li|h[1-6]|blockquote|tr';

function extractParagraphs(html) {
  const normalized = (html || '')
    .replace(new RegExp(`</(${BLOCK_TAGS})>`, 'gi'), '</$1>\n\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const dom = new JSDOM(`<body>${normalized}</body>`);
  const text = dom.window.document.body.textContent || '';
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }

  const { url } = req.query;
  if (!url || !String(url).trim()) {
    return res.status(400).json({ error: '기사 URL(url)을 입력해 주세요.' });
  }

  let target;
  try {
    target = new URL(String(url));
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('invalid protocol');
    }
  } catch {
    return res.status(400).json({ error: '올바르지 않은 URL입니다.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const pageRes = await fetch(target.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!pageRes.ok) {
      return res.status(502).json({ error: '원문 페이지를 불러오지 못했습니다.' });
    }

    const html = await pageRes.text();
    const dom = new JSDOM(html, { url: target.toString() });
    const article = new Readability(dom.window.document).parse();

    if (!article) {
      return res.status(422).json({ error: '본문을 추출하지 못했습니다.' });
    }

    const paragraphs = extractParagraphs(article.content);
    if (paragraphs.length === 0) {
      return res.status(422).json({ error: '본문을 추출하지 못했습니다.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      title: article.title || '',
      paragraphs,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: '원문 페이지 응답이 지연되어 시간 초과되었습니다.' });
    }
    console.error('Article extract failed:', err);
    return res.status(502).json({ error: '본문을 불러오는 중 오류가 발생했습니다.' });
  } finally {
    clearTimeout(timeout);
  }
};
