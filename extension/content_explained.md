# content_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Browser extension content script — har webpage pe inject hoti hai aur price detect karti hai.

---

## CONFIGURATION

```javascript
const API = 'http://localhost:8000';
```
- **Kyun:** Backend server ka address.

```javascript
const PRICE_SELECTORS = [ ... ];
```
- **Kyun:** CSS selectors jo e-commerce sites price dikhane ke liye use karte hain — inko try karenge page mein.

---

## PRICE PARSING

```javascript
function parsePrice(text) {
  const n = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', ''));
  return isNaN(n) ? null : n;
}
```
- **Kyun:** Text se sirf number nikalna — regex se saare non-digit/comma/dot hatao, comma (thousands separator) hatao, float mein convert karo.

```javascript
function findPrice() {
  const seen = new Set();
  for (const sel of PRICE_SELECTORS) {
    for (const el of document.querySelectorAll(sel)) {
      const price = parsePrice(el.innerText || el.textContent);
      if (price > 0) {
        const key = price.toFixed(2);
        if (!seen.has(key)) { seen.add(key); return price; }
      }
    }
  }
  return null;
}
```
- **Kyun:** Har selector try karo, har matching element check karo — duplicate prices avoid karo (Set se). Pehla valid price return karo.

```javascript
function getSignals() {
  return {
    cookies: document.cookie ? document.cookie.split(';').length : 0,
    lsKeys: Object.keys(localStorage).length,
    ssKeys: Object.keys(sessionStorage).length,
  };
}
```
- **Kyun:** Tracking signals collect karo — cookies, localStorage, sessionStorage counts.

---

## OVERLAY

```javascript
function overlay(detected, fresh, pct) {
  const existing = document.getElementById('ps-overlay');
  if (existing) existing.remove();
  const diff = detected && fresh ? (detected - fresh).toFixed(2) : null;
  const inflated = pct > 0;
```
- **Kyun:** Purana overlay hatao, price difference calculate karo, inflation flag set karo.

```javascript
  document.body.insertAdjacentHTML('beforeend', `
    <div id="ps-overlay" style="...">
      <div style="...">...$${detected?.toFixed(2) ?? '—'}...</div>
      ...
    </div>
  `);
}
```
- **Kyun:** Overlay HTML inject karo — `insertAdjacentHTML` se body ke end mein add karo. Inline styles ek hi string mein (CSS file ki zaroorat nahi).

---

## INITIALIZATION

```javascript
async function init() {
  const found = findPrice();
  if (!found) return;
  const currentPrice = found;
  overlay(currentPrice, null, null);
```
- **Kyun:** Pehle price dhundho page mein — agar mila toh overlay dikhao (fresh price ke bina).

```javascript
  try {
    const { fresh_price } = await fetch(`${API}/prices/fresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: location.href }),
    }).then(r => r.json());
    if (fresh_price) {
      const pct = Math.round(((currentPrice - fresh_price) / fresh_price) * 10000) / 100;
      overlay(currentPrice, fresh_price, pct);
    }
  } catch (e) { console.warn('[PriceScope]', e); }
}
```
- **Kyun:** Backend se fresh price mango — inflation percentage calculate karo ((currentPrice - fresh) / fresh * 100), overlay update karo.

```javascript
window.addEventListener('load', () => setTimeout(init, 1500));
```
- **Kyun:** Page load ke 1.5 second baad init karo — dynamic JS-rendered websites ko time chahiye price dikhane ke liye.

---

## OVERLAY STYLING

Inline CSS directly HTML ke andar — dark theme, fixed bottom-right, max z-index, rounded corners. Colors: `#ff6b6b` for inflated (red), `#7bf5a7` for normal (green).

---

## LIMITATIONS

1. Sirf common selectors — unique classnames waley sites pe nahi hoga
2. JS-rendered prices — 1.5 sec wait help karta hai but kuch sites 5+ sec le sakti hain
3. Backend must be running — localhost:8000 nahi chal raha toh kuch nahi hoga
