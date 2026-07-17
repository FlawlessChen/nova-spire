const CATEGORY_META = {
  ui: { label: 'UI', order: 0 },
  icons: { label: 'Icon', order: 1 },
  fx: { label: 'Effect', order: 2 },
};

const summary = document.querySelector('#summary');
const filters = document.querySelector('#filters');
const status = document.querySelector('#status');
const catalog = document.querySelector('#catalog');
const template = document.querySelector('#asset-card-template');

let manifest;
let activeCategory = 'all';

function categoryOf(file) {
  return file.split('/')[0];
}

function sourceLink(asset) {
  const source = manifest.sources[asset.source];
  const anchor = document.createElement('a');
  anchor.href = source?.page ?? '#';
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.textContent = source?.name ?? asset.source;
  return anchor;
}

function renderFilters() {
  filters.replaceChildren();
  const entries = [['all', '全部'], ...Object.entries(CATEGORY_META).map(([key, value]) => [key, value.label])];
  for (const [key, label] of entries) {
    const button = document.createElement('button');
    button.className = `filter-button${activeCategory === key ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      activeCategory = key;
      renderFilters();
      renderCatalog();
    });
    filters.append(button);
  }
}

function renderAsset(asset) {
  const card = template.content.firstElementChild.cloneNode(true);
  const image = card.querySelector('img');
  image.src = `./${asset.file}`;
  image.alt = `${asset.file} 资源预览`;
  image.addEventListener('error', () => card.classList.add('image-error'));
  card.querySelector('h3').textContent = asset.file;
  card.querySelector('.source').append(sourceLink(asset));
  card.querySelector('.license').textContent = asset.license;
  card.querySelector('.usage').textContent = asset.usage;
  return card;
}

function renderCatalog() {
  catalog.replaceChildren();
  const grouped = Object.entries(CATEGORY_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => [key, meta, manifest.assets.filter((asset) => categoryOf(asset.file) === key)])
    .filter(([key]) => activeCategory === 'all' || activeCategory === key);

  const visibleCount = grouped.reduce((sum, [, , assets]) => sum + assets.length, 0);
  status.textContent = `当前展示 ${visibleCount} 项资源`;

  for (const [, meta, assets] of grouped) {
    const section = document.createElement('section');
    section.className = 'category';
    const title = document.createElement('h2');
    title.className = 'category-title';
    title.append(meta.label);
    const count = document.createElement('span');
    count.className = 'category-count';
    count.textContent = `${assets.length} 项`;
    title.append(count);
    const grid = document.createElement('div');
    grid.className = 'asset-grid';
    assets.forEach((asset) => grid.append(renderAsset(asset)));
    section.append(title, grid);
    catalog.append(section);
  }
}

async function start() {
  try {
    const response = await fetch('./assets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    manifest = await response.json();
    summary.textContent = `${manifest.assets.length} 项候选资源 · ${Object.keys(manifest.sources).length} 个 CC0 来源 · 清单日期 ${manifest.generatedAt}`;
    renderFilters();
    renderCatalog();
  } catch (error) {
    summary.textContent = '资源清单读取失败';
    status.className = 'status error';
    status.textContent = `无法加载 assets.json：${error.message}。请通过本地静态服务器打开本页面。`;
  }
}

start();
