import React, { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function QuoteGenerator() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchQuote = async () => {
    setLoading(true); setError(""); setQuote(null);
    try {
      const res = await axios.get(`${API_BASE}/api/quote`);
      setQuote(res.data.quote);
    } catch (err) {
      console.error(err);
      setError("Could not fetch quote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="row">
        <button className="btn" onClick={fetchQuote} disabled={loading}>
          {loading ? <span className="loader" /> : "Get Motivational Quote"}
        </button>
      </div>

      {error && <div style={{ color: "salmon" }}>{error}</div>}

      {quote && (
        <div className="quote-block enter" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "linear-gradient(90deg,var(--accent), var(--accent-2))", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h4v6H7zM13 7h4v6h-4z" fill="#fff"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <blockquote style={{ margin: 0, fontStyle: "italic" }}>"{quote.text}"</blockquote>
              <div className="small" style={{ marginTop: 6 }}>— {quote.author}</div>
            </div>
          </div>
        </div>
      )}
      {!quote && !loading && <div className="small">Click button to fetch an inspiring quote.</div>}
    </div>
  );
}
