# manifest_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Yeh file browser extension ka configuration hai — extension ka naam, version, permissions, kahan scripts load honi chahiye yeh sab batati hai.

---

## LEVEL 1 — TOP LEVEL

```json
{
  "manifest_version": 3,
```
- **Kyun:** Browser extension ka version batana — Manifest V3 latest hai Chrome/Edge mein, Firefox bhi support karta hai. V2 deprecated hai.
- **Kahan:** Yehi sabse important field hai — browser isse dekh ke samajhta hai ki extension kaise kaam karega.

```json
  "name": "PriceScope",
```
- **Kyun:** Extension ka naam — yeh Chrome Web Store pe, extension list mein, aur toolbar pe dikhai dega.
- **Kahan:** User isse dekhar identify karega.

```json
  "version": "1.0.0",
```
- **Kyun:** Version number — updates track karne ke liye, Chrome Web Store auto-update ke liye zaruri hai.
- **Kahan:** Semantic versioning: major.minor.patch — 1.0.0 se 1.0.1 mein hotfix.

```json
  "description": "Detect if you're being overcharged and see the fresh customer price",
```
- **Kyun:** Short description jo Web Store pe dikhai deti hai — user ko pata ho ki yeh kya karega.
- **Kahan:** Chrome Web Store listing mein dikhai jayegi.

---

## PERMISSIONS

```json
  "permissions": [
    "activeTab",
    "storage",
    "notifications",
    "tabs"
  ],
```
- **Kyun:** Extension ko kya karne ki permission chahiye — yeh users ko dikhai jata hai install time pe.
- **Kahan:**
  - `activeTab` = currently open tab ka content padh sako
  - `storage` = local storage mein data save karo (token, settings)
  - `notifications` = browser notifications bhej sako (price alerts)
  - `tabs` = tab information padh sako (URL, title)

```json
  "host_permissions": [
    "<all_urls>"
  ],
```
- **Kyun:** Har website pe kaam karne ke liye permission — price detect karne ke liye har URL pe access chahiye.
- **Kahan:** `<all_urls>` matlab har domain pe content script inject hoga. **Isse Web Store review mein flag ho sakta hai** — ideally specific domains denge future mein.

---

## ACTION (Toolbar Icon)

```json
  "action": {
    "default_popup": "popup.html",
```
- **Kyun:** Jab user extension icon pe click kare toh kaunsa page khulna chahiye — yeh popup UI hai.
- **Kahan:** `popup.html` open hoga, `popup.js` aur `popup.css` automatically load honge.

```json
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
```
- **Kyun:** Extension icon ke sizes — browser automatically sahi size pick karega context ke hisab se.
- **Kahan:**
  - 16px = toolbar pe chhota icon
  - 48px = extensions page pe list mein
  - 128px = Chrome Web Store pe

**Note:** Abhi sirf placeholder files hain, real icons nahi banayi abhi.

---

## CONTENT SCRIPTS

```json
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
```
- **Kyun:** Ye script har webpage pe inject hoga — price detect karne ke liye zaroori hai.
- **Kahan:**
  - `matches: ["<all_urls>"]` = har website pe inject karo
  - `js: ["content.js"]` = yeh script load karo
  - `run_at: "document_idle"` = jab page load ho jaye, DOM ready ho, tabhi script chalana

**Why document_idle?** `"document_end"` se pehle bhi kar sakte, but `"idle"` zyada safe hai dynamic websites ke liye.

---

## BACKGROUND (Service Worker)

```json
  "background": {
    "service_worker": "background.js"
  },
```
- **Kyun:** Background script jo hamesha chalti hai — even jab popup nahi khula toh bhi. Alerts check karne ke liye zaroori hai.
- **Kahan:** Service worker hai (Manifest V3) — memory efficient, tab close karo toh bhi chalti hai.

**Note:** `background.js` service worker hai, ismein `DOM` nahi hai — `alert` ya `confirm` use na karo.

---

## ICONS

```json
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
```
- **Kyun:** Extension icon files — alag sizes alag jagah dikhane ke liye.
- **Kahan:** `action.default_icon` se alag yeh general icons hain (optional but recommended).

---

## INSTALL KARNE KE STEPS

1. `chrome://extensions/` kholo
2. Developer mode ON karo (top right toggle)
3. "Load unpacked" pe click karo
4. `extension/` folder select karo
5. Extension icon toolbar pe dikhne lagega
