// Chrome storage helpers

const storage = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (data) => resolve(data[key]));
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async getProducts() {
    return (await this.get('products')) || [];
  },

  async getCurrentOutfit() {
    return await this.get('currentOutfit');
  },

  async saveCurrentOutfit(outfit) {
    return this.set('currentOutfit', outfit);
  },
};
