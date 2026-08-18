(function () {
  const resultsEl = document.getElementById('results');
  const stateEl = document.getElementById('state');

  function renderState(kind, message) {
    resultsEl.innerHTML = '';
    if (!kind) {
      stateEl.className = 'state';
      stateEl.innerHTML = '';
      return;
    }
    stateEl.className = `state state--${kind}`;
    if (kind === 'loading') {
      stateEl.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
    } else if (kind === 'error') {
      stateEl.innerHTML = `<p>${message}</p><button id="retry-btn" type="button">다시 시도</button>`;
      document.getElementById('retry-btn').addEventListener('click', () => load());
    } else {
      stateEl.innerHTML = `<p>${message}</p>`;
    }
  }

  function renderItems(items) {
    resultsEl.innerHTML = items
      .map((item) => {
        const date = formatKoreanDate(item.saved_at);
        return `
          <article class="vocab-card">
            <div class="vocab-term">${item.term}</div>
            <p class="vocab-def">${item.definition}</p>
            <div class="vocab-date">${date} 저장</div>
          </article>
        `;
      })
      .join('');
  }

  async function load() {
    renderState('loading', '단어장을 불러오는 중입니다...');
    try {
      const res = await fetch('/api/vocab', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        renderState('error', data.error || '단어장을 불러오지 못했습니다.');
        return;
      }

      if (!data.items || data.items.length === 0) {
        renderState('empty', '저장한 단어가 아직 없습니다.');
        return;
      }

      renderState(null);
      renderItems(data.items);
    } catch (err) {
      renderState('error', '네트워크 오류가 발생했습니다.');
    }
  }

  load();
})();
