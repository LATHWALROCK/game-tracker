// ─────────────────────────────────────────────────────────────
// 🔧 CONFIG — replace with your values
// ─────────────────────────────────────────────────────────────
const GIST_ID   = 'acb1c87d6047beb093dd9507d46db168';
const GH_TOKEN  = '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';
const GIST_FILE = 'games.json';
// ─────────────────────────────────────────────────────────────

const API_URL = `https://api.github.com/gists/${GIST_ID}`;

// wishlist and wishlistunreleased share the same theme ✅
const THEMES = {
  played:             { color: '#22c55e', border: 'rgba(34,197,94,0.35)'   },
  wishlist:           { color: '#eab308', border: 'rgba(234,179,8,0.35)'   },
  wishlistunreleased: { color: '#eab308', border: 'rgba(234,179,8,0.35)'   }, // same as wishlist
  bought:             { color: '#3b82f6', border: 'rgba(59,130,246,0.35)'  },
  multiplayer:        { color: '#f97316', border: 'rgba(249,115,22,0.35)'  },
};
const FALLBACK_THEME = { color: '#7c3aed', border: 'rgba(124,58,237,0.35)' };

let _cache = null; // in-memory cache — avoids redundant fetches

// ─────────────────────────────────────────────────────────────
// GIST API
// ─────────────────────────────────────────────────────────────

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
  _cache = JSON.parse(json.files[GIST_FILE].content);
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
      files: {
        [GIST_FILE]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

// ─────────────────────────────────────────────────────────────
// ADD GAME
// ─────────────────────────────────────────────────────────────

async function handleAddGame() {
  const section = document.getElementById('input-section').value;
  const name    = document.getElementById('input-name').value.trim();
  const cover   = document.getElementById('input-cover').value.trim();
  const errEl   = document.getElementById('modal-error');

  if (!name || !cover) {
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  try {
    const data = await loadGames();
    data[section].games.push({ name, cover });
    await saveGames(data);
    closeAddModal();
    showToast(`✅ "${name}" added!`, 'success');
    _cache = null; // bust cache so rerender fetches fresh
    await rerender();
  } catch (err) {
    showToast('❌ Failed to add game', 'error');
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE GAME
// ─────────────────────────────────────────────────────────────

async function deleteGame(sectionKey, gameName) {
  if (!confirm(`Remove "${gameName}"?`)) return;
  try {
    const data = await loadGames();
    data[sectionKey].games = data[sectionKey].games.filter(g => g.name !== gameName);
    await saveGames(data);
    showToast(`🗑️ "${gameName}" removed`, 'success');
    _cache = null;
    await rerender();
  } catch (err) {
    showToast('❌ Failed to delete game', 'error');
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────
// BUILD UI
// ─────────────────────────────────────────────────────────────

function getTheme(section) {
  return THEMES[section.theme] || { ...FALLBACK_THEME };
}

function buildCard(game, sectionKey) {
  const card = document.createElement('div');
  card.className = 'card';

  // ✕ delete button (visible on hover via CSS)
  const del = document.createElement('button');
  del.className = 'card-delete';
  del.title = 'Remove';
  del.textContent = '✕';
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteGame(sectionKey, game.name);
  });

  const img = document.createElement('img');
  img.className = 'card-cover';
  img.src = game.cover;
  img.alt = game.name;
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = 'https://placehold.co/180x220/1a1a1a/555?text=No+Image';
  };

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.title = game.name;
  title.textContent = game.name;

  footer.appendChild(title);
  card.appendChild(del);
  card.appendChild(img);
  card.appendChild(footer);
  return card;
}

function buildSection(key, section) {
  const t = getTheme(section);

  const wrapper = document.createElement('section');

  const heading = document.createElement('div');
  heading.className = 'section-heading';
  heading.style.borderLeft = `4px solid ${t.color}`;

  const iconSpan = document.createElement('span');
  iconSpan.textContent = section.icon;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = section.label;

  const count = document.createElement('span');
  count.className = 'section-count';
  count.textContent = `${section.games.length} game${section.games.length !== 1 ? 's' : ''}`;

  heading.appendChild(iconSpan);
  heading.appendChild(labelSpan);
  heading.appendChild(count);

  const row = document.createElement('div');
  row.className = 'card-row';
  section.games.forEach(game => row.appendChild(buildCard(game, key)));

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

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────

async function openAddModal() {
  const data = await loadGames();
  const sel  = document.getElementById('input-section');
  sel.innerHTML = '';
  Object.entries(data).forEach(([key, sec]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${sec.icon} ${sec.label}`;
    sel.appendChild(opt);
  });
  document.getElementById('input-name').value  = '';
  document.getElementById('input-cover').value = '';
  document.getElementById('modal-error').classList.remove('show');
  document.getElementById('addModal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

// Close on backdrop click
document.getElementById('addModal').addEventListener('click', function (e) {
  if (e.target === this) closeAddModal();
});

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────

let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

rerender().catch(err => {
  document.getElementById('app').innerHTML = `
    <div class="loader" style="color:#f87171">
      ❌ Failed to load. Check your Gist ID &amp; Token.<br/>
      <small>${err.message}</small>
    </div>`;
});
