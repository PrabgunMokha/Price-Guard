const api = typeof chrome !== 'undefined' ? chrome : browser;
const API_URL = 'http://localhost:8000/api';

async function init() {
  try {
    const { user } = await api.storage.local.get('user');
    const badge = document.getElementById('auth-badge');
    const signInBtn = document.getElementById('signin-btn');

    if (user) {
      if (badge) badge.textContent = user.email.split('@')[0];
      if (signInBtn) signInBtn.style.display = 'none';
    } else {
      if (badge) badge.textContent = '—';
      if (signInBtn) signInBtn.style.display = 'block';
    }

    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) return;

    // 1. Get baseline fresh price from backend via background
    try {
      const priceData = await api.runtime.sendMessage({ type: 'GET_FRESH_PRICE', url: tab.url });
      if (priceData?.fresh_price) {
        const el = document.getElementById('fresh-price');
        if (el) el.textContent = '₹' + priceData.fresh_price.toFixed(2);
      }
      if (priceData?.product_name && priceData.product_name !== '—') {
        const el = document.getElementById('product-name');
        if (el) el.textContent = priceData.product_name;
      }
    } catch (e) {
      console.warn('[PriceScope popup] fresh price fetch failed:', e);
    }

    // 2. Query the content script for real-time page data
    try {
      const response = await api.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' });
      if (response?.productName) {
        const el = document.getElementById('product-name');
        if (el) el.textContent = response.productName;
      }
      const yourPrice = document.getElementById('your-price');
      if (yourPrice) {
        yourPrice.textContent = response?.price ? '₹' + response.price.toFixed(2) : 'Not detected';
      }
    } catch (e) {
      // Content script not injected yet (non-product page or extension just loaded)
      const yourPrice = document.getElementById('your-price');
      if (yourPrice && yourPrice.textContent === 'Scanning...') {
        yourPrice.textContent = 'N/A';
      }
    }
  } catch (e) {
    console.error('[PriceScope popup] init error:', e);
  }
}

// DOMContentLoaded may have already fired when script is at bottom of <body>
function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

onReady(() => {
  const signinBtn = document.getElementById('signin-btn');
  const submitAuth = document.getElementById('submit-auth');

  if (signinBtn) {
    signinBtn.addEventListener('click', () => {
      const main = document.getElementById('main');
      const authForm = document.getElementById('auth-form');
      if (main) main.style.display = 'none';
      if (authForm) authForm.style.display = 'block';
      signinBtn.style.display = 'none';
    });
  }

  if (submitAuth) {
    submitAuth.addEventListener('click', async () => {
      const email = (document.getElementById('email')?.value || '').trim();
      const password = document.getElementById('password')?.value || '';
      const err = document.getElementById('auth-error');
      if (err) err.style.display = 'none';

      try {
        let resp = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (resp.status === 401) {
          resp = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
        }
        if (!resp.ok) throw new Error('Auth failed');

        const { access_token } = await resp.json();
        const me = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        }).then(r => r.json());

        await api.storage.local.set({ token: access_token, user: me });
        const authForm = document.getElementById('auth-form');
        const main = document.getElementById('main');
        if (authForm) authForm.style.display = 'none';
        if (main) main.style.display = 'block';
        init();
      } catch (e) {
        if (err) {
          err.textContent = e.message;
          err.style.display = 'block';
        }
      }
    });
  }

  init();
});

