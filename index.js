// 💡 CONFIGURATION: Paste your Google Apps Script Web App URL here
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEM7Xgevp_U93Tlad1eTZ2UDvI5NU5qx0qeA8_MgHZK4LxhCUfn2x5os1-bErVuS7tnQ/exec';

const SECTIONS_CONFIG = {
  played: { label: "Played", icon: "✅", theme: "played" },
  wishlist: { label: "Want to Play Released", icon: "⭐", theme: "wishlist" },
  wishlistunreleased: { label: "Want to Play Unreleased", icon: "⭐", theme: "wishlistunreleased" },
  bought: { label: "Bought", icon: "🛒", theme: "bought" },
  multiplayer: { label: "Multi Player", icon: "⚔️", theme: "multiplayer" }
};

const THEMES = {
  played: { color: "#22c55e" },
  wishlist: { color: "#eab308" },
  bought: { color: "#3b82f6" },
  wishlistunreleased: { color: "#45a386" }
};

let globalGameData = [];

// DOM Elements
const app = document.getElementById('app');
const modal = document.getElementById('gameModal');
const gameForm = document.getElementById('gameForm');

// 1. READ Data
async function loadGames() {
  try {
    const response = await fetch(APP_SCRIPT_URL);
    globalGameData = await response.json();
    renderDashboard();
  } catch (error) {
    app.innerHTML = `<div class="loader" style="color: #ef4444;">Failed to load data. Did you set up the Web App URL?</div>`;
  }
}

// 2. RENDER UI
function renderDashboard() {
  app.innerHTML = '';
  const groupedGames = {};
  Object.keys(SECTIONS_CONFIG).forEach(key => groupedGames[key] = []);

  globalGameData.forEach(game => {
    const status = game.status.toLowerCase().trim();
    if (groupedGames[status]) groupedGames[status].push(game);
  });

  Object.entries(SECTIONS_CONFIG).forEach(([key, config]) => {
    const matchingGames = groupedGames[key] || [];
    if (matchingGames.length === 0) return;

    const t = THEMES[config.theme] || { color: "#7c3aed" };
    const wrapper = document.createElement('section');

    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.style.borderLeft = '4px solid ' + t.color;
    heading.innerHTML = `<span>${config.icon}</span> <span>${config.label}</span> <span class="section-count">${matchingGames.length}</span>`;

    const row = document.createElement('div');
    row.className = 'card-row';

    matchingGames.forEach(game => {
      row.appendChild(buildCard(game));
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(row);
    app.appendChild(wrapper);
  });
}

function buildCard(game) {
  const card = document.createElement('div');
  card.className = 'card';

  // Hover Action Buttons
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn';
  editBtn.innerText = '✏️';
  editBtn.onclick = () => openModal(game);

  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn';
  delBtn.innerText = '🗑️';
  delBtn.onclick = () => deleteGame(game.name);

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  const img = document.createElement('img');
  img.className = 'card-cover';
  img.src = game.cover || '';
  img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23262626"/><text x="50" y="55" font-size="24" text-anchor="middle" fill="%23888">No Image</text></svg>'; };

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = game.name;

  footer.appendChild(title);
  card.appendChild(img);
  card.appendChild(actions);
  card.appendChild(footer);
  return card;
}

// 3. ADD / EDIT Data
async function saveGame(e) {
  e.preventDefault();
  const oldName = document.getElementById('oldName').value;
  const gameData = {
    action: oldName ? 'edit' : 'add',
    oldName: oldName,
    name: document.getElementById('gameName').value,
    cover: document.getElementById('gameCover').value,
    status: document.getElementById('gameStatus').value
  };

  closeModal();
  app.innerHTML = `<div class="loader">Saving...</div>`;

  await fetch(APP_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(gameData)
  });
  
  loadGames(); // Refresh UI
}

// 4. DELETE Data
async function deleteGame(name) {
  if(!confirm(`Are you sure you want to delete ${name}?`)) return;
  
  app.innerHTML = `<div class="loader">Deleting...</div>`;
  await fetch(APP_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', name: name })
  });
  
  loadGames(); // Refresh UI
}

// Modal Logic
document.getElementById('addGameBtn').onclick = () => openModal();
document.getElementById('cancelBtn').onclick = closeModal;
gameForm.onsubmit = saveGame;

function openModal(game = null) {
  modal.classList.add('active');
  if (game) {
    document.getElementById('modalTitle').innerText = 'Edit Game';
    document.getElementById('oldName').value = game.name;
    document.getElementById('gameName').value = game.name;
    document.getElementById('gameCover').value = game.cover;
    document.getElementById('gameStatus').value = game.status;
  } else {
    document.getElementById('modalTitle').innerText = 'Add Game';
    gameForm.reset();
    document.getElementById('oldName').value = '';
  }
}

function closeModal() {
  modal.classList.remove('active');
}

// Init
loadGames();
