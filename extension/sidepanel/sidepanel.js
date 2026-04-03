// Side panel main logic

let currentOutfit = null;
let currentVibe = '';
let acceptedSlots = new Set();
let excludedBySlot = {};
let feedbackTarget = null;

// DOM refs
const vibeInput = document.getElementById('vibe-input');
const searchBtn = document.getElementById('search-btn');
const loadingSection = document.getElementById('loading');
const outfitBoard = document.getElementById('outfit-board');
const outfitEmpty = document.getElementById('outfit-empty');
const outfitGrid = document.getElementById('outfit-grid');
const vibeInterpretation = document.getElementById('vibe-interpretation');
const tryonBtn = document.getElementById('tryon-btn');
const tryonUploadBtn = document.getElementById('tryon-upload-btn');
const tryonResult = document.getElementById('tryon-result');
const tryonUpload = document.getElementById('tryon-upload');
const tryonImageContainer = document.getElementById('tryon-image-container');
const tryonBack = document.getElementById('tryon-back');
const feedbackModal = document.getElementById('feedback-modal');
const feedbackText = document.getElementById('feedback-text');
const feedbackSubmit = document.getElementById('feedback-submit');
const feedbackCancel = document.getElementById('feedback-cancel');
const productCount = document.getElementById('product-count');

// Tab navigation
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((tc) => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

function switchTab(name) {
  tabs.forEach((t) => t.classList.remove('active'));
  tabContents.forEach((tc) => tc.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
}

// Init
async function init() {
  await updateProductCount();
}

async function updateProductCount() {
  const products = await storage.getProducts();
  productCount.textContent = `${products.length} products`;
}

// Search handler
async function handleSearch() {
  const vibe = vibeInput.value.trim();
  if (!vibe) return;

  currentVibe = vibe;
  acceptedSlots.clear();
  excludedBySlot = {};

  switchTab('outfit');
  loadingSection.classList.remove('hidden');
  outfitBoard.classList.add('hidden');
  outfitEmpty.classList.add('hidden');
  searchBtn.disabled = true;

  try {
    const products = await storage.getProducts();
    const result = await api.search(vibe, products);
    currentOutfit = { ...result, vibe };
    await storage.saveCurrentOutfit(currentOutfit);
    renderOutfit();
  } catch (err) {
    alert(`Failed to build outfit: ${err.message}`);
    outfitEmpty.classList.remove('hidden');
  } finally {
    loadingSection.classList.add('hidden');
    searchBtn.disabled = false;
  }
}

// Render the outfit board
function renderOutfit() {
  if (!currentOutfit || !currentOutfit.items) return;

  outfitBoard.classList.remove('hidden');
  outfitEmpty.classList.add('hidden');
  vibeInterpretation.textContent = currentOutfit.vibe_interpretation || '';

  outfitGrid.innerHTML = '';
  currentOutfit.items.forEach((item) => {
    outfitGrid.appendChild(createOutfitCard(item));
  });

  updateTryonButton();
}

// Create an outfit card
function createOutfitCard(item) {
  const isAccepted = acceptedSlots.has(item.slot);
  const card = document.createElement('div');
  card.className = `outfit-card${isAccepted ? ' accepted' : ''}`;
  card.dataset.slot = item.slot;

  const productUrl = item.product.url || '#';
  const imgSrc = item.product.image || '';

  card.innerHTML = `
    <a class="card-body" href="${productUrl}" target="_blank">
      <img class="card-image" src="${imgSrc}" alt="${item.product.name}" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%2316161a%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2356565e%22 font-family=%22sans-serif%22 font-size=%2214%22>${item.slot.toUpperCase()}</text></svg>'">
      <div class="card-info">
        <span class="card-slot">${item.slot}</span>
        <span class="card-name">${item.product.name}</span>
        ${item.product.price ? `<span class="card-price">$${item.product.price}</span>` : ''}
      </div>
    </a>
    <div class="card-actions">
      <button class="accept-btn" ${isAccepted ? 'disabled' : ''}>
        ${isAccepted ? '&#10003;' : '&#10003;'}
      </button>
      <button class="reroll-btn">&#8635;</button>
      <button class="feedback-btn">&#9998;</button>
    </div>
  `;

  card.querySelector('.accept-btn').addEventListener('click', () => {
    acceptedSlots.add(item.slot);
    renderOutfit();
  });

  card.querySelector('.reroll-btn').addEventListener('click', () => handleReroll(item));

  card.querySelector('.feedback-btn').addEventListener('click', () => {
    feedbackTarget = { slot: item.slot, productId: item.product.name };
    feedbackText.value = '';
    feedbackModal.classList.remove('hidden');
  });

  return card;
}

// Reroll handler
async function handleReroll(item) {
  if (!excludedBySlot[item.slot]) excludedBySlot[item.slot] = [];
  excludedBySlot[item.slot].push(item.product.name);

  const card = document.querySelector(`[data-slot="${item.slot}"]`);
  if (card) card.style.opacity = '0.5';

  try {
    const result = await api.reroll(
      currentOutfit.outfit_id,
      item.slot,
      excludedBySlot[item.slot]
    );

    const idx = currentOutfit.items.findIndex((i) => i.slot === item.slot);
    if (idx !== -1) {
      currentOutfit.items[idx] = result;
    }
    acceptedSlots.delete(item.slot);
    await storage.saveCurrentOutfit(currentOutfit);
    renderOutfit();
  } catch (err) {
    alert(`Reroll failed: ${err.message}`);
    if (card) card.style.opacity = '1';
  }
}

// Update try-on button
function updateTryonButton() {
  const allAccepted =
    currentOutfit &&
    currentOutfit.items.length > 0 &&
    currentOutfit.items.every((item) => acceptedSlots.has(item.slot));
  tryonBtn.disabled = !allAccepted;
  tryonUploadBtn.disabled = !allAccepted;
}

// Try-on upload
function handleTryonUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    switchTab('tryon');
    tryonUpload.classList.add('hidden');
    tryonResult.classList.remove('hidden');
    tryonImageContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Generating try-on...</p></div>';

    try {
      const result = await api.tryon(file, currentOutfit.outfit_id);
      tryonImageContainer.innerHTML = `<img src="${result.image_url}" alt="Virtual try-on result">`;
    } catch (err) {
      tryonImageContainer.innerHTML = `<div class="empty-state"><p>Try-on unavailable</p><span>${err.message}</span></div>`;
    }
  };
  input.click();
}

tryonBtn.addEventListener('click', handleTryonUpload);
tryonUploadBtn.addEventListener('click', handleTryonUpload);

tryonBack.addEventListener('click', () => {
  tryonResult.classList.add('hidden');
  tryonUpload.classList.remove('hidden');
});

// Feedback
feedbackSubmit.addEventListener('click', async () => {
  if (!feedbackTarget || !feedbackText.value.trim()) return;
  try {
    await api.feedback(
      currentOutfit.outfit_id,
      feedbackTarget.productId,
      feedbackText.value.trim(),
      currentVibe
    );
    feedbackModal.classList.add('hidden');
    feedbackTarget = null;
  } catch (err) {
    alert(`Feedback failed: ${err.message}`);
  }
});

feedbackCancel.addEventListener('click', () => {
  feedbackModal.classList.add('hidden');
  feedbackTarget = null;
});

document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
  feedbackModal.classList.add('hidden');
  feedbackTarget = null;
});

// Search triggers
searchBtn.addEventListener('click', handleSearch);
vibeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

document.querySelectorAll('.tag').forEach((tag) => {
  tag.addEventListener('click', () => {
    vibeInput.value = tag.dataset.vibe;
    handleSearch();
  });
});

// Listen for product updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PRODUCTS_SCRAPED') {
    updateProductCount();
  }
});

init();
