const api = typeof chrome !== 'undefined' ? chrome : browser;
const API_URL = 'http://localhost:8000/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/-\s*/g, ' ')                                                   // "coca- cola" or "coca-cola" → "coca cola"
    .replace(/\d+(\.\d+)?\s*(ml|l|kg|g|gm|gms|litre|ltr|pack|pcs|units?|bottle|pouch|can|cans|bottles?)/gi, ' ') // strip size + variants
    .replace(/\b(price|buy|online|india|shop|get|offer|deal|discount|off|mrp|free|delivery|order|now|original|taste|soft|drink|carbonated|beverage|pack|combo|set|kit)\b/g, ' ') // marketing noise + product types
    .replace(/\b\d+\b/g, ' ')                                              // stray numbers
    .replace(/[^a-z\s]/g, ' ')                                             // non-alpha
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 40);
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

// ── Local Cross-Site Price Cache ──────────────────────────────────────────────
// Stores prices for the same product seen on different sites so we can compare
// even without the backend having historical data.
async function cachePrice(productName, url, price, pricePerUnit) {
  if (!productName || !price || !url) return;
  try {
    const key = normalizeName(productName);
    const domain = getDomain(url);
    const { priceCache } = await api.storage.local.get('priceCache');
    const cache = priceCache || {};
    if (!cache[key]) cache[key] = [];
    // Replace any old entry from the same domain (keep freshest)
    cache[key] = cache[key].filter(e => e.domain !== domain);
    cache[key].push({ price, pricePerUnit: pricePerUnit || null, url, domain, ts: Date.now() });
    if (cache[key].length > 10) cache[key] = cache[key].slice(-10);
    await api.storage.local.set({ priceCache: cache });
  } catch (e) {
    console.warn('[PriceScope BG] cachePrice:', e);
  }
}

async function getFreshFromCache(productName, currentUrl, currentPrice, currentPerUnit) {
  if (!productName || !currentUrl) return null;
  try {
    const key = normalizeName(productName);
    const currentDomain = getDomain(currentUrl);
    const { priceCache } = await api.storage.local.get('priceCache');
    const allEntries = ((priceCache || {})[key] || []);
    
    // Get other sites (excluding current)
    const otherEntries = allEntries.filter(e => e.domain !== currentDomain);
    if (!otherEntries.length && !currentPrice) return null;
    
    // Find cheapest among OTHER sites
    otherEntries.sort((a, b) => (a.pricePerUnit || a.price) - (b.pricePerUnit || b.price));
    const cheapestOther = otherEntries[0];
    
    // If we have current price, check if current site is cheapest overall
    const currentValue = currentPerUnit || currentPrice;
    let isCurrentCheapest = false;
    let bestPrice = cheapestOther?.price || null;
    let bestPerUnit = cheapestOther?.pricePerUnit || null;
    let sourceDomain = cheapestOther?.domain || null;
    
    if (currentValue && cheapestOther) {
      const cheapestOtherValue = cheapestOther.pricePerUnit || cheapestOther.price;
      if (currentValue <= cheapestOtherValue) {
        // Current site is cheapest!
        isCurrentCheapest = true;
        bestPrice = currentPrice;
        bestPerUnit = currentPerUnit;
        sourceDomain = currentDomain; // Will be shown as "cheapest here"
      }
    } else if (!cheapestOther && currentPrice) {
      // Only have current site data
      isCurrentCheapest = true;
      sourceDomain = currentDomain;
    }
    
    return {
      fresh_price: cheapestOther?.price || null,
      fresh_per_unit: cheapestOther?.pricePerUnit || null,
      source_domain: cheapestOther?.domain || null,
      sites_compared: otherEntries.length,
      // New fields for "cheapest here" detection
      is_current_cheapest: isCurrentCheapest,
      best_price: bestPrice,
      best_per_unit: bestPerUnit,
      cheapest_domain: sourceDomain
    };
  } catch (e) {
    console.warn('[PriceScope BG] getFreshFromCache error:', e);
    return null;
  }
}

// ── Message Listener ──────────────────────────────────────────────────────────
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const { type, url, detectedPrice, productName, pricePerUnit, sizeMl, sizeUnit, title, message } = msg;

  if (type === 'GET_FRESH_PRICE') {
    const currentPrice = msg.currentPrice;
    const currentPerUnit = msg.currentPerUnit;
    
    // Try the backend first; if it has no data, fall back to local cache
    fetch(`${API_URL}/prices/fresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, price_per_unit: pricePerUnit, size_ml: sizeMl, size_unit: sizeUnit }),
    })
      .then(resp => (resp.ok ? resp.json() : null))
      .then(async backendData => {
        if (backendData?.fresh_price) {
          sendResponse(backendData);
        } else {
          // Backend has no data → check our local cross-site cache
          const cached = await getFreshFromCache(productName, url, currentPrice, currentPerUnit);
          sendResponse(cached);
        }
      })
      .catch(async () => {
        // Backend unreachable → use local cache
        const cached = await getFreshFromCache(productName, url, currentPrice, currentPerUnit);
        sendResponse(cached);
      });
    return true; // Keep channel open for async sendResponse
  }

  if (type === 'PRICE_DETECTED') {
    // Always cache locally for cross-site comparison
    cachePrice(productName, url, detectedPrice, pricePerUnit);
    // Also attempt to store in backend (requires login)
    storeSnapshot(url, detectedPrice, productName, pricePerUnit, sizeMl, sizeUnit);
    checkAlerts(url, detectedPrice);
    sendResponse({ ok: true });
  }

  if (type === 'SHOW_ALERT') {
    // Use a unique ID so multiple alerts don't overwrite each other
    api.notifications.create('ps-' + Date.now(), {
      type: 'basic',
      title: title || 'PriceScope Alert',
      message: message || 'Price difference detected!'
    });
    sendResponse({ ok: true });
  }
});

async function storeSnapshot(url, detectedPrice, productName, pricePerUnit, sizeMl, sizeUnit) {
  const { token } = await api.storage.local.get('token');
  if (!token) return;
  try {
    await fetch(`${API_URL}/prices/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url,
        detected_price: detectedPrice,
        product_name: productName,
        price_per_unit: pricePerUnit,
        size_ml: sizeMl,
        size_unit: sizeUnit
      }),
    });
  } catch (e) {
    console.warn('[PriceScope BG] Failed to store snapshot:', e);
  }
}

async function checkAlerts(url, price) {
  const { token } = await api.storage.local.get('token');
  if (!token) return;
  try {
    const resp = await fetch(`${API_URL}/prices/alerts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const alerts = await resp.json();
    for (const a of alerts) {
      if (a.url === url && price <= a.target_price) {
        api.notifications.create('ps-alert-' + Date.now(), {
          type: 'basic',
          title: 'PriceScope Alert!',
          message: `Price dropped to ₹${price.toFixed(2)} — target was ₹${a.target_price}`,
        });
      }
    }
  } catch (e) {
    console.warn('[PriceScope BG] Alert check failed:', e);
  }
}