# models_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Database tables — SQLAlchemy ORM. Simplified: removed redundant `index=True` on primary keys.

---

## IMPORTS

```python
from datetime import datetime
```
- **Kyun:** Timestamps ke liye — `created_at`, `captured_at` columns mein default value ke roop mein.

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
```
- **Kyun:** Column types:
  - `Integer` — primary key, IDs
  - `String` — email, URLs, text
  - `Float` — prices
  - `DateTime` — timestamps
  - `JSON` — tracking signals (flexible data)
  - `Boolean` — is_active flag

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
```
- **Kyun:** Async database connection — FastAPI non-blocking hai toh database bhi async honi chahiye.
  - `create_async_engine` — connection banata hai
  - `async_sessionmaker` — session factory, har request ke liye naya session

```python
from sqlalchemy.orm import DeclarativeBase
```
- **Kyun:** Base class — sab models isse inherit karte hain taaki SQLAlchemy ko pata ho.

---

## ENGINE & SESSION

```python
engine = create_async_engine("sqlite+aiosqlite:///./pricescope.db", echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)
```
- **Kyun:** SQLite database `pricescope.db` file mein. `expire_on_commit=False` — commit ke baad bhi objects loaded rehte hain.

---

## MODELS (Tables)

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```
- **Kyun:** User table — email unique honi chahiye, password hamesha hashed form mein store.

```python
class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    url = Column(String(2048), nullable=False, index=True)
    product_id = Column(String(512))
    detected_price = Column(Float, nullable=False)
    baseline_price = Column(Float)
    inflation_pct = Column(Float)
    captured_at = Column(DateTime, default=datetime.utcnow)
    tracking_signals = Column(JSON, default=dict)
```
- **Kyun:** Price history store karne ke liye — har capture ki details (user, URL, price, signals).

```python
class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    target_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
```
- **Kyun:** Price alerts — soft delete pattern (`is_active` flag, delete nahi karte).

```python
class CrowdsourcedPrice(Base):
    __tablename__ = "crowdsourced_prices"
    id = Column(Integer, primary_key=True)
    url = Column(String(2048), nullable=False, index=True)
    product_id = Column(String(512))
    reported_price = Column(Float, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow)
```
- **Kyun:** Community prices — average calculate kar ke fresh price ke roop mein use karte hain.

---

## HELPER FUNCTIONS

```python
async def get_db():
    async with async_session() as session:
        yield session
```
- **Kyun:** FastAPI dependency injection — har request ko database session milta hai automatically.

```python
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```
- **Kyun:** Server start pe saare tables create karo — agar pehle se exist karein toh ignore hoga.
