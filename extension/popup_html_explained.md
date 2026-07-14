# popup_html_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Extension ka popup HTML — icon click pe dikhta hai. Simple vanilla HTML, styling CSS mein, logic JS mein.

---

## HEADER

```html
<div class="logo">
  <svg width="18" height="18" fill="none" stroke="#7bf5a7" stroke-width="2" viewBox="0 0 24 24">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
  <span>PriceScope</span>
</div>
<span id="auth-badge" class="badge">—</span>
```
- **Kyun:** Logo SVG icon (green stroke) + brand name. Auth badge = email ka username ya "—" (logged out).

---

## MAIN CONTENT

```html
<div id="main">
  <div class="card">
    <div class="card-label">Your Price</div>
    <div id="your-price" class="price-val bad">Scanning...</div>
  </div>
  <div class="card">
    <div class="card-label">Fresh Price</div>
    <div id="fresh-price" class="price-val good">—</div>
  </div>
  <div class="card">
    <div class="card-label">Inflation</div>
    <div id="inflation" class="price-val">—</div>
  </div>
</div>
```
- **Kyun:** Three cards — "Your Price" (detected), "Fresh Price" (from backend), "Inflation" (percentage). Initial state: Scanning... / — / —.

---

## AUTH FORM (Hidden)

```html
<div id="auth-form" class="auth-form" style="display:none">
  <input id="email" type="email" placeholder="Email" class="input">
  <input id="password" type="password" placeholder="Password" class="input">
  <button id="submit-auth" class="btn-primary">Continue</button>
  <div id="auth-error" class="error" style="display:none"></div>
</div>
```
- **Kyun:** Login/Register form — hidden initially, Sign In button click pe dikhai jata hai. `type="email"` browser validation bhi karta hai.

---

## FOOTER

```html
<footer class="footer">
  <button id="signin-btn" class="btn-ghost">Sign In</button>
</footer>
```
- **Kyun:** Footer mein Sign In button — minimalist ghost button style.
