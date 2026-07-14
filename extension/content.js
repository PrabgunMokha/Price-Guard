(function() {
    // Guard: skip re-injection if the same valid context is already running.
    // Use getManifest() — it throws on invalidated context unlike runtime.id.
    if (window.__psLoaded) {
        const alive = (() => { try { chrome.runtime.getManifest(); return true; } catch(e) { return false; } })();
        if (alive) return;  // Same valid context — skip
        // Context died (extension reloaded) — clean up stale overlay
        const stale = document.getElementById('ps-overlay');
        if (stale) stale.remove();
    }
    window.__psLoaded = true;

    const api = typeof chrome !== 'undefined' ? chrome : browser;
    const API_URL = 'http://localhost:8000/api';
    const PRICE_SELECTORS = [
        // Generic price selectors
        '[data-price]', '.price', '.product-price', '#price', '.a-price',
        '[itemprop="price"]', '.sale-price', '.current-price', '.offer-price',
        '#product-price', '.special-price', '.regular-price', '.discounted-price',
        '.tw-text-400', '.tw-font-bold', '[data-pf="reset"]',
        '[class*="price"]', '[id*="price"]',
        // Indian e-commerce patterns
        '.MRP', '.mrp', '[class*="mrp"]', '.final-price', '.selling-price',
        '[data-testid*="price"]', '[class*="cost"]', '[class*="amount"]',
        // Amazon-style
        '.a-price-whole', '.a-price-fraction', '.a-offscreen',
        // Flipkart-style
        '._30jeq3', '._16Jk6d', '._3I9_wc', '._27UcVY',
        // Generic amount patterns
        '[class*="amt"]', '[class*="value"]', '.deal-price', '.best-price'
    ];

    function parsePrice(text) {
        if (!text) return null;
        // Handle common Indian formats: ₹ 32.00, Rs. 50, etc.
        const clean = text.replace(/[^\d.]/g, '');
        const n = parseFloat(clean);
        return isNaN(n) ? null : n;
    }

    function findPrice() {
        // True if el or any ancestor is a strikethrough / MRP element
        function isMrpElement(el) {
            let node = el;
            while (node && node !== document.body) {
                const tag = (node.tagName || '').toLowerCase();
                if (['del', 's', 'strike'].includes(tag)) return true;
                const cls = (node.className || '') + ' ' + (node.id || '');
                if (/\b(mrp|original[_-]?price|was[_-]?price|regular[_-]?price|line[_-]?through|strikethrough)\b/i.test(cls)) return true;
                node = node.parentElement;
            }
            return false;
        }

        // If a container holds BOTH MRP (strikethrough) and actual price,
        // clone it, remove MRP children, parse what's left.
        function extractFromMixedEl(el) {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('del, s, strike, [class*="line-through"], [class*="strikethrough"]').forEach(e => e.remove());
            const text = (clone.innerText || clone.textContent || '').trim();
            const p = parsePrice(text);
            return (p && p > 0 && p < 100000) ? p : null;
        }

        for (const sel of PRICE_SELECTORS) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
                if (isMrpElement(el)) continue;
                // Container has strikethrough children — extract non-MRP part
                if (el.querySelector('del, s, strike, [class*="line-through"]')) {
                    const p = extractFromMixedEl(el);
                    if (p) return p;
                    continue;
                }
                const text = (el.innerText || el.textContent || '').trim();
                const price = parsePrice(text);
                if (price && price > 0 && price < 100000) return price;
            }
        }
        // Regex fallback on body text
        const bodyText = document.body.innerText;
        const priceRegex = /(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/gi;
        const matches = [...bodyText.matchAll(priceRegex)];
        if (matches.length > 0) {
            const p = parseFloat(matches[0][1].replace(/,/g, ''));
            if (p > 0 && p < 100000) return p;
        }
        return null;
    }

    function getProductName() {
        // Try many product title selectors in order of preference
        const selectors = [
            '[itemprop="name"]', 
            '[data-testid="product-title"]',
            '[data-testid="product-name"]',
            '[class*="productTitle"]', '[class*="product-title"]',
            '[class*="productName"]', '[class*="product-name"]',
            '[class*="pdp-title"]', '[class*="pdp-name"]',
            '[class*="item-title"]', '[class*="item-name"]',
            'h1[class*="title"]', 'h1[class*="name"]',
            '.product-title', '.product-name', '.productTitle', '.productName',
            '[id*="product-title"]', '[id*="product-name"]',
            '[data-automation-id="title"]', '[data-qa="product-title"]',
            // Amazon, Flipkart specific
            '#productTitle', '.B_NuCI', '._4rR01T', '.s1Q9rs',
            // Generic h1 as last resort for product pages
            'h1'
        ];
        
        let structured = null;
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText?.trim()) {
                structured = el.innerText.trim();
                break;
            }
        }

        // og:title often contains marketing noise ("Price - Buy Online at ₹X in India")
        const metaTitle =
            document.querySelector('meta[property="og:title"]')?.content ||
            document.querySelector('meta[name="twitter:title"]')?.content;

        const raw = structured || metaTitle || document.title.split(/[|\-–]/)[0].trim() || document.title;

        return raw
            // Strip common e-commerce suffixes that pollute cross-site matching
            .replace(/\s*[-|:]\s*(buy|price|order|online|india|shop|get|offer|deal|discount|mrp|at\s+rs?\.?|₹).*/gi, '')
            .replace(/\|\s*.*$/, '')  // Remove everything after pipe
            // Strip product type words for better cross-site matching
            .replace(/\b(soft\s+drink|carbonated|beverage|cans?|original\s+taste)\b/gi, '')
            .replace(/[^\w\s\-']/g, '')
            .trim()
            .substring(0, 80);
    }

    function detectSize() {
        const selectedElements = [
            ...document.querySelectorAll('.selected, .active, [class*="selected"], [class*="active"], [aria-selected="true"]'),
            ...document.querySelectorAll('option:checked'),
            ...document.querySelectorAll('[class*="variant--active"]')
        ];
        const patterns = [
            /(\d+\.?\d*)\s*(ml|milliliters?|mL|mls?)/gi,
            /(\d+\.?\d*)\s*(l|liters?|L|lts?)/gi,
            /(\d+\.?\d*)\s*(kg|kilograms?|KG|kgs?)/gi,
            /(\d+\.?\d*)\s*(g|grams?|gr|gm|gms?)/gi,
            /(\d+\.?\d*)\s*(pcs?|pieces?|nos?|units?)/gi,
        ];
        const units = {
            ml: { regex: 0, mlPerUnit: 1 },
            L: { regex: 1, mlPerUnit: 1000 },
            kg: { regex: 2, mlPerUnit: 1000 },
            g: { regex: 3, mlPerUnit: 1 },
            pcs: { regex: 4, mlPerUnit: 1 },
        };
        for (const el of selectedElements) {
            const text = el.innerText || el.textContent;
            if (!text) continue;
            for (const [unit, info] of Object.entries(units)) {
                const match = text.match(patterns[info.regex]);
                if (match) return { rawSize: match[0], sizeMl: parseFloat(match[1]) * info.mlPerUnit, unit };
            }
        }
        // Fallback to text scans
        const text = document.body.innerText;
        for (const [unit, info] of Object.entries(units)) {
            const matches = [...text.matchAll(patterns[info.regex])];
            if (matches && matches[0]) return { rawSize: matches[0][0], sizeMl: parseFloat(matches[0][1]) * info.mlPerUnit, unit };
        }
        return null;
    }

    function isProductPage() {
        const bodyText = document.body.innerText.toLowerCase();
        const url = location.href.toLowerCase();
        
        // Skip obvious non-product pages early
        if (url.includes('/search') || url.includes('/category') || url.includes('/login') || 
            url.includes('/cart') || url.includes('/checkout') || url.includes('/account')) {
            return false;
        }

        const hasPrice = !!findPrice();
        if (!hasPrice) return false;

        // Broad Buy/Add button detection - covers 100+ e-commerce sites
        const buttonSelectors = [
            'button', 'a.button', '.btn', '[role="button"]',
            '[class*="add"]', '[class*="buy"]', '[class*="cart"]',
            '[id*="add"]', '[id*="buy"]', '[id*="cart"]',
            'input[type="submit"]', 'input[type="button"]'
        ];
        const buttons = Array.from(document.querySelectorAll(buttonSelectors.join(', ')));
        const buyKeywords = [
            'add', 'buy', 'cart', 'basket', 'bag', 'purchase', 'order',
            'add to', 'buy now', 'add cart', 'add bag', 'add to bag',
            'shop now', 'get now', 'order now', 'add basket',
            'cart add', 'buy this', 'purchase now', 'get it',
            'subscribe', 'subscribe now', 'subscribe & save'
        ];
        const hasBuyText = buttons.some(b => {
            const t = (b.innerText || b.value || b.title || b.getAttribute('aria-label') || '').toLowerCase();
            const hasIcon = b.querySelector('svg, i, .icon, [class*="icon"]') || 
                          b.innerHTML.includes('cart') || b.innerHTML.includes('bag');
            return buyKeywords.some(kw => t.includes(kw)) || hasIcon;
        });

        // Check for any clickable element with shopping intent
        const hasAddButton = document.querySelector([
            '[data-testid*="add"]', '[data-testid*="cart"]',
            '[data-action*="add"]', '[data-action*="cart"]',
            '[data-btntype*="add"]', '[data-track*="add"]'
        ].join(', ')) !== null;

        // Quantity/Size selectors (more patterns)
        const hasQuantity = !!document.querySelector([
            'select[id*="qty"]', '.quantity', '[class*="qty"]', '[class*="quantity"]',
            '[name*="qty"]', '[name*="quantity"]', 'input[id*="qty"]',
            '[data-testid*="quantity"]', '[data-testid*="qty"]',
            '[class*="size"]', '[class*="variant"]', '[class*="option"]'
        ].join(', '));
        
        // Schema.org Product detection
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const hasSchema = scripts.some(s => {
            const text = s.textContent || '';
            return text.includes('"Product"') || text.includes('"product"') || 
                   text.includes('"Offer"') || text.includes('"AggregateOffer"');
        }) || !!document.querySelector('[itemtype*="Product"], [itemtype*="product"]');
        
        // OpenGraph product detection
        const hasOG = document.querySelector('meta[property="og:type"]')?.content?.toLowerCase().includes('product');
        
        // URL patterns common to product pages
        const productUrlPatterns = [
            '/product', '/p/', '/item/', '/pd/', '/pr/', 
            '/dp/', '/gp/', '/buy/', '/shop/'
        ];
        const hasProductUrl = productUrlPatterns.some(p => url.includes(p));
        
        // Price container near buy buttons indicates product page
        const priceEl = document.querySelector('[class*="price"], [id*="price"], .price, #price, [data-price]');
        let priceNearBuy = false;
        if (priceEl) {
            const buyEls = document.querySelectorAll('button, .btn, [class*="add"], [class*="buy"]');
            for (const buyEl of buyEls) {
                const rect1 = priceEl.getBoundingClientRect();
                const rect2 = buyEl.getBoundingClientRect();
                // Check if they're close to each other (within 500px vertically)
                if (Math.abs(rect1.top - rect2.top) < 500 && Math.abs(rect1.left - rect2.left) < 800) {
                    priceNearBuy = true;
                    break;
                }
            }
        }

        // Valid if: has price AND any of these intent signals
        const hasIntent = hasBuyText || hasAddButton || hasSchema || hasOG || 
                          hasQuantity || hasProductUrl || priceNearBuy;
        
        if (hasPrice && hasIntent) {
            // Final check: not a listing page (multiple products)
            const productCards = document.querySelectorAll([
                '[class*="product-card"]', '[class*="product-item"]', '[class*="grid-item"]',
                '[data-testid*="product"]', '.product', '.item'
            ].join(', ')).length;
            const isListing = productCards > 3 || (bodyText.includes('results for') && !hasBuyText && !hasSchema);
            if (!isListing) return true;
        }
        return false;
    }

    function overlay(detected, fresh, pct, productName, diff, size, freshPerUnit, sourceDomain, sitesCompared, isCurrentCheapest) {
        let el = document.getElementById('ps-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ps-overlay';
            document.body.appendChild(el);
        }

        const hasDiff = diff != null && !isNaN(diff);
        const inflated = pct > 0;
        const sizeStr = size ? ` (${size.rawSize})` : '';
        const perUnitLabel = size && size.unit !== 'pcs' ? '/L' : '';
        const freshPerUnitStr = freshPerUnit != null ? ` (₹${freshPerUnit.toFixed(2)}/L)` : '';
        
        // Show "cheapest here" when current site is cheapest, otherwise show where it is cheapest
        let sourceLabel = '';
        if (isCurrentCheapest) {
            sourceLabel = `<div style="font-size:10px;color:#7bf5a7;margin-top:2px">✅ Cheapest here (compared ${sitesCompared > 0 ? sitesCompared : 'to other'} site${sitesCompared !== 1 ? 's' : ''})</div>`;
        } else if (sourceDomain) {
            sourceLabel = `<div style="font-size:10px;color:#7bf5a7;margin-top:2px">📍 cheapest on ${sourceDomain}${sitesCompared > 1 ? ` (of ${sitesCompared} sites)` : ''}</div>`;
        }

        let diffColor = '#fff';
        let diffLabel = 'Price diff';
        if (hasDiff) {
            if (diff > 0) { diffColor = '#ff6b6b'; diffLabel = 'You pay more'; }
            else if (diff < 0) { diffColor = '#7bf5a7'; diffLabel = 'You pay less'; }
            else { diffColor = '#aaa'; diffLabel = 'Same price'; }
        }

        el.style = "position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#1a1a2e;color:#fff;border-radius:12px;padding:14px 18px;font-family:-apple-system,sans-serif;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:260px;transition:all 0.3s ease";
        el.innerHTML = `
            <div style="font-size:11px;font-weight:600;color:#7bf5a7;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">PriceScope</div>
            <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:10px;line-height:1.3">${productName || '—'}</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="color:#aaa">Your price</span><span style="font-weight:600;color:#ff6b6b">₹${detected?.toFixed(2) ?? '—'}${sizeStr}</span></div>
            <div style="margin-bottom:5px">
              <div style="display:flex;justify-content:space-between"><span style="color:#aaa">Fresh price</span><span style="font-weight:600;color:${fresh && detected > fresh ? '#7bf5a7' : '#fff'}">${fresh ? '₹' + fresh.toFixed(2) + perUnitLabel + freshPerUnitStr : '—'}</span></div>
              ${sourceLabel}
            </div>
            <div style="display:flex;justify-content:space-between"><span style="color:#aaa">Inflation</span><span style="font-weight:600;color:${inflated ? '#ff6b6b' : '#7bf5a7'}">${pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : 'N/A'}</span></div>
            ${hasDiff ? `<hr style="border:none;border-top:1px solid #333;margin:8px 0"><div style="display:flex;justify-content:space-between"><span style="color:#aaa">${diffLabel}</span><span style="font-weight:600;color:${diffColor}">₹${Math.abs(diff).toFixed(2)}</span></div>` : ''}
            ${inflated ? '<div style="display:inline-block;background:#2a2a4a;border-radius:6px;padding:3px 8px;font-size:11px;color:#7bf5a7;margin-top:6px">⚠ Possible price discrimination</div>' : ''}
        `;

        if (hasDiff && Math.abs(diff) >= 1) {
            const siteNote = sourceDomain ? ` (cheaper on ${sourceDomain})` : '';
            api.runtime.sendMessage({
                type: 'SHOW_ALERT',
                title: diff > 0 ? '⚠ You\'re being overcharged!' : '✅ Great deal found!',
                message: `₹${Math.abs(diff).toFixed(2)} ${diff > 0 ? 'more expensive' : 'cheaper'} than ${sourceDomain || 'another site'}${siteNote}.`,
            });
        }
    }

    async function init() {
        if (!isProductPage()) return;
        const productName = getProductName();
        const currentPrice = findPrice();
        if (!currentPrice) return;

        const size = detectSize();
        const perUnit = (currentPrice && size && size.sizeMl > 0 && size.unit !== 'pcs') ? (currentPrice / size.sizeMl) * 1000 : null;

        overlay(currentPrice, null, null, productName, null, size, null);

        try {
            // Cache this price FIRST so the next site can find it
            api.runtime.sendMessage({
                type: 'PRICE_DETECTED',
                url: location.href,
                detectedPrice: currentPrice,
                productName,
                pricePerUnit: perUnit,
                sizeMl: size?.sizeMl,
                sizeUnit: size?.unit
            });

            // Now fetch fresh price (may come from another site's cached entry above)
            const data = await api.runtime.sendMessage({ 
                type: 'GET_FRESH_PRICE', 
                url: location.href, 
                productName,
                currentPrice: currentPrice,
                currentPerUnit: perUnit
            });
            
            // Handle both old format (fresh_price) and new format with is_current_cheapest
            const freshPrice = data?.best_price || data?.fresh_price;
            const isCurrentCheapest = data?.is_current_cheapest;
            const src = isCurrentCheapest ? null : (data?.cheapest_domain || data?.source_domain);
            
            if (freshPrice) {
                const diff = currentPrice - freshPrice;
                const pct = Math.round((diff / freshPrice) * 10000) / 100;

                let displayDiff = diff;
                let displayPct = pct;
                const bestPerUnit = data?.best_per_unit || data?.fresh_per_unit;

                if (bestPerUnit != null && perUnit != null && bestPerUnit > 0) {
                    displayDiff = perUnit - bestPerUnit;
                    displayPct = Math.round((displayDiff / bestPerUnit) * 10000) / 100;
                    overlay(currentPrice, freshPrice, displayPct, productName, displayDiff, size, bestPerUnit, src, data?.sites_compared, isCurrentCheapest);
                } else {
                    overlay(currentPrice, freshPrice, pct, productName, diff, size, null, src, data?.sites_compared, isCurrentCheapest);
                }
            }
        } catch (e) {
            console.warn('[PriceScope]', e);
        }
    }

    api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'GET_PRODUCT_INFO') {
            sendResponse({ productName: getProductName(), price: findPrice(), size: detectSize() });
        }
    });

    let debounce;
    const trigger = () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { try { init(); } catch(e) { console.warn('[PriceScope]', e); } }, 1000);
    };
    window.addEventListener('click', trigger);
    window.addEventListener('load', trigger);
    setTimeout(() => { try { init(); } catch(e) { console.warn('[PriceScope]', e); } }, 3000);
})();