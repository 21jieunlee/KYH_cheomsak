const NAVER_NEWS_ENDPOINT = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }

  const { query, sort = 'sim', display = '20' } = req.query;

  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: '검색어(query)를 입력해 주세요.' });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
  }

  const params = new URLSearchParams({
    query: String(query),
    sort: sort === 'date' ? 'date' : 'sim',
    display: String(display),
  });

  try {
    const naverRes = await fetch(`${NAVER_NEWS_ENDPOINT}?${params.toString()}`, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    });

    const data = await naverRes.json();

    if (!naverRes.ok) {
      console.error('Naver News API error:', naverRes.status, data);
      return res.status(naverRes.status).json({ error: '뉴스를 불러오는 중 오류가 발생했습니다.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Naver News API request failed:', err);
    return res.status(502).json({ error: '뉴스 서버에 연결하지 못했습니다.' });
  }
}
