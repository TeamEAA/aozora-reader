// --- 要素取得 ---
const listEl      = document.getElementById('list');
const readerEl    = document.getElementById('reader');
const searchEl    = document.getElementById('search');
const btnNew      = document.getElementById('filter-new');
const btnPopular  = document.getElementById('filter-popular');
const selInitial  = document.getElementById('filter-initial');
const btnHistory  = document.getElementById('filter-history');

// --- 状態 ---
let works = [];
let mode = 'all'; // 'all' | 'new' | 'popular' | 'initial' | 'history'
let selectedInitial = '';

// --- 初期化 ---
fetch('works.json')
  .then(r => r.json())
  .then(data => {
    works = data.works;
    // localStorage から viewCount を同期
    works.forEach(w => {
      const cnt = localStorage.getItem(`views_${w.url}`);
      if (cnt) w.viewCount = +cnt;
    });
    renderList();
  });

// --- イベント ---
searchEl.addEventListener('input', () => { mode='all'; renderList(); });
btnNew.addEventListener('click', () => { mode = (mode==='new'?'all':'new'); renderList(); });
btnPopular.addEventListener('click', () => { mode = (mode==='popular'?'all':'popular'); renderList(); });
selInitial.addEventListener('change', () => { mode='initial'; selectedInitial=selInitial.value; renderList(); });
btnHistory.addEventListener('click', () => { mode = (mode==='history'?'all':'history'); renderList(); });

// --- 一元的フィルタ＆ソート＆描画 ---
function renderList() {
  let list = works.slice();
  const q = searchEl.value.trim().toLowerCase();

  // キーワード検索
  if (q) list = list.filter(w => w.title.toLowerCase().includes(q) || w.author.toLowerCase().includes(q));

  // モード別絞り込み・ソート
  if (mode === 'new') {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    list = list.filter(w => new Date(w.dateAdded) >= weekAgo)
               .sort((a,b)=> new Date(b.dateAdded)-new Date(a.dateAdded));
  }
  else if (mode === 'popular') {
    list.sort((a,b)=> b.viewCount - a.viewCount);
  }
  else if (mode === 'initial') {
    list = list.filter(w => w.initial === selectedInitial)
               .sort((a,b)=> new Date(b.dateAdded)-new Date(a.dateAdded));
  }
  else if (mode === 'history') {
    const hist = JSON.parse(localStorage.getItem('history')||'[]');
    list = hist.map(h => works.find(w=>w.url===h.url)).filter(Boolean);
  }
  else {
    // デフォルト：日付降順
    list.sort((a,b)=> new Date(b.dateAdded)-new Date(a.dateAdded));
  }

  // 描画
  listEl.innerHTML = '';
  list.forEach(w => {
    const li = document.createElement('li');
    li.textContent = `${w.title} ／ ${w.author}`;
    li.onclick = () => loadWork(w);
    listEl.appendChild(li);
  });
}

// --- 作品ロード＆履歴記録＆カウント ---
function loadWork(work) {
  fetch(work.url)
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html,'text/html');
      readerEl.innerHTML = '';
      doc.body.childNodes.forEach(n=>readerEl.appendChild(n.cloneNode(true)));

      // ページ位置復元
      const pos = localStorage.getItem(`pos_${work.url}`);
      if (pos) readerEl.scrollTop = +pos;

      // 閲覧数カウント
      work.viewCount = (work.viewCount||0) + 1;
      localStorage.setItem(`views_${work.url}`, work.viewCount);

      // 読書履歴に追加（最新10件まで）
      const hist = JSON.parse(localStorage.getItem('history')||'[]');
      hist.unshift({ url: work.url, title: work.title, time: new Date().toISOString() });
      localStorage.setItem('history', JSON.stringify(hist.slice(0,10)));

      // 読書位置保存用のスクロールイベント
      readerEl.onscroll = () => {
        localStorage.setItem(`pos_${work.url}`, readerEl.scrollTop);
      };
    })
    .catch(() => {
      readerEl.innerHTML = '<p>読み込みに失敗しました。</p>';
    });
}
