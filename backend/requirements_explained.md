# requirements_explained.md — Har Package Ka MATLAB (Hinglish Mein)

Har package kyun chahiye aur kahan use hota hai.

---

## fastapi==0.115.0

**Kyun:** Web framework — routes, endpoints, middleware. Auto API docs at `/docs`.

## uvicorn[standard]==0.30.6

**Kyun:** ASGI server — `uvicorn main:app --reload`. `standard` = websockets + hot reload.

## sqlalchemy==2.0.35

**Kyun:** ORM — database tables Python objects jaise use karo. Async-friendly.

## aiosqlite==0.20.0

**Kyun:** Async SQLite driver — SQLAlchemy async mode ke saath kaam karta hai.

## python-jose[cryptography]==3.3.0

**Kyun:** JWT tokens — `jwt.encode()`, `jwt.decode()`. `cryptography` extra = secure backend.

## passlib[bcrypt]==1.7.4

**Kyun:** Password hashing — bcrypt algorithm. `deprecated="auto"` future algorithm changes handle karega.

## playwright==1.47.0

**Kyun:** Browser automation — headless Chrome se fresh customer price laana. Run `playwright install chromium`.

## pydantic==2.9.2

**Kyun:** Data validation — simplified to plain dict in this version (no Pydantic models in main.py).

## python-multipart==0.0.12

**Kyun:** Form data parse karne ke liye — future use ke liye rakha.

## pydantic-settings==2.5.2

**Kyun:** Settings/env variables — not used directly in simplified code.

## email-validator==2.2.0

**Kyun:** Pydantic `EmailStr` validation ke liye.

## websockets==13.1

**Kyun:** WebSocket support — future real-time updates ke liye.

## httpx==0.27.2

**Kyun:** HTTP client — future external APIs ke liye.

---

## INSTALLATION

```bash
pip install -r requirements.txt
playwright install chromium --with-deps
```
