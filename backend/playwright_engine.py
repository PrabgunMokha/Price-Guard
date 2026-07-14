import re
from playwright.async_api import async_playwright

PRICE_SELECTORS = [
    "[data-price]", ".price", ".product-price", "#price", ".a-price",
    "[itemprop='price']", ".sale-price", ".current-price",
    "#product-price", ".special-price", ".regular-price",
]

SIZE_PATTERNS = [
    (re.compile(r'(\d+\.?\d*)\s*(ml|milliliters?|mL|mls?)', re.I), 1, 1),
    (re.compile(r'(\d+\.?\d*)\s*(l|liters?|L|lts?)', re.I), 1, 1000),
    (re.compile(r'(\d+\.?\d*)\s*(kg|kilograms?|KG|kgs?)', re.I), 1000, 1),
    (re.compile(r'(\d+\.?\d*)\s*(g|grams?|gr|gm|gms?)', re.I), 1, 1),
]


def parse_price(text: str):
    text = re.sub(r"[^\d.,]", "", text.strip().replace(",", ""))
    return float(text) if text else None


def normalize_to_per_liter(price: float, size_ml: float) -> float:
    """Convert price to price per liter for fair comparison"""
    if not price or not size_ml or size_ml <= 0:
        return None
    return (price / size_ml) * 1000


async def get_fresh_price(url: str):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)

                # Try to find price
                found_price = None
                found_size_ml = None

                for sel in PRICE_SELECTORS:
                    try:
                        el = await page.query_selector(sel)
                        if el:
                            price = parse_price((await el.inner_text()).replace("$", "").replace("€", "").replace("£", "").replace("₹", ""))
                            if price:
                                found_price = price
                                break
                    except Exception:
                        pass

                # If no price found via selectors, scan body
                if not found_price:
                    body_text = await page.inner_text("body")
                    price = parse_price(body_text)
                    if price:
                        found_price = price

                # Extract size from the page
                body_text = await page.inner_text("body")
                for pattern, unit_multiplier, _ in SIZE_PATTERNS:
                    m = pattern.search(body_text)
                    if m:
                        size_val = float(m.group(1))
                        found_size_ml = size_val * unit_multiplier
                        break

                per_unit = normalize_to_per_liter(found_price, found_size_ml) if found_price and found_size_ml else None

                return (found_price, "playwright", per_unit) if found_price else (None, "not_found", None)
            except Exception as e:
                return (None, f"error:{e}", None)
            finally:
                await browser.close()
    except Exception as e:
        return (None, f"playwright_unavailable:{e}", None)