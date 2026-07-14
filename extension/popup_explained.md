# popup_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Extension ka popup logic — sign-in, register, fresh price display sab yahan hota hai.

---

## CONFIGURATION

```javascript
const API = 'http://localhost:8000';
```
- **Kyun:** Backend server ka address — same as content.js and background.js.

---

## INIT

```javascript
async function init() {
  const { user } = await browser.storage.local.get('user');
  document.getElementById('auth-badge').textContent = user?.email?.split('@')[0] ?? '—';
```
- **Kyun:** Popup kholne pe user check karo — logged in hai ya nahi. Badge mein email ka username dikhao ya "—".
- **Kahan:** `browser.storage.local.get()` local storage se user data laata hai.

```javascript
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
```
- **Kyun:** Current tab ka URL chahiye — fresh price fetch karne ke liye.

```javascript
  try {
    const { fresh_price } = await fetch(`${API}/prices/fresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url }),
    }).then(r => r.json());
    if (fresh_price) document.getElementById('fresh-price').textContent = '$' + fresh_price.toFixed(2);
  } catch (e) { console.warn('[PriceScope popup]', e); }
}
```
- **Kyun:** Backend se fresh price mango — fetch + `.then(r => r.json())` ek line mein. Mil gaya toh DOM update karo.

---

## SIGN IN BUTTON

```javascript
document.getElementById('signin-btn').addEventListener('click', () => {
  document.getElementById('main').style.display = 'none';
  document.getElementById('auth-form').style.display = 'block';
  document.getElementById('signin-btn').style.display = 'none';
});
```
- **Kyun:** Sign In click karne pe main view hide karo, auth form dikhao.

---

## SUBMIT AUTH (Login/Register)

```javascript
document.getElementById('submit-auth').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const err = document.getElementById('auth-error');
  err.style.display = 'none';
```
- **Kyun:** Form submit pe email/password lo, error element pehle hide karo.

```javascript
  try {
    let resp = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (resp.status === 401) {
      resp = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    }
    if (!resp.ok) throw new Error('Auth failed');
```
- **Kyun:** Pehle login try karo — fail (401) toh auto-register. `resp.ok` se error check.

```javascript
    const { access_token } = await resp.json();
    const me = await fetch(`${API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    }).then(r => r.json());
```
- **Kyun:** Token mila, ab user profile lao — email badge ke liye.

```javascript
    await browser.storage.local.set({ token: access_token, user: me });
    document.getElementById('auth-badge').textContent = me.email.split('@')[0];
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    document.getElementById('signin-btn').style.display = 'block';
```
- **Kyun:** Token + user save karo, badge update karo, auth form hide karo, main view dikhao.

```javascript
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
});
```
- **Kyun:** Error aayi toh dikhao — error message paragraph mein.

---

## FLOW

1. Popup kholo → `init()` chalata hai
2. User check → badge update
3. Fresh price fetch → DOM update
4. Sign In click → auth form dikhao
5. Submit → login try → fail toh auto-register → token save → main view
