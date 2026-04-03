// Content script that runs on newbalance.com to scrape product data

function scrapeProducts() {
  const products = [];

  // New Balance product cards typically use these selectors
  // Try multiple strategies since NB may update their site
  const selectors = [
    '[data-testid="product-card"]',
    '.product-card',
    '.product-tile',
    '[class*="ProductCard"]',
    '[class*="product-card"]',
    '.c-product-tile',
    'article[class*="product"]',
  ];

  let productElements = [];
  for (const selector of selectors) {
    productElements = document.querySelectorAll(selector);
    if (productElements.length > 0) break;
  }

  // Fallback: look for common product grid patterns
  if (productElements.length === 0) {
    // Try finding product links with images inside a grid/list
    const links = document.querySelectorAll('a[href*="/product/"], a[href*="/pd/"]');
    productElements = links;
  }

  productElements.forEach((el) => {
    try {
      const product = extractProductData(el);
      if (product && product.name && product.image) {
        products.push(product);
      }
    } catch (e) {
      // Skip malformed elements
    }
  });

  // Also try extracting from structured data (JSON-LD)
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent);
      const extracted = extractFromJsonLd(data);
      if (extracted.length > 0) {
        products.push(...extracted);
      }
    } catch (e) {
      // Skip invalid JSON-LD
    }
  });

  // Deduplicate by name
  const seen = new Set();
  const unique = products.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  return unique;
}

function extractProductData(el) {
  // Try to find name
  const nameEl =
    el.querySelector('[class*="name"], [class*="title"], h2, h3') ||
    el.querySelector('a[aria-label]');
  const name = nameEl
    ? nameEl.textContent?.trim() || nameEl.getAttribute('aria-label')
    : el.getAttribute('aria-label');

  // Try to find price
  const priceEl = el.querySelector(
    '[class*="price"], [class*="Price"], [data-testid*="price"]'
  );
  const priceText = priceEl ? priceEl.textContent.trim() : '';
  const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;

  // Try to find image
  const imgEl = el.querySelector('img');
  const image = imgEl ? imgEl.src || imgEl.dataset.src : null;

  // Try to find product URL
  const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
  const url = linkEl ? linkEl.href : window.location.href;

  // Try to determine category from URL or breadcrumbs
  const category = inferCategory(url, name);

  return { name, price, image, url, category };
}

function extractFromJsonLd(data) {
  const products = [];

  if (Array.isArray(data)) {
    data.forEach((item) => products.push(...extractFromJsonLd(item)));
    return products;
  }

  if (data['@type'] === 'Product') {
    products.push({
      name: data.name,
      price: data.offers?.price || data.offers?.[0]?.price || null,
      image: Array.isArray(data.image) ? data.image[0] : data.image,
      url: data.url || window.location.href,
      category: inferCategory(data.url || window.location.href, data.name),
      description: data.description || '',
    });
  }

  if (data['@type'] === 'ItemList' && data.itemListElement) {
    data.itemListElement.forEach((item) => {
      if (item.item) products.push(...extractFromJsonLd(item.item));
    });
  }

  return products;
}

function inferCategory(url, name) {
  const text = (url + ' ' + (name || '')).toLowerCase();
  if (text.includes('shoe') || text.includes('/shoes') || text.match(/\b\d{3,4}\b/))
    return 'shoes';
  if (
    text.includes('jacket') ||
    text.includes('hoodie') ||
    text.includes('top') ||
    text.includes('shirt') ||
    text.includes('tee') ||
    text.includes('/tops')
  )
    return 'top';
  if (
    text.includes('pant') ||
    text.includes('jogger') ||
    text.includes('short') ||
    text.includes('bottom') ||
    text.includes('legging') ||
    text.includes('/bottoms')
  )
    return 'bottom';
  if (
    text.includes('hat') ||
    text.includes('bag') ||
    text.includes('sock') ||
    text.includes('accessori') ||
    text.includes('beanie') ||
    text.includes('/accessories')
  )
    return 'accessory';
  return 'unknown';
}

// Scrape on page load and send to background
function run() {
  const products = scrapeProducts();
  if (products.length > 0) {
    chrome.runtime.sendMessage({ type: 'PRODUCTS_SCRAPED', products });
  }
}

// Run after page is fully loaded (handles SPA content)
if (document.readyState === 'complete') {
  run();
} else {
  window.addEventListener('load', () => {
    // Wait a bit for dynamic content to render
    setTimeout(run, 2000);
  });
}

// Re-scrape when page content changes (SPA navigation)
const observer = new MutationObserver(() => {
  clearTimeout(observer._timeout);
  observer._timeout = setTimeout(run, 1500);
});
observer.observe(document.body, { childList: true, subtree: true });
