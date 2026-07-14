# auth_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Authentication helpers — JWT tokens banana/verify karna, password hash karna.

---

## IMPORTS

```python
from datetime import datetime, timedelta
```
- **Kyun:** Token expiry time set karne ke liye — token kab expire hoga.

```python
from jose import jwt
```
- **Kyun:** JWT (JSON Web Token) banne aur padhne ke liye. `jwt.encode()` token banata hai, `jwt.decode()` padh ke data niklata hai.

```python
from passlib.context import CryptContext
```
- **Kyun:** Password hashing ke liye — plain text kabhi database mein store nahi karte, hamesha bcrypt hash store hota hai.

---

## CONFIGURATION

```python
SECRET_KEY = "dev-secret-change-in-production"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```
- **Kyun:**
  - `SECRET_KEY` — JWT sign karne ke liye. **Production mein .env file se load karo.**
  - `ALGORITHM` — HS256 (HMAC SHA-256), secure aur fast.
  - `pwd_context` — bcrypt algorithm, `deprecated="auto"` future algorithm changes handle karega.

---

## FUNCTIONS

```python
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```
- **Kyun:** Login time password verify karo — plain text ko hash ke saath compare karo.

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```
- **Kyun:** Register time password hash karo — bcrypt hash mein convert karo.

```python
def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
```
- **Kyun:** JWT token banao — user ID + 7 din expiry ke saath. Payload: `sub` = user_id, `exp` = expiry time.

```python
def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except Exception:
        return None
```
- **Kyun:** Har request pe token verify karo — `sub` se user ID nikal. Fail ho toh `None` return.
