from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy import select, func
from auth import hash_password, verify_password, create_token, decode_token
from models import init_db, get_db, User, PriceSnapshot, PriceAlert, CrowdsourcedPrice

app = FastAPI(title="PriceScope")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
auth = APIRouter(prefix="/api/auth")
prices = APIRouter(prefix="/api/prices")
security = HTTPBearer()

async def user(cred=Depends(security), db=Depends(get_db)):
    uid = decode_token(cred.credentials)
    if not uid: raise HTTPException(401, "Invalid token")
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(401, "User not found")
    return u


@auth.post("/register")
async def register(data: dict, db=Depends(get_db)):
    if (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    u = User(email=data["email"], hashed_password=hash_password(data["password"]))
    db.add(u); await db.commit()
    return {"access_token": create_token(u.id)}


@auth.post("/login")
async def login(data: dict, db=Depends(get_db)):
    u = (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none()
    if not u or not verify_password(data["password"], u.hashed_password): raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token(u.id)}


@auth.get("/me")
async def me(u=Depends(user)):
    return {"id": u.id, "email": u.email}

@prices.post("/snapshot")
async def snapshot(data: dict, u=Depends(user), db=Depends(get_db)):
    snap = PriceSnapshot(user_id=u.id, url=data["url"], product_id=data.get("product_id"),
                         product_name=data.get("product_name"),
                         detected_price=data["detected_price"],
                         price_per_unit=data.get("price_per_unit"),
                         size_ml=data.get("size_ml"),
                         size_unit=data.get("size_unit"),
                         tracking_signals=data.get("tracking_signals", {}))
    db.add(snap); await db.commit()
    return {"id": snap.id}


@prices.get("/history")
async def history(url: str, u=Depends(user), db=Depends(get_db)):
    snaps = (await db.execute(select(PriceSnapshot).where(PriceSnapshot.user_id == u.id, PriceSnapshot.url == url)
        .order_by(PriceSnapshot.captured_at.desc()).limit(50))).scalars().all()
    return [{"detected_price": s.detected_price, "baseline_price": s.baseline_price,
             "inflation_pct": s.inflation_pct, "product_name": s.product_name,
             "captured_at": s.captured_at.isoformat()} for s in snaps]


@prices.post("/fresh")
async def fresh(data: dict, db=Depends(get_db)):
    # Check crowdsourced prices first
    avg = (await db.execute(select(func.avg(CrowdsourcedPrice.reported_price))
        .where(CrowdsourcedPrice.url == data["url"]))).scalar()
    if avg: return {"fresh_price": round(float(avg), 2), "source": "crowdsourced", "fresh_per_unit": None}
    from playwright_engine import get_fresh_price as f
    result = await f(data["url"])
    if isinstance(result, tuple):
        price, source, per_unit = result
    else:
        price, source = result
        per_unit = None
    return {"fresh_price": price, "source": source, "fresh_per_unit": per_unit}


@prices.post("/crowdsource")
async def crowdsource(url: str, reported_price: float, product_id: str = None, product_name: str = None, u=Depends(user), db=Depends(get_db)):
    db.add(CrowdsourcedPrice(url=url, product_id=product_id, product_name=product_name, reported_price=reported_price))
    await db.commit()
    return {"status": "ok"}


@prices.get("/alerts")
async def alerts(u=Depends(user), db=Depends(get_db)):
    a = (await db.execute(select(PriceAlert).where(PriceAlert.user_id == u.id, PriceAlert.is_active == True))).scalars().all()
    return [{"id": x.id, "url": x.url, "target_price": x.target_price} for x in a]


@prices.post("/alerts")
async def create_alert(url: str, target_price: float, u=Depends(user), db=Depends(get_db)):
    a = PriceAlert(user_id=u.id, url=url, target_price=target_price)
    db.add(a); await db.commit()
    return {"id": a.id}


@prices.delete("/alerts/{id}")
async def delete_alert(id: int, u=Depends(user), db=Depends(get_db)):
    a = (await db.execute(select(PriceAlert).where(PriceAlert.id == id, PriceAlert.user_id == u.id))).scalar_one_or_none()
    if not a: raise HTTPException(404, "Not found")
    await db.delete(a); await db.commit()
    return {"status": "deleted"}


app.include_router(auth)
app.include_router(prices)

@app.on_event("startup")
async def startup(): await init_db()

@app.get("/health")
async def health(): return {"status": "ok"}
