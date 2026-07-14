# main_explained.md — Har Line Ka MATLAB (Hinglish Mein)

FastAPI server jo saare API endpoints define karta hai — auth, prices, alerts sab yahan se handle hote hain.

---

## IMPORTS

```python
from fastapi import FastAPI, Depends, HTTPException, APIRouter
```
- **Kyun:** FastAPI framework + routing/dependency tools.
- **Kahan:** `FastAPI()` app banata hai, `APIRouter` routes group karta hai, `Depends` dependency injection, `HTTPException` errors ke liye.

```python
from fastapi.middleware.cors import CORSMiddleware
```
- **Kyun:** Frontend (React) backend (FastAPI) se baat kar sake even though domain alag hai.
- **Kahan:** `app.add_middleware(CORSMiddleware, allow_origins=["*"])` — production mein specific domain do.

```python
from fastapi.security import HTTPBearer
```
- **Kyun:** JWT token verify karne ke liye — "Authorization: Bearer <token>" header se user identify hota hai.
- **Kahan:** `security = HTTPBearer()` se token extract hota hai.

```python
from sqlalchemy import select, func
```
- **Kyun:** Database queries likhne ke liye — `select` rows laata hai, `func` aggregation (AVG) ke liye.

```python
from auth import hash_password, verify_password, create_token, decode_token
```
- **Kyun:** Authentication helpers — password hash, JWT create/verify.
- **Kahan:** Login/register/endpoints mein use hota hai.

```python
from models import init_db, get_db, User, PriceSnapshot, PriceAlert, CrowdsourcedPrice
```
- **Kyun:** Database models (tables) import — User, PriceSnapshot, PriceAlert, CrowdsourcedPrice.

---

## APP SETUP

```python
app = FastAPI(title="PriceScope")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
auth = APIRouter(prefix="/api/auth")
prices = APIRouter(prefix="/api/prices")
security = HTTPBearer()
```
- **Kyun:** App instance, CORS middleware (sab domains se allow), auth router `/api/auth` pe, prices router `/api/prices` pe.
- **Kahan:** Routes baad mein include hote hain.

---

## USER HELPER (Token Verification)

```python
async def user(cred=Depends(security), db=Depends(get_db)):
    uid = decode_token(cred.credentials)
    if not uid: raise HTTPException(401, "Invalid token")
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(401, "User not found")
    return u
```
- **Kyun:** Har protected endpoint ke liye pehle token verify karo — user valid hai ya nahi.
- **Kahan:** Login/register chhod ke saare endpoints `Depends(user)` se protected hain.

---

## AUTH ROUTES

```python
@auth.post("/register")
async def register(data: dict, db=Depends(get_db)):
    if (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    u = User(email=data["email"], hashed_password=hash_password(data["password"]))
    db.add(u); await db.commit()
    return {"access_token": create_token(u.id)}
```
- **Kyun:** New user register — email unique check, password hash, JWT token return.

```python
@auth.post("/login")
async def login(data: dict, db=Depends(get_db)):
    u = (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none()
    if not u or not verify_password(data["password"], u.hashed_password): raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token(u.id)}
```
- **Kyun:** Login — email se user dhundho, password verify karo, token return.

```python
@auth.get("/me")
async def me(u=Depends(user)):
    return {"id": u.id, "email": u.email}
```
- **Kyun:** Current user ka profile — token se user ID/email lao.

---

## PRICE ROUTES

```python
@prices.post("/snapshot")
async def snapshot(data: dict, u=Depends(user), db=Depends(get_db)):
    snap = PriceSnapshot(user_id=u.id, url=data["url"], product_id=data.get("product_id"),
                         detected_price=data["detected_price"], tracking_signals=data.get("tracking_signals", {}))
    db.add(snap); await db.commit()
    return {"id": snap.id}
```
- **Kyun:** Extension detected price ko store karo — user history ke liye.

```python
@prices.get("/history")
async def history(url: str, u=Depends(user), db=Depends(get_db)):
    snaps = (await db.execute(select(PriceSnapshot).where(PriceSnapshot.user_id == u.id, PriceSnapshot.url == url)
        .order_by(PriceSnapshot.captured_at.desc()).limit(50))).scalars().all()
    return [{"detected_price": s.detected_price, "baseline_price": s.baseline_price,
             "inflation_pct": s.inflation_pct, "captured_at": s.captured_at.isoformat()} for s in snaps]
```
- **Kyun:** Kisi URL ki price history — latest 50 snapshots, newest first.

```python
@prices.post("/fresh")
async def fresh(data: dict, db=Depends(get_db)):
    avg = (await db.execute(select(func.avg(CrowdsourcedPrice.reported_price))
        .where(CrowdsourcedPrice.url == data["url"]))).scalar()
    if avg: return {"fresh_price": round(float(avg), 2), "source": "crowdsourced"}
    from playwright_engine import get_fresh_price as f
    price, source = await f(data["url"])
    return {"fresh_price": price, "source": source}
```
- **Kyun:** Fresh customer price lao — pehle crowdsourced average checko, nahi mila toh Playwright se fresh page load karo.

```python
@prices.post("/crowdsource")
async def crowdsource(url: str, reported_price: float, product_id: str = None, u=Depends(user), db=Depends(get_db)):
    db.add(CrowdsourcedPrice(url=url, product_id=product_id, reported_price=reported_price))
    await db.commit()
    return {"status": "ok"}
```
- **Kyun:** User apni fresh price report kare — community data build karne ke liye.

```python
@prices.get("/alerts")
async def alerts(u=Depends(user), db=Depends(get_db)):
    a = (await db.execute(select(PriceAlert).where(PriceAlert.user_id == u.id, PriceAlert.is_active == True))).scalars().all()
    return [{"id": x.id, "url": x.url, "target_price": x.target_price} for x in a]
```
- **Kyun:** User ke saare active price alerts lao.

```python
@prices.post("/alerts")
async def create_alert(url: str, target_price: float, u=Depends(user), db=Depends(get_db)):
    a = PriceAlert(user_id=u.id, url=url, target_price=target_price)
    db.add(a); await db.commit()
    return {"id": a.id}
```
- **Kyun:** Naya price alert create karo — "agar price $X se neeche gire toh notify karo."

```python
@prices.delete("/alerts/{id}")
async def delete_alert(id: int, u=Depends(user), db=Depends(get_db)):
    a = (await db.execute(select(PriceAlert).where(PriceAlert.id == id, PriceAlert.user_id == u.id))).scalar_one_or_none()
    if not a: raise HTTPException(404, "Not found")
    await db.delete(a); await db.commit()
    return {"status": "deleted"}
```
- **Kyun:** Alert delete karo — sirf apna hi delete kar sakta hai (user_id check).

---

## STARTUP & HEALTH

```python
@app.on_event("startup")
async def startup(): await init_db()

@app.get("/health")
async def health(): return {"status": "ok"}
```
- **Kyun:** Server start pe database tables create karo. Health check endpoint — server zinda hai ya nahi.

---

## DESIGN NOTES

- **No Pydantic models** — simplified to plain `dict` type hints. `data["email"]` instead of `data: RegisterIn; data.email`. This trades type safety for brevity.
- **Short variable names** — `u` for user, `a` for alert, `f` for function alias. Keeps lines short but less readable.
- **Semicolon chaining** — `db.add(u); await db.commit()` on one line. FastAPI style guide discourages this but it saves lines.
- **Inline import** — `from playwright_engine import get_fresh_price as f` inside the function to avoid top-level import at module load time.
