import { useState, useRef, useEffect } from 'react';
import './App.css';
import { getRecommendations } from './api';

// ── Mock fallback (used when backend is unreachable) ───
const MOCK_RESPONSE = (p) => {
  const morning = p.time_of_day === 1;
  const rainy   = p.weather === 3;
  return {
    strategy:   'xgboost_tree_ensemble',
    latency_ms: (Math.random() * 38 + 11).toFixed(2),
    recommendations: [
      {
        item:    'Masala Chai',
        ai_text: morning
          ? 'The perfect morning companion — warm, spiced, and deeply satisfying.'
          : rainy
          ? 'A cup of chai is exactly what a rainy evening calls for.'
          : 'Pairs beautifully with almost anything on the menu.',
      },
      { item: 'Garlic Bread', ai_text: 'Golden, buttery, and impossible to pass up alongside your main order.' },
      { item: 'Cold Coffee',  ai_text: 'Smooth, chilled, and universally loved — a reliable add-on at any hour.' },
      { item: 'French Fries', ai_text: 'Crisp on the outside, fluffy within. The timeless companion to any meal.' },
      { item: 'Gulab Jamun',  ai_text: 'End on a high note — rich, syrupy, and just the right indulgence.' },
    ],
  };
};

// ── Score bar — animates width on mount ───────────────
function ScoreBar({ pct }) {
  const fillRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (fillRef.current) fillRef.current.style.width = pct + '%';
    }, 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="addon-bar">
      <div className="addon-bar-fill" ref={fillRef} />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────
function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`}>{message}</div>;
}

// ── Main App ──────────────────────────────────────────
export default function App() {

  // Order context — maps 1:1 to CartPayload in main.py
  const [ctx, setCtx] = useState({
    restaurant_id:     42,
    city:              1,   // 1=Mumbai 2=Delhi 3=Bangalore 4=Hyderabad 5=Pune
    time_of_day:       1,   // 1=Morning 2=Afternoon 3=Evening 4=Night
    weather:           1,   // 1=Clear 2=Cloudy 3=Rainy 4=Hot
    restaurant_rating: 4.2,
    total_reviews:     250,
  });

  // Cart
  const [cartItems, setCartItems] = useState([]);
  const [newName,   setNewName]   = useState('');
  const [newQty,    setNewQty]    = useState(1);
  const [newPrice,  setNewPrice]  = useState('');

  // API state
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [addedSet, setAddedSet] = useState(new Set());
  const [apiError, setApiError] = useState('');

  // Toast
  const [toast,    setToast]    = useState('');
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  // ── Cart helpers ──────────────────────────────────
  const addItem = () => {
    if (!newName.trim()) { showToast('Please enter an item name'); return; }
    setCartItems(prev => [
      ...prev,
      { name: newName.trim(), qty: Number(newQty) || 1, price: parseFloat(newPrice) || 0 },
    ]);
    setNewName(''); setNewQty(1); setNewPrice('');
  };

  const removeItem = (idx) =>
    setCartItems(prev => prev.filter((_, i) => i !== idx));

  const addAddon = (idx, name) => {
    setCartItems(prev => [...prev, { name, qty: 1, price: 0 }]);
    setAddedSet(prev => new Set([...prev, idx]));
    showToast(`"${name}" added to cart`);
  };

  const totalVal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);

  // ── Context field change ──────────────────────────
  const handleCtxChange = (e) => {
    const { name, value } = e.target;
    setCtx(prev => ({
      ...prev,
      [name]: name === 'restaurant_rating'
        ? parseFloat(value) || 0
        : parseInt(value)  || 0,
    }));
  };

  // ── Call POST /api/recommend via axios ────────────
  const runRecommendation = async () => {
    if (!cartItems.length) { showToast('Add at least one cart item first'); return; }

    setLoading(true);
    setResult(null);
    setAddedSet(new Set());
    setApiError('');

    // Matches CartPayload in main.py exactly
    const payload = {
      restaurant_id:      ctx.restaurant_id,
      city:               ctx.city,
      time_of_day:        ctx.time_of_day,
      weather:            ctx.weather,
      current_cart_value: totalVal,   // auto-computed from cart
      cart_size:          totalQty,   // auto-computed from cart
      restaurant_rating:  ctx.restaurant_rating,
      total_reviews:      ctx.total_reviews,
    };

    try {
      // ── axios call via api.js service ────────────
      const data = await getRecommendations(payload);
      setResult(data);
    } catch (err) {
      // Axios throws on non-2xx and network errors
      // Error message already formatted by interceptor in api.js
      setApiError(`Backend unreachable — showing demo data. (${err.message})`);
      // Still show mock so UI isn't blank
      await new Promise(r => setTimeout(r, 600));
      setResult(MOCK_RESPONSE(payload));
    } finally {
      setLoading(false);
    }
  };

  const recs = result?.recommendations || [];

  return (
    <>
      {/* ── HEADER ── */}
      <header>
        <div className="logo">
          <div className="logo-icon">🍽️</div>
          Zomathon
          <div className="logo-divider" />
          <span className="logo-sub">Add-on Intelligence</span>
        </div>
        <div className="header-tag">⚡ XGBoost · CSAO</div>
      </header>

      {/* ── ERROR BANNER ── */}
      {apiError && (
        <div className="error-banner">
          ⚠️ {apiError}
          <button className="error-close" onClick={() => setApiError('')}>×</button>
        </div>
      )}

      {/* ── PAGE ── */}
      <div className="page">

        {/* LEFT COLUMN */}
        <div className="left-col">

          <div>
            <div className="page-title">Smart Add-on Recommender</div>
            <div className="page-sub">
              Fill in the order context, build the cart, and run the model.
            </div>
          </div>

          {/* Order Context */}
          <div>
            <div className="eyebrow">Order Context</div>
            <div className="context-card">
              <div className="form-grid">

                <div className="form-field">
                  <label>Restaurant ID</label>
                  <input
                    type="number" name="restaurant_id"
                    value={ctx.restaurant_id} onChange={handleCtxChange}
                    placeholder="e.g. 42"
                  />
                </div>

                <div className="form-field">
                  <label>City</label>
                  <select name="city" value={ctx.city} onChange={handleCtxChange}>
                    <option value={1}>Mumbai</option>
                    <option value={2}>Delhi</option>
                    <option value={3}>Bangalore</option>
                    <option value={4}>Hyderabad</option>
                    <option value={5}>Pune</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Time of Day</label>
                  <select name="time_of_day" value={ctx.time_of_day} onChange={handleCtxChange}>
                    <option value={1}>Morning</option>
                    <option value={2}>Afternoon</option>
                    <option value={3}>Evening</option>
                    <option value={4}>Night</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Weather</label>
                  <select name="weather" value={ctx.weather} onChange={handleCtxChange}>
                    <option value={1}>Clear</option>
                    <option value={2}>Cloudy</option>
                    <option value={3}>Rainy</option>
                    <option value={4}>Hot</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Restaurant Rating</label>
                  <input
                    type="number" name="restaurant_rating"
                    step="0.1" min="0" max="5"
                    value={ctx.restaurant_rating} onChange={handleCtxChange}
                    placeholder="4.2"
                  />
                </div>

                <div className="form-field">
                  <label>Total Reviews</label>
                  <input
                    type="number" name="total_reviews"
                    value={ctx.total_reviews} onChange={handleCtxChange}
                    placeholder="250"
                  />
                </div>

              </div>

              {/* Live payload preview */}
              <div className="payload-preview">
                <span className="payload-label">Payload →</span>
                <code>
                  cart_value: ₹{totalVal.toFixed(0)}&nbsp;|&nbsp;
                  cart_size: {totalQty}&nbsp;|&nbsp;
                  rating: {ctx.restaurant_rating}&nbsp;|&nbsp;
                  reviews: {ctx.total_reviews}
                </code>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div>
            <div className="eyebrow">Cart Items</div>
            <div className="cart-card">

              <div className="cart-head">
                <span>#</span>
                <span>Item</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span />
              </div>

              <div className="item-rows">
                {cartItems.length === 0 ? (
                  <div className="empty-cart">No items yet — add one below.</div>
                ) : (
                  cartItems.map((item, i) => (
                    <div className="item-row" key={i} style={{ animationDelay: `${i * 0.03}s` }}>
                      <span className="row-num">{i + 1}</span>
                      <span className="row-name">{item.name}</span>
                      <span className="row-qty">×{item.qty}</span>
                      <span className="row-price">₹{(item.price * item.qty).toFixed(2)}</span>
                      <button className="row-del" onClick={() => removeItem(i)} title="Remove">×</button>
                    </div>
                  ))
                )}
              </div>

              <div className="add-bar">
                <input
                  type="text" placeholder="Item name…"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <input
                  type="number" placeholder="Qty" min="1"
                  value={newQty} onChange={e => setNewQty(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <input
                  type="number" placeholder="₹ price" min="0" step="0.01"
                  value={newPrice} onChange={e => setNewPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <button className="add-item-btn" onClick={addItem}>+ Add</button>
              </div>

              <div className="cart-footer">
                <div>
                  <div className="cart-total-label">Cart Total</div>
                  <div className="cart-total-value">
                    ₹{totalVal.toFixed(2)}{' '}
                    <em>({totalQty} item{totalQty !== 1 ? 's' : ''})</em>
                  </div>
                </div>
                <button
                  className={`run-btn ${loading ? 'loading' : ''}`}
                  onClick={runRecommendation}
                >
                  <div className="spin" />
                  <span className="btn-text">
                    {loading ? 'Predicting…' : 'Get Recommendations'}
                  </span>
                </button>
              </div>

            </div>
          </div>

        </div>{/* /left-col */}

        {/* RIGHT COLUMN */}
        <div className="right-col">

          {/* AI Insight */}
          <div>
            <div className="eyebrow">AI Insight</div>
            <div className="ai-card">
              <div className="ai-label">
                <div className="ai-dot" />
                Model Commentary
              </div>
              <div className={`ai-quote ${recs.length ? '' : 'empty'}`}>
                {loading
                  ? 'Running XGBoost prediction…'
                  : recs.length
                  ? recs[0].ai_text || 'No commentary available.'
                  : "Run a prediction to see the model's insight on this order."}
              </div>
              <div className="ai-footer">
                <span className="strategy-tag">{result?.strategy || '—'}</span>
                <span>{result?.latency_ms ? `${result.latency_ms} ms` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Recommended Add-ons */}
          <div>
            <div className="eyebrow">Recommended Add-ons</div>
            <div className="addons-card">
              <div className="addons-header">
                <span className="addons-title">XGBoost Predictions</span>
                <span className="addons-count">{recs.length ? `${recs.length} items` : '—'}</span>
              </div>

              <div className="addons-list">
                {loading ? (
                  <div className="addons-loading">
                    <div className="loading-spinner" />
                    <span>Running model…</span>
                  </div>
                ) : recs.length === 0 ? (
                  <div className="addons-empty">
                    <strong>Awaiting prediction</strong>
                    Build your cart and hit "Get Recommendations".
                  </div>
                ) : (
                  recs.map((rec, i) => {
                    const pct   = Math.round(Math.max(0.52, 0.96 - i * 0.09) * 100);
                    const added = addedSet.has(i);
                    return (
                      <div className="addon-row" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                        <div className="addon-index">{i + 1}</div>
                        <div className="addon-body">
                          <div className="addon-name">{rec.item}</div>
                          <div className="addon-ai-text">{rec.ai_text}</div>
                          <div className="score-row">
                            <ScoreBar pct={pct} />
                            <span className="addon-score-val">{pct}% match</span>
                          </div>
                        </div>
                        <button
                          className={`addon-add ${added ? 'added' : ''}`}
                          onClick={() => !added && addAddon(i, rec.item)}
                        >
                          {added ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>{/* /right-col */}

      </div>{/* /page */}

      <Toast message={toast} />
    </>
  );
}
