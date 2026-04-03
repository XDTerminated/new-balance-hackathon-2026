// API client for communicating with the FastAPI backend

const API_BASE = 'http://localhost:8000';

const api = {
  async search(vibe, products) {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe, products }),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  },

  async reroll(outfitId, slot, excludedIds) {
    const res = await fetch(`${API_BASE}/api/reroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outfit_id: outfitId,
        slot,
        excluded_ids: excludedIds,
      }),
    });
    if (!res.ok) throw new Error(`Reroll failed: ${res.status}`);
    return res.json();
  },

  async feedback(outfitId, productId, message, vibeContext) {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outfit_id: outfitId,
        product_id: productId,
        message,
        vibe_context: vibeContext,
      }),
    });
    if (!res.ok) throw new Error(`Feedback failed: ${res.status}`);
    return res.json();
  },

  async tryon(personImage, outfitId) {
    const formData = new FormData();
    formData.append('person_image', personImage);
    formData.append('outfit_id', outfitId);

    const res = await fetch(`${API_BASE}/api/tryon`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Try-on failed: ${res.status}`);
    return res.json();
  },

  async getOutfit(outfitId) {
    const res = await fetch(`${API_BASE}/api/outfit/${outfitId}`);
    if (!res.ok) throw new Error(`Get outfit failed: ${res.status}`);
    return res.json();
  },

  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },
};
