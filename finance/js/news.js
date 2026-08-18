(function () {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const chipButtons = document.querySelectorAll('.chip');
  const sortButtons = document.querySelectorAll('.sort-btn');
  const resultsEl = document.getElementById('results');
  const stateEl = document.getElementById('state');

  const state = {
    query: '금리',
    sort: 'sim',
  };

  function setActiveChip(query) {
    chipButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.keyword === query);
    });
  }

  function setActiveSort(sort) {
    sortButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sort === sort);
    });
  }

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
      document.getElementById('retry-btn').addEventListener('click', () => search());
    } else {
      stateEl.innerHTML = `<p>${message}</p>`;
    }
  }

  function renderResults(items) {
    resultsEl.innerHTML = items
      .map((item) => {
        const title = cleanNaverText(item.title);
        const description = cleanNaverText(item.description);
        const date = formatKoreanDate(item.pubDate);
        const source = extractSource(item.originallink || item.link);
        return `
          <article class="card">
            <a class="card-title" href="${item.link}" target="_blank" rel="noopener noreferrer">${title}</a>
            <p class="card-desc">${description}</p>
            <div class="card-meta">
              <span class="card-source">${source}</span>
              <span class="card-date">${date}</span>
            </div>
          </article>
        `;
      })
      .join('');
  }

  async function search() {
    const query = state.query.trim();
    if (!query) return;

    renderState('loading', '뉴스를 불러오는 중입니다...');

    try {
      const params = new URLSearchParams({ query, sort: state.sort });
      const res = await fetch(`/api/news?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        renderState('error', data.error || '뉴스를 불러오지 못했습니다.');
        return;
      }

      if (!data.items || data.items.length === 0) {
        renderState('empty', '검색 결과가 없습니다.');
        return;
      }

      renderState(null);
      renderResults(data.items);
    } catch (err) {
      renderState('error', '네트워크 오류가 발생했습니다.');
    }
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = searchInput.value;
    setActiveChip(null);
    search();
  });

  chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.query = btn.dataset.keyword;
      searchInput.value = state.query;
      setActiveChip(state.query);
      search();
    });
  });

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sort = btn.dataset.sort;
      setActiveSort(state.sort);
      search();
    });
  });

  searchInput.value = state.query;
  setActiveChip(state.query);
  setActiveSort(state.sort);
  search();
})();
