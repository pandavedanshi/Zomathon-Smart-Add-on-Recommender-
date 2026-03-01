# 🍽️ Zomathon — Smart Add-on Recommender

> An XGBoost-powered add-on recommendation engine built for the Zomathon hackathon. Predicts the top 5 food add-ons a customer is likely to order, enriched with AI-generated contextual copy — served via a FastAPI backend and a Zomato-themed React frontend.

---

## 📸 Preview

| Left Panel | Right Panel |
|---|---|
| Order context form + cart builder | AI insight card + ranked add-on predictions |

---

## 🗂️ Project Structure

```
ZOMATHON/
├── backend/
│   ├── main.py                    # FastAPI app — model serving + CORS
│   ├── requirements.txt           # Python dependencies
│   ├── xgboost_addon_model.json   # Trained XGBoost classifier
│   ├── target_item_mapping.json   # Encoded label → item name mapping
│   └── ai_ui_copy.json            # AI-generated copy per item + context
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js                 # Main React component
│       ├── App.css                # Zomato-themed styles
│       ├── api.js                 # Axios instance + API service
│       └── index.js               # React entry point
│
├── .gitignore
├── render.yaml                    # Render deployment config
└── README.md
```

---

## ⚙️ Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **XGBoost** | Add-on prediction model |
| **Pydantic V2** | Request validation |
| **Uvicorn** | ASGI server |
| **NumPy** | Feature array construction |

### Frontend
| Tool | Purpose |
|---|---|
| **React 18** | UI framework |
| **Axios** | HTTP client with interceptors |
| **CSS Variables** | Zomato design system theming |
| **Google Fonts — Okra** | Zomato's typeface |

### Deployment
| Service | What's deployed |
|---|---|
| **Render** | FastAPI backend |
| **Vercel** | React frontend |

---

## 🧠 How the Model Works

The XGBoost classifier takes **8 features** from the order context:

| Feature | Type | Description |
|---|---|---|
| `restaurant_id` | int | Unique restaurant identifier |
| `city` | int | 1=Mumbai, 2=Delhi, 3=Bangalore, 4=Hyderabad, 5=Pune |
| `time_of_day` | int | 1=Morning, 2=Afternoon, 3=Evening, 4=Night |
| `weather` | int | 1=Clear, 2=Cloudy, 3=Rainy, 4=Hot |
| `current_cart_value` | float | Total value of items in cart (auto-computed) |
| `cart_size` | int | Number of items in cart (auto-computed) |
| `restaurant_rating` | float | Restaurant rating (0.0–5.0) |
| `total_reviews` | int | Total number of reviews |

**Prediction flow:**
1. React frontend collects context + cart → computes `cart_value` and `cart_size` automatically
2. Sends `POST /api/recommend` with the full payload
3. FastAPI runs `model.predict_proba()` → sorts top 5 class probabilities
4. Maps class indices → item names via `target_item_mapping.json`
5. Attaches contextual AI copy from `ai_ui_copy.json`
6. Returns `{ strategy, recommendations: [{item, ai_text}], latency_ms }`

**Cold start fallback:** If `restaurant_rating == 0` or `total_reviews < 5`, returns universal add-ons instead of running the model.

---

## 🚀 Running Locally

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/zomathon.git
cd zomathon
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at → `http://localhost:8000`
Interactive API docs → `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`:

```env
REACT_APP_API_URL=http://localhost:8000
```

Then:

```bash
npm start
```

Frontend runs at → `http://localhost:3000`

---

## 🌐 API Reference

### `GET /`
Returns model status and catalog size.

```json
{
  "status": "ok",
  "model": "xgboost_addon_model.json",
  "items_in_catalog": 11,
  "ai_copy_entries": 9
}
```

### `GET /health`
Health check endpoint used by Render.

```json
{ "status": "healthy" }
```

### `POST /api/recommend`

**Request body:**
```json
{
  "restaurant_id": 42,
  "city": 1,
  "time_of_day": 2,
  "weather": 3,
  "current_cart_value": 340.0,
  "cart_size": 3,
  "restaurant_rating": 4.2,
  "total_reviews": 250
}
```

**Response:**
```json
{
  "strategy": "xgboost_tree_ensemble",
  "recommendations": [
    { "item": "Masala Chai", "ai_text": "A cup of chai is exactly what a rainy evening calls for." },
    { "item": "Garlic Bread", "ai_text": "Golden, buttery, and impossible to pass up." },
    { "item": "Cold Coffee", "ai_text": "Smooth, chilled, and universally loved." },
    { "item": "French Fries", "ai_text": "The timeless companion to any meal." },
    { "item": "Gulab Jamun", "ai_text": "End on a high note." }
  ],
  "latency_ms": 18.43
}
```

**Strategies returned:**
| Value | Meaning |
|---|---|
| `xgboost_tree_ensemble` | Model ran successfully |
| `cold_start_fallback` | No rating or < 5 reviews — universal fallback used |

---

## 🎨 Frontend Features

- **Zomato red** (`#E23744`) design system throughout
- **Live payload preview** — shows `cart_value`, `cart_size`, `rating`, `reviews` updating in real time as you build the cart
- **Cart builder** — add items with name, qty, price; auto-totals feed directly into the API payload
- **AI insight card** — displays the top prediction's `ai_text` as a headline
- **Ranked add-ons list** — top 5 with animated confidence score bars
- **Error banner** — gracefully shows if backend is unreachable, falls back to mock data
- **Loading states** — spinner and "Predicting…" button text during API call
- **Toast notifications** — feedback on add/remove actions
- **Enter key shortcut** — press Enter in any cart input to add the item
- **Responsive layout** — collapses to single column on mobile

---

## ☁️ Deployment

### Backend → Render

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo — Render auto-detects `render.yaml`
4. Click **Apply** and wait for the build
5. Copy your live URL: `https://zomathon-backend.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - **Key:** `REACT_APP_API_URL`
   - **Value:** `https://zomathon-backend.onrender.com`
4. Click **Deploy**

### After deployment — update CORS

Add your Vercel URL to `allow_origins` in `backend/main.py`:

```python
allow_origins=[
    "http://localhost:3000",
    "https://your-app.vercel.app",  # ← add this
]
```

Push the change — Render will auto-redeploy.

> ⚠️ **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after sleep may take ~30 seconds.

---

## 📁 Key Files Explained

### `backend/main.py`
- Loads model + mappings + AI copy on startup
- Validates all incoming fields with Pydantic V2 `@field_validator`
- Runs `predict_proba` → sorts top 5 → enriches with AI copy
- Handles cold start fallback automatically

### `frontend/src/api.js`
- Axios instance with `baseURL` from `REACT_APP_API_URL` env var
- Request interceptor logs all outgoing calls in dev console
- Response interceptor extracts FastAPI's `detail` error message cleanly
- Exports `getRecommendations(payload)` used by `App.js`

### `frontend/src/App.js`
- All state managed with React hooks (`useState`, `useRef`, `useEffect`)
- Cart total and size auto-computed and injected into payload
- `ScoreBar` component animates confidence bar widths on mount
- Mock fallback renders if API call fails so UI is never blank

### `ai_ui_copy.json`
- Keyed by item name
- Each item has `"morning"` and `"default"` context keys
- Backend picks `"morning"` copy when `time_of_day === 1`, otherwise `"default"`

---

## 🛠️ Development Notes

- All 8 `CartPayload` fields in `main.py` must stay in sync with the feature order the XGBoost model was trained on
- `target_item_mapping.json` must match the label encoding used during training — do not reorder
- `REACT_APP_` prefix is required by Create React App for env vars to be accessible in the browser
- The `render.yaml` `startCommand` uses `$PORT` — Render injects this automatically; do not hardcode a port

---

## 👥 Built for Zomathon

This project was built as part of the **Zomathon hackathon** — a challenge to build intelligent, data-driven features for food delivery experiences using machine learning.

---