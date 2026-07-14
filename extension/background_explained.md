# background_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Browser extension background service worker — tab close ya popup band karo, yeh kaam karta rehta hai. Price alerts check karne ke liye zaroori hai.

---

## CONFIGURATION

```javascript
const API = 'http://localhost:8000';
```
- **Kyun:** Backend server ka address.

---

## MESSAGE LISTENER

```javascript
browser.runtime.onMessage.addListener(({ type, url, detectedPrice }) => {
  if (type === 'PRICE_DETECTED') checkAlerts(url, detectedPrice);
});
```
- **Kyun:** Content script se message aata hai jab price detect ho — destructured directly in parameter. Flow: content script → `sendMessage()` → background listener → `checkAlerts()`.

---

## CHECK ALERTS

```javascript
async function checkAlerts(url, price) {
  const { token } = await browser.storage.local.get('token');
  if (!token) return;
```
- **Kyun:** Pehle check karo user logged in hai ya nahi — token storage se load karo.

```javascript
  try {
    const alerts = await fetch(`${API}/prices/alerts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json());
```
- **Kyun:** Backend se user ke alerts lao — `.then(r => r.json())` ek line mein.

```javascript
    for (const a of alerts) {
      if (a.url === url && price <= a.target_price) {
        browser.notifications.create({
          type: 'basic', iconUrl: 'icons/icon128.png', title: 'PriceScope Alert',
          message: `Price dropped to $${price} — target was $${a.target_price}`,
        });
      }
    }
  } catch (e) { console.warn('[PriceScope BG]', e); }
}
```
- **Kyun:** Har alert check karo — URL match AND price <= target toh OS notification bhejo.

---

## WHY BACKGROUND?

- Content script sirf tab open hai toh kaam karegi — tab band toh band
- Background service worker persists — browser open hai toh kaam karegi
- Alerts ke liye zaroori hai ki kaam continued ho even when popup closed
- Manifest V3 = event-driven service worker (wake up on message only)
