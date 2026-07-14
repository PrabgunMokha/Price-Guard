# PriceScope — Samajho Jaldi Se (Quick FAQ)

Ye padho jab koi cheez lage — baaki sab skip.

---

## Q1: Project kya karta hai?

**PriceScope** browser extension hai jo detect karta hai ki koi website tumhe zyada price dikha rahi hai ya nahi. Jaise agar tum Amazon pe $100 product dekho, lekin fresh customer ko $80 dikh raha hai — toh yeh bata dega.

---

## Q2: Kaunse 3 files sabse important hain?

1. **`backend/main.py`** — server, saare endpoints yahan hain
2. **`extension/popup.js`** — extension ka popup UI
3. **`extension/content.js`** — webpage pe price detect karta hai

---

## Q3: Server kaise start karte hain?

```bash
cd backend
uvicorn main:app --reload
```

Server chalega `localhost:8000` pe. API docs: `localhost:8000/docs`

---

## Q4: Extension kaise install karte hain?

1. `chrome://extensions/` kholo
2. Developer mode ON karo
3. "Load unpacked" → `extension/` folder select karo
4. Icon toolbar pe dikhega

---

## Q5: Login/Register kaise kaam karta hai? (2 minute)

1. User email + password bhejta hai `/api/auth/login` pe
2. Server check karta hai — email hai? password match? → JWT token return
3. Agar account nahi hai toh `/api/auth/register` pe naya banao
4. Frontend token `localStorage` mein save karta hai
5. Har request ke saath `Authorization: Bearer <token>` bhejta hai

**Code flow:** `popup.js` → `main.py /auth/login` → `auth.py create_token()` → JWT token

---

## Q6: Fresh price kaise milta hai? (2 minute)

1. User URL daalta hai ya webpage pe jata hai
2. `content.js` page se price detect karta hai (CSS selectors se)
3. `main.py /api/prices/fresh` endpoint call hota hai
4. Server pehle check karta hai — koi user pehle se price report kiya hai? (crowdsourced)
5. Agar nahi toh Playwright (headless browser) se website khul jaati hai
6. Fresh price return → inflation percentage calculate → overlay dikhata hai

**Code flow:** `content.js findPrice()` → `main.py /prices/fresh` → `playwright_engine.py` → price return

---

## Q7: Alert kaise kaam karta hai?

1. User `/alerts` pe jaake URL + target price set karta hai
2. Jab `content.js` price detect karta hai → background script ko message bhejta hai
3. Background script check karta hai — kya current URL ka alert hai?
4. Agar price <= target → OS notification bheja jata hai

**Code flow:** `content.js` → `background.js checkAlerts()` → `browser.notifications.create()`

---

## Q8: Database mein kaunse tables hain?

- **User** — email + hashed password
- **PriceSnapshot** — user ki price history (URL, price, time)
- **PriceAlert** — kaunse URLs pe alert rakha hai
- **CrowdsourcedPrice** — community-reported prices (average ke liye)

---

## Q9: JWT token kya hai? (1 minute)

- JWT = JSON Web Token
- Ismein user ka ID store hota hai (`{"sub": "1", "exp": ...}`)
- Server isse sign karta hai secret key se
- Har request pe server token verify karta hai
- Agar token expire ho toh user ko phir se login karna padta hai (7 din)

---

## Q10: Code mein error aaye toh kya karein?

1. **Import error** → `pip install -r requirements.txt` run karo
2. **Database error** → `pricescope.db` delete karo, server restart karo
3. **Port 8000 already in use** → `uvicorn main:app --reload --port 8001`
4. **Playwright error** → `playwright install chromium --with-deps`
5. **Extension load nahi ho raha** → Developer mode on? Unpacked folder sahi?

---

## Architecture Summary

```
User Browser
├── Extension (popup.html + popup.js)
│   ├── Sign In/Register → backend /api/auth/*
│   └── Fresh Price fetch → backend /api/prices/fresh
├── Content Script (content.js)
│   ├── Price Detection (CSS selectors)
│   ├── Fresh Price → backend
│   └── Overlay on page
└── Background Script (background.js)
    └── Price Alerts → notifications

Backend (FastAPI - port 8000)
├── /api/auth/* → JWT tokens
├── /api/prices/* → price operations
└── playwright_engine.py → headless browser

Frontend (React - port 5173)
├── /login → Login page
├── / → Dashboard
├── /history → Price history
└── /alerts → Manage alerts
```
