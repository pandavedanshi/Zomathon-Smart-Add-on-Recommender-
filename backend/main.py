from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator
import xgboost as xgb
import json
import numpy as np
import time

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Zomathon CSAO Recommendation API",
    description="XGBoost-powered add-on recommendation engine with AI-generated copy.",
    version="1.0.0",
)

# ── CORS — allows React frontend at localhost:3000 ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load artifacts on startup ─────────────────────────────────────────────────
print("[SYSTEM] Booting up and loading artifacts into memory...")

model = xgb.XGBClassifier()
model.load_model("xgboost_addon_model.json")
print("[OK] XGBoost model loaded.")

with open("target_item_mapping.json", "r") as f:
    mapping_dict = json.load(f)
reverse_mapping = {int(v): k for k, v in mapping_dict.items()}
print(f"[OK] Item mapping loaded — {len(reverse_mapping)} items.")

with open("ai_ui_copy.json", "r") as f:
    ai_copy_dict = json.load(f)
print(f"[OK] AI copy loaded — {len(ai_copy_dict)} entries.")

# ── Fallback items for cold start ─────────────────────────────────────────────
UNIVERSAL_ADDONS = ["Bottled Water", "Cold Beverage", "French Fries"]

# ── Request schema — Pydantic V2 style ───────────────────────────────────────
class CartPayload(BaseModel):
    restaurant_id:      int   = Field(..., description="Unique restaurant identifier",        json_schema_extra={"example": 42})
    city:               int   = Field(..., description="1=Mumbai 2=Delhi 3=Bangalore 4=Hyderabad 5=Pune", json_schema_extra={"example": 1})
    time_of_day:        int   = Field(..., description="1=Morning 2=Afternoon 3=Evening 4=Night",         json_schema_extra={"example": 1})
    weather:            int   = Field(..., description="1=Clear 2=Cloudy 3=Rainy 4=Hot",                  json_schema_extra={"example": 1})
    current_cart_value: float = Field(..., description="Total value of items already in cart",            json_schema_extra={"example": 250.0})
    cart_size:          int   = Field(..., description="Number of items already in cart",                 json_schema_extra={"example": 2})
    restaurant_rating:  float = Field(..., description="Rating between 0.0 and 5.0",                     json_schema_extra={"example": 4.2})
    total_reviews:      int   = Field(..., description="Total number of reviews for this restaurant",     json_schema_extra={"example": 300})

    # Pydantic V2 validators
    @field_validator("restaurant_rating")
    @classmethod
    def rating_range(cls, v):
        if not (0.0 <= v <= 5.0):
            raise ValueError("restaurant_rating must be between 0.0 and 5.0")
        return v

    @field_validator("current_cart_value")
    @classmethod
    def cart_value_positive(cls, v):
        if v < 0:
            raise ValueError("current_cart_value must be >= 0")
        return v

    @field_validator("cart_size")
    @classmethod
    def cart_size_positive(cls, v):
        if v < 0:
            raise ValueError("cart_size must be >= 0")
        return v

# ── AI copy helper ────────────────────────────────────────────────────────────
def get_ai_text(item: str, time_of_day: int) -> str:
    context   = "morning" if time_of_day == 1 else "default"
    item_copy = ai_copy_dict.get(item, {})
    return (
        item_copy.get(context)
        or item_copy.get("default")
        or f"You can't go wrong with a fresh {item}!"
    )

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status":           "ok",
        "model":            "xgboost_addon_model.json",
        "items_in_catalog": len(reverse_mapping),
        "ai_copy_entries":  len(ai_copy_dict),
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}

# ── Recommendation endpoint ───────────────────────────────────────────────────
@app.post("/api/recommend", tags=["Recommendations"])
async def get_recommendations(cart: CartPayload):
    """
    Returns top-5 predicted add-on items with AI-generated copy.
    Uses cold_start_fallback when restaurant has no rating or < 5 reviews.
    """
    start_time = time.time()

    # Cold start
    if cart.restaurant_rating == 0.0 or cart.total_reviews < 5:
        results = [
            {"item": item, "ai_text": get_ai_text(item, cart.time_of_day)}
            for item in UNIVERSAL_ADDONS
        ]
        return {
            "strategy":        "cold_start_fallback",
            "recommendations": results,
            "latency_ms":      round((time.time() - start_time) * 1000, 2),
        }

    # XGBoost prediction
    try:
        features = np.array([[
            cart.restaurant_id,
            cart.city,
            cart.time_of_day,
            cart.weather,
            cart.current_cart_value,
            cart.cart_size,
            cart.restaurant_rating,
            cart.total_reviews,
        ]])

        probabilities = model.predict_proba(features)[0]
        top_5_indices = np.argsort(probabilities)[-5:][::-1]
        top_5_items   = [reverse_mapping[idx] for idx in top_5_indices]

        enriched = [
            {"item": item, "ai_text": get_ai_text(item, cart.time_of_day)}
            for item in top_5_items
        ]

        return {
            "strategy":        "xgboost_tree_ensemble",
            "recommendations": enriched,
            "latency_ms":      round((time.time() - start_time) * 1000, 2),
        }

    except KeyError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned unknown class index {e}. "
                   "Ensure target_item_mapping.json matches the trained model.",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Dev runner — use import string so reload works ────────────────────────────
if __name__ == "__main__":
    import uvicorn
    # "main:app" string form is required for --reload to work
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
