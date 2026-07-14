# PriceScope Extension Enhancements

I have updated the PriceScope extension to meet the specific requirements:
1.  **Restrict Detection to Product Pages**: The extension now checks for product-specific signals (Schema.org metadata, OpenGraph tags, buy buttons) before activating.
2.  **Quantity-Aware Scraping**: The logic now focuses on the "selected" size or quantity (e.g., if you choose 500g, it will try to detect the 500g label) to ensure the price comparison is accurate for the chosen variant.
3.  **Real-time Alerts**: If the price difference between your page and the "fresh price" is ₹1 or more, the extension will now trigger a browser notification.
4.  **Login Verification**: Verified the login and registration flow in `popup.js`.

## Key Changes

### `extension/content.js`
- Added `isProductPage()` to filter out non-product pages.
- Improved `detectSize()` to prioritize `.active` or `.selected` elements.
- Added a `click` listener to re-run detection when the user selects a different size.
- Added a trigger for `SHOW_ALERT` when the price difference is significant.

### `extension/background.js`
- Added a handler for `SHOW_ALERT` to show browser notifications.
- Updated currency formatting to use `₹`.

### `extension/popup.js`
- Updated currency symbols to `₹`.

## How to Test

### 1. Start the Backend
```bash
cd backend
uvicorn main:app --port 8000
```

### 2. Load the Extension
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder.

### 3. Verify on Mock Page
1. I have created a `test_product.html` file in the project root.
2. Open this file in your browser.
3. You should see the PriceScope overlay.
4. Try clicking different sizes (250g, 500g, 1kg). The overlay should update and show the price for the specific size selected.
5. If the backend reports a "fresh price" that differs by ₹1 or more, you will see a browser notification.

### 4. Verify Login
1. Click the extension icon in the toolbar.
2. Click **Sign In**.
3. Enter any email and password (it will register automatically if the user doesn't exist).
4. Verify that your username (email prefix) appears in the top right badge.
