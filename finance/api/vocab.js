const TABLE = 'vocab_words';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY;
  return { url, serviceKey };
}

module.exports = async function handler(req, res) {
  const { url, serviceKey } = getSupabaseConfig();

  if (!url || !serviceKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: '서버에 Supabase 키가 설정되지 않았습니다.' });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    try {
      const supaRes = await fetch(`${url}/rest/v1/${TABLE}?select=*&order=saved_at.desc`, {
        headers,
      });
      const data = await supaRes.json();
      if (!supaRes.ok) {
        console.error('Supabase GET error:', supaRes.status, data);
        return res.status(supaRes.status).json({ error: '단어장을 불러오지 못했습니다.' });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ items: data });
    } catch (err) {
      console.error('Supabase GET request failed:', err);
      return res.status(502).json({ error: 'Supabase 서버에 연결하지 못했습니다.' });
    }
  }

  if (req.method === 'POST') {
    const { term, definition } = req.body || {};
    if (!term || !String(term).trim() || !definition || !String(definition).trim()) {
      return res.status(400).json({ error: 'term과 definition을 모두 입력해 주세요.' });
    }

    try {
      const supaRes = await fetch(`${url}/rest/v1/${TABLE}?on_conflict=term`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([
          {
            term: String(term).trim(),
            definition: String(definition).trim(),
            saved_at: new Date().toISOString(),
          },
        ]),
      });
      const data = await supaRes.json();
      if (!supaRes.ok) {
        console.error('Supabase POST error:', supaRes.status, data);
        return res.status(supaRes.status).json({ error: '단어를 저장하지 못했습니다.' });
      }
      return res.status(200).json({ item: Array.isArray(data) ? data[0] : data });
    } catch (err) {
      console.error('Supabase POST request failed:', err);
      return res.status(502).json({ error: 'Supabase 서버에 연결하지 못했습니다.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'GET 또는 POST 요청만 지원합니다.' });
};
