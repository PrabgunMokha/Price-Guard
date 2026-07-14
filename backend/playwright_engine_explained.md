# playwright_engine_explained.md — Har Line Ka MATLAB (Hinglish Mein)

Headless browser se fresh customer price laana — incognito mode jaisa clean browser context use karta hai.

---

## IMPORTS

```python
import re
```
- **Kyun:** Regular expressions — text se price pattern dhundhne ke liye (`$99.99`).

```python
from playwright.async_api import async_playwright
```
- **Kyun:** Headless browser automation — Chromium programmatically control kar sakte ho.

---

## PRICE SELECTORS

```python
PRICE_SELECTORS = [
    "[data-price]", ".price", ".product-price", "#price", ".a-price",
    "[itemprop='price']", ".sale-price", ".current-price",
    "#product-price", ".special-price", ".regular-price",
]
```
- **Kyun:** E-commerce sites price inhi CSS classes mein dikhate hain — hum try karte hain one by one.

---

## PARSE PRICE

```python
def parse_price(text: str):
    text = re.sub(r"[^\d.,]", "", text.strip().replace(",", ""))
    return float(text) if text else None
```
- **Kyun:** Text se sirf digits/commas/dots rakhho, baaki sab hatao. Comma hatao (thousands separator). Convert to float if possible.
- **Note:** Currency symbols (`$`, `€`, `£`) calling code mein hatao diye hain — simplified to `replace` once.

---

## GET FRESH PRICE (Main)

```python
async def get_fresh_price(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
```
- **Kyun:** Headless Chromium launch karo, naya clean page khulo (incognito jaisa context).

```python
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)
```
- **Kyun:** URL load karo (15s timeout), phir 2 sec rukho — JS-rendered prices ke liye time do.

```python
            for sel in PRICE_SELECTORS:
                try:
                    el = await page.query_selector(sel)
                    if el:
                        price = parse_price((await el.inner_text()).replace("$", "").replace("€", "").replace("£", ""))
                        if price:
                            return price, "playwright"
                except Exception:
                    pass
```
- **Kyun:** Har CSS selector try karo — pehla mila price return karo. Currency symbols yahan hatao.

```python
            price = parse_price(await page.inner_text("body"))
            return (price, "playwright") if price else (None, "not_found")
```
- **Kyun:** Selector se nahi mila toh pure body text mein `parse_price` try karo — regex-free fallback.

```python
        except Exception as e:
            return None, f"error:{e}"
        finally:
            await browser.close()
```
- **Kyun:** Error ho toh gracefully return karo. `finally` se browser cleanup guaranteed hai.
