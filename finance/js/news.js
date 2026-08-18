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

  let glossaryMap = new Map();

  async function loadGlossary() {
    try {
      const res = await fetch('data/glossary.json', { cache: 'force-cache' });
      const items = await res.json();
      glossaryMap = new Map(items.map((item) => [item.term, item.definition]));
    } catch (err) {
      console.error('용어사전 로드 실패:', err);
    }
  }

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
        const title = highlightGlossaryTerms(cleanNaverText(item.title), glossaryMap);
        const description = highlightGlossaryTerms(cleanNaverText(item.description), glossaryMap);
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

  // --- 용어 팝업 ---
  const popupEl = document.createElement('div');
  popupEl.className = 'term-popup';
  popupEl.hidden = true;
  document.body.appendChild(popupEl);

  function hidePopup() {
    popupEl.hidden = true;
  }

  function showPopup(markEl, term, definition) {
    popupEl.innerHTML = `
      <button type="button" class="term-popup-close" aria-label="닫기">&times;</button>
      <h3 class="term-popup-title">${term}</h3>
      <p class="term-popup-def">${definition}</p>
      <button type="button" class="term-popup-save">단어장에 저장</button>
    `;
    popupEl.hidden = false;

    const rect = markEl.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - popupEl.offsetWidth - 12;
    left = Math.max(window.scrollX + 12, Math.min(left, maxLeft));
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;

    popupEl.querySelector('.term-popup-close').addEventListener('click', hidePopup);
    popupEl.querySelector('.term-popup-save').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '저장 중...';
      try {
        const res = await fetch('/api/vocab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term, definition }),
        });
        if (!res.ok) throw new Error('save failed');
        btn.textContent = '저장됨 ✓';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '저장 실패, 다시 시도';
      }
    });
  }

  resultsEl.addEventListener('click', (e) => {
    const markEl = e.target.closest('.term');
    if (!markEl) return;
    e.preventDefault();
    e.stopPropagation();
    const term = markEl.dataset.term;
    const definition = glossaryMap.get(term);
    if (!definition) return;
    showPopup(markEl, term, definition);
  });

  document.addEventListener('click', (e) => {
    if (popupEl.hidden) return;
    if (popupEl.contains(e.target) || e.target.closest('.term')) return;
    hidePopup();
  });

  async function init() {
    await loadGlossary();
    searchInput.value = state.query;
    setActiveChip(state.query);
    setActiveSort(state.sort);
    search();
  }

  init();
})();
