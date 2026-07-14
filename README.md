# PriceScope

A browser extension that detects price discrimination by comparing the price you see with what new customers see. It helps you avoid being overcharged when shopping online.

## Features

- **Price Detection**: Automatically detects product prices on e-commerce websites
- **Fresh Price Comparison**: Compares your price with what new customers see using headless browser scraping
- **Real-time Alerts**: Browser notifications when price differences are detected (₹1 or more)
- **Quantity-Aware**: Detects prices for specific product variants (sizes, quantities)
- **Product Page Filtering**: Only activates on actual product pages using Schema.org and OpenGraph metadata
- **Price History**: Track price changes over time
- **Price Alerts**: Set target prices and get notified when prices drop
- **User Authentication**: Secure login/registration with JWT tokens

## Architecture

```
User Browser
├── Extension (Chrome Extension)
│   ├── popup.html + popup.js - Extension UI
│   ├── content.js - Price detection on webpages
│   └── background.js - Price alerts & notifications
├── Frontend (React + Vite)
│   ├── /login - Authentication
│   ├── / - Dashboard
│   ├── /history - Price history
│   └── /alerts - Manage alerts
└── Backend (FastAPI)
    ├── /api/auth/* - JWT authentication
    ├── /api/prices/* - Price operations
    └── playwright_engine.py - Headless browser scraping
```

## Tech Stack

- **Backend**: FastAPI, SQLite, Playwright, JWT
- **Extension**: Vanilla JavaScript, Chrome Extension APIs
- **Frontend**: React, Vite, TailwindCSS

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Chrome browser

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
playwright install chromium --with-deps
uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder
5. The PriceScope icon will appear in your toolbar

## Usage

### 1. Sign In / Register

1. Click the PriceScope extension icon
2. Click **Sign In**
3. Enter your email and password (auto-registers if account doesn't exist)
4. Your username (email prefix) will appear in the badge

### 2. Check Product Prices

1. Navigate to any product page on an e-commerce site
2. The extension will automatically detect if it's a product page
3. PriceScope overlay will appear showing:
   - Current price (what you see)
   - Fresh price (what new customers see)
   - Price difference percentage
4. If the difference is ₹1 or more, you'll receive a browser notification

### 3. Test with Mock Page

A test page is included at `test_product.html`:

```bash
# Open in browser
open test_product.html
```

Try clicking different sizes (250g, 500g, 1kg) to see the overlay update with variant-specific prices.

### 4. Set Price Alerts

1. Go to the frontend dashboard at `http://localhost:5173/alerts`
2. Add a URL and target price
3. When the price drops to or below your target, you'll receive a notification

## Project Structure

```
brower extension/
├── backend/
│   ├── main.py              # FastAPI app & endpoints
│   ├── auth.py              # JWT authentication
│   ├── models.py            # Database models
│   ├── playwright_engine.py # Headless browser scraping
│   ├── requirements.txt     # Python dependencies
│   └── pricescope.db        # SQLite database
├── extension/
│   ├── manifest.json        # Extension configuration
│   ├── popup.html           # Extension popup UI
│   ├── popup.js             # Popup logic
│   ├── popup.css            # Popup styling
│   ├── content.js           # Content script (price detection)
│   └── background.js        # Background script (alerts)
├── frontend/
│   ├── src/                 # React source code
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
├── test_product.html        # Mock product page for testing
├── SUMMARY.md               # Recent enhancement summary
└── QUICK_FAQ.md             # Hindi/English FAQ
```

## Database Schema

- **User**: Email, hashed password
- **PriceSnapshot**: User's price history (URL, price, timestamp)
- **PriceAlert**: URL and target price for alerts
- **CrowdsourcedPrice**: Community-reported prices for averaging

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Prices
- `POST /api/prices/fresh` - Get fresh price for a URL
- `POST /api/prices/snapshot` - Save price snapshot
- `GET /api/prices/history` - Get user's price history

### Alerts
- `POST /api/alerts` - Create price alert
- `GET /api/alerts` - Get user's alerts
- `DELETE /api/alerts/{id}` - Delete alert

## Troubleshooting

**Import errors**: Run `pip install -r requirements.txt` in backend folder

**Database errors**: Delete `pricescope.db` and restart the server

**Port 8000 in use**: Run `uvicorn main:app --reload --port 8001`

**Playwright errors**: Run `playwright install chromium --with-deps`

**Extension won't load**: Ensure Developer mode is on and you selected the correct `extension` folder

## Key Files to Understand

- `backend/main.py` - Server and all API endpoints
- `extension/popup.js` - Extension popup UI logic
- `extension/content.js` - Webpage price detection
- `extension/background.js` - Price alert notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
