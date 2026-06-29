// ─── CONFIG ────────────────────────────────────────────────
const GIST_ID   = 'acb1c87d6047beb093dd9507d46db168';
const GH_TOKEN  = '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';
const GIST_FILE = 'games.json';
// ───────────────────────────────────────────────────────────

const API_URL = `https://api.github.com/gists/${GIST_ID}`;

const THEMES = {
  played:             { color: '#22c55e', border: 'rgba(34,197,94,0.35)',  label: '✓ Played'    },
  wishlist:           { color: '#eab308', border: 'rgba(234,179,8,0.35)',  label: '★ Wishlist'  },
  bought:             { color: '#3b82f6', border: 'rgba(59,130,246,0.35)', label: '🛒 Bought'   },
  multiplayer:        { color: '#f97316', border: 'rgba(249,115,22,0.35)', label: '⚔️ Multi'    },
};
const FALLBACK_THEME = { color: '#7c3aed', border: 'rgba(124,58,237,0.35)', label: '🎮 Other' };

// Sections that support "hours played"
const HOURS_SECTIONS = ['played'];

let _cache = null;

// ─── State for edit mode ───────────────────────────────────
let _editState = null; // { sectionKey, gameIndex } when editing

// ─── GIST API ──────────────────────────────────────────────

async function loadGames() {
  if (_cache) return _cache;
  const res = await fetch(API_URL, {
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const json = await res.json();
  const raw = json.files[GIST_FILE]?.content;
  if (!raw) throw new Error(`File "${GIST_FILE}" not found in Gist`);
  try {
    _cache = JSON.parse(raw);
  } catch (e) {
    console.error('Raw content that failed to parse:\n', raw);
    throw new Error(`Invalid JSON in ${GIST_FILE}: ${e.message}`);
  }
  return _cache;
}

async function saveGames(data) {
  _cache = data;
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } }
    })
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

// ─── MODAL (Add + Edit) ────────────────────────────────────

async function openAddModal() {
  _editState = null;
  const data = await loadGames();
  _populateSectionDropdown(data);
  document.getElementById('modal-title').textContent       = '➕ Add a Game';
  document.getElementById('modal-submit-btn').textContent  = 'Add Game';
  document.getElementById('input-name').value              = '';
  document.getElementById('input-cover').value             = '';
  document.getElementById('input-hours').value             = '';
  document.getElementById('modal-error').classList.remove('show');
  _updateHoursFieldVisibility();
  document.getElementById('addModal').classList.add('open');
}

async function openEditModal(sectionKey, gameIndex) {
  closeDetailModal();
  const data  = await loadGames();
  const game  = data[sectionKey].games[gameIndex];
  _editState  = { sectionKey, gameIndex };

  _populateSectionDropdown(data);
  document.getElementById('input-section').value          = sectionKey;
  document.getElementById('modal-title').textContent      = '✏️ Edit Game';
  document.getElementById('modal-submit-btn').textContent = 'Save Changes';
  document.getElementById('input-name').value             = game.name;
  document.getElementById('input-cover').value            = game.cover;
  document.getElementById('input-hours').value            = game.hoursPlayed ?? '';
  document.getElementById('modal-error').classList.remove('show');
  _updateHoursFieldVisibility();
  document.getElementById('addModal').classList.add('open');
}

function _populateSectionDropdown(data) {
  const sel = document.getElementById('input-section');
  sel.innerHTML = '';
  Object.entries(data).forEach(([key, sec]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${sec.icon} ${sec.label}`;
    sel.appendChild(opt);
  });
  sel.removeEventListener('change', _updateHoursFieldVisibility);
  sel.addEventListener('change', _updateHoursFieldVisibility);
}

function _updateHoursFieldVisibility() {
  const section   = document.getElementById('input-section').value;
  const hoursField = document.getElementById('hours-field');
  hoursField.style.display = HOURS_SECTIONS.includes(section) ? 'block' : 'none';
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
  _editState = null;
}

async function handleSubmitModal() {
  const section = document.getElementById('input-section').value;
  const name    = document.getElementById('input-name').value.trim();
  const cover   = document.getElementById('input-cover').value.trim();
  const hours   = document.getElementById('input-hours').value;
  const errEl   = document.getElementById('modal-error');

  if (!name || !cover) { errEl.classList.add('show'); return; }
  errEl.classList.remove('show');

  const gameObj = { name, cover };
  if (HOURS_SECTIONS.includes(section) && hours !== '') {
    gameObj.hoursPlayed = Number(hours);
  }

  try {
    const data = await loadGames();

    if (_editState) {
      // ── EDIT: may have changed section ──
      const { sectionKey, gameIndex } = _editState;
      // remove from old section
      data[sectionKey].games.splice(gameIndex, 1);
      // push to (possibly new) section
      data[section].games.push(gameObj);
      await saveGames(data);
      closeAddModal();
      showToast(`✏️ "${name}" updated!`, 'success');
    } else {
      // ── ADD ──
      data[section].games.push(gameObj);
      await saveGames(data);
      closeAddModal();
      showToast(`✅ "${name}" added!`, 'success');
    }

    _cache = null;
    await rerender();
  } catch (err) {
    showToast('❌ Operation failed', 'error');
    console.error(err);
  }
}

// ─── DELETE ────────────────────────────────────────────────

async function deleteGame(sectionKey, gameIndex, gameName) {
  if (!confirm(`Remove "${gameName}"?`)) return;
  closeDetailModal();
  try {
    const data = await loadGames();
    data[sectionKey].games.splice(gameIndex, 1);
    await saveGames(data);
    showToast(`🗑️ "${gameName}" removed`, 'success');
    _cache = null;
    await rerender();
  } catch (err) {
    showToast('❌ Failed to delete game', 'error');
    console.error(err);
  }
}

// ─── DETAIL POPUP ──────────────────────────────────────────

function openDetailModal(sectionKey, gameIndex, game) {
  const t = THEMES[sectionKey] || FALLBACK_THEME;

  document.getElementById('detail-cover').src         = game.cover;
  document.getElementById('detail-cover').alt         = game.name;
  document.getElementById('detail-title').textContent = game.name;

  const badge = document.getElementById('detail-badge');
  badge.textContent        = t.label;
  badge.style.background   = t.border;
  badge.style.color        = t.color;

  const hoursRow = document.getElementById('detail-hours-row');
  if (game.hoursPlayed !== undefined && game.hoursPlayed !== null) {
    document.getElementById('detail-hours').textContent = `${game.hoursPlayed} hrs`;
    hoursRow.style.display = 'flex';
  } else {
    hoursRow.style.display = 'none';
  }

  document.getElementById('detail-edit-btn').onclick   = () => openEditModal(sectionKey, gameIndex);
  document.getElementById('detail-delete-btn').onclick = () => deleteGame(sectionKey, gameIndex, game.name);

  document.getElementById('detailModal').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
}

// ─── BUILD UI ──────────────────────────────────────────────

function getTheme(section) {
  return THEMES[section.theme] || { ...FALLBACK_THEME };
}

function buildCard(game, sectionKey, gameIndex) {
  const card = document.createElement('div');
  card.className = 'card';

  // Click anywhere on card → detail popup
  card.addEventListener('click', () => openDetailModal(sectionKey, gameIndex, game));

  // Action buttons container
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'card-btn card-btn-edit';
  editBtn.title     = 'Edit';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(sectionKey, gameIndex);
  });

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'card-btn card-btn-delete';
  delBtn.title     = 'Delete';
  delBtn.innerHTML = '🗑';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteGame(sectionKey, gameIndex, game.name);
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  const img = document.createElement('img');
  img.className  = 'card-cover';
  img.src        = game.cover;
  img.alt        = game.name;
  img.loading    = 'lazy';
  img.onerror    = () => { img.src = 'https://placehold.co/180x220/1a1a1a/555?text=No+Image'; };

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const title = document.createElement('div');
  title.className   = 'card-title';
  title.title       = game.name;
  title.textContent = game.name;

  footer.appendChild(title);

  if (game.hoursPlayed !== undefined && game.hoursPlayed !== null) {
    const hrs = document.createElement('div');
    hrs.className   = 'card-hours';
    hrs.textContent = `⏱ ${game.hoursPlayed} hrs`;
    footer.appendChild(hrs);
  }

  card.appendChild(actions);
  card.appendChild(img);
  card.appendChild(footer);
  return card;
}

function buildSection(key, section) {
  const t = getTheme(section);
  const wrapper = document.createElement('section');

  const heading = document.createElement('div');
  heading.className          = 'section-heading';
  heading.style.borderLeft   = `4px solid ${t.color}`;

  const iconSpan  = document.createElement('span');
  iconSpan.textContent  = section.icon;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = section.label;

  const count = document.createElement('span');
  count.className   = 'section-count';
  count.textContent = `${section.games.length} game${section.games.length !== 1 ? 's' : ''}`;

  heading.appendChild(iconSpan);
  heading.appendChild(labelSpan);
  heading.appendChild(count);

  const row = document.createElement('div');
  row.className = 'card-row';
  section.games.forEach((game, idx) => row.appendChild(buildCard(game, key, idx)));

  wrapper.appendChild(heading);
  wrapper.appendChild(row);
  return wrapper;
}

async function rerender() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loader">⏳ Loading...</div>';
  const data = await loadGames();
  app.innerHTML = '';
  Object.entries(data).forEach(([key, section]) => {
    app.appendChild(buildSection(key, section));
  });
}

// ─── CLOSE ON BACKDROP CLICK ───────────────────────────────

document.getElementById('addModal').addEventListener('click', function(e) {
  if (e.target === this) closeAddModal();
});

document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeDetailModal();
});

// ─── TOAST ─────────────────────────────────────────────────

let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer   = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── INIT ──────────────────────────────────────────────────

rerender().catch(err => {
  document.getElementById('app').innerHTML = `
    <div class="loader" style="color:#f87171">
      ❌ Failed to load. Check your Gist ID &amp; Token.<br/>
      <small>${err.message}</small>
    </div>`;
});
