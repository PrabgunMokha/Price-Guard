from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

engine = create_async_engine("sqlite+aiosqlite:///./pricescope.db", echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    url = Column(String(2048), nullable=False, index=True)
    product_id = Column(String(512))
    product_name = Column(String(512))
    detected_price = Column(Float, nullable=False)
    price_per_unit = Column(Float)  # normalized price per liter/kg
    size_ml = Column(Float)         # volume in ml or weight in g
    size_unit = Column(String(32))  # 'ml', 'L', 'kg', 'g', 'pcs'
    baseline_price = Column(Float)
    inflation_pct = Column(Float)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tracking_signals = Column(JSON, default=dict)


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    target_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)


class CrowdsourcedPrice(Base):
    __tablename__ = "crowdsourced_prices"
    id = Column(Integer, primary_key=True)
    url = Column(String(2048), nullable=False, index=True)
    product_id = Column(String(512))
    product_name = Column(String(512))
    reported_price = Column(Float, nullable=False)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
