// client/src/components/CurrencyConverter.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const CURRENCIES = [
  { code: "USD", country: "United States", flag: "🇺🇸" },
  { code: "EUR", country: "Eurozone", flag: "🇪🇺" },
  { code: "GBP", country: "United Kingdom", flag: "🇬🇧" },
  { code: "INR", country: "India", flag: "🇮🇳" },
  { code: "JPY", country: "Japan", flag: "🇯🇵" },
  { code: "AUD", country: "Australia", flag: "🇦🇺" },
  { code: "CAD", country: "Canada", flag: "🇨🇦" },
  { code: "SGD", country: "Singapore", flag: "🇸🇬" },
  { code: "CHF", country: "Switzerland", flag: "🇨🇭" },
  { code: "CNY", country: "China", flag: "🇨🇳" },
  { code: "AED", country: "U.A.E.", flag: "🇦🇪" },
];

const symbolFor = (code) =>
  ({
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    CHF: "CHF",
    CNY: "¥",
    AED: "د.إ",
  }[code] || "");

// Animated number hook
function useAnimatedNumber(target, duration = 700) {
  const [value, setValue] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    let start = null;
    const from = 0;
    const to = Number(target) || 0;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setValue((from + (to - from) * eased).toFixed(4));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// Small presentational wrapper to legally use the hook
function AnimatedNumber({ value, duration = 800 }) {
  const animated = useAnimatedNumber(value, duration);
  return <>{animated}</>;
}

export default function CurrencyConverter() {
  const [base, setBase] = useState("INR");
  const [amount, setAmount] = useState(100);

  // dropdown state
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(["USD", "EUR", "GBP"]);
  const [activeIndex, setActiveIndex] = useState(0); // keyboard highlight

  // results
  const [result, setResult] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtered list (exclude base)
  const filtered = CURRENCIES
    .filter((c) => c.code !== base)
    .filter(
      (c) =>
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase())
    );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, base, open]);

  // Toggle selection for a currency code
  const toggle = (code) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const selectAll = () => setSelected(filtered.map((f) => f.code));
  const clearAll = () => setSelected([]);

  // Keyboard handling inside dropdown list
  const onKeyDownList = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) toggle(item.code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const doConvert = async () => {
    const amt = amount === "" ? 0 : Number(amount);
    if (selected.length === 0) {
      setError("Select at least one target currency.");
      return;
    }
    if (Number.isNaN(amt) || amt < 0) {
      setError("Enter a valid non-negative amount.");
      return;
    }

    setLoading(true);
    setError("");
    setResult({});
    try {
      const symbols = selected.join(",");
      const res = await axios.get(`${API_BASE}/api/currency`, {
        params: { amount: amt, base, symbols },
      });
      if (res.data?.conversions) setResult(res.data.conversions);
      else setError("Unexpected server response.");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Conversion failed.");
    } finally {
      setLoading(false);
    }
  };

  const BASES = CURRENCIES.map((c) => c.code);

  return (
    <div onKeyDown={onKeyDownList}>
      {/* Top controls */}
      <div className="row" style={{ alignItems: "center", width: "100%" }}>
        <select
          className="select"
          aria-label="Base currency"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        >
          {BASES.map((b) => {
            const meta = CURRENCIES.find((c) => c.code === b);
            return (
              <option key={b} value={b}>
                {b} — {meta?.country || ""}
              </option>
            );
          })}
        </select>

        {/* Amount input with symbol prefix */}
        <div style={{ position: "relative" }}>
          <span
            aria-hidden
            style={{ position: "absolute", left: 10, top: 10, opacity: 0.7, fontSize: 13 }}
          >
            {symbolFor(base) || base}
          </span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            aria-label="Amount"
            placeholder="Enter amount"
            style={{ paddingLeft: 36, width: 180 }}
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setAmount("");
                return;
              }
              const num = Number(v);
              if (Number.isNaN(num) || num < 0) return;
              setAmount(v);
            }}
            onBlur={() => {
              if (amount === "") setAmount(0);
            }}
          />
        </div>

        <button className="btn" onClick={doConvert} disabled={loading || Number(amount) < 0}>
          {loading ? <span className="loader" /> : "Convert"}
        </button>
      </div>

      {/* Searchable multi-select combobox */}
      <div className="dropdown" style={{ marginBottom: 10 }}>
        <div
          className="input"
          style={{
            padding: "10px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          tabIndex={0}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((o) => !o);
            }
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          role="combobox"
          aria-label="Choose target currencies"
        >
          <span className="small">
            {selected.length ? `Targets: ${selected.join(", ")}` : "Choose target currencies"}
          </span>
          <span style={{ opacity: 0.75 }}>▾</span>
        </div>

        {open && (
          <div className="dropdown-panel" role="listbox">
            <input
              className="input"
              placeholder="Search code or country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />

            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <button className="btn" type="button" onClick={selectAll} style={{ padding: "6px 10px" }}>
                Select All
              </button>
              <button
                className="btn"
                type="button"
                onClick={clearAll}
                style={{ padding: "6px 10px", background: "linear-gradient(90deg, #ef4444, #f59e0b)" }}
              >
                Clear All
              </button>
            </div>

            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.map((c, idx) => {
                const isSel = selected.includes(c.code);
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={c.code}
                    className="dropdown-item"
                    aria-selected={isSel}
                    aria-current={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => toggle(c.code)}
                  >
                    <span style={{ fontSize: 18 }}>{c.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{c.code}</div>
                      <div className="small">{c.country}</div>
                    </div>
                    <input type="checkbox" readOnly checked={isSel} />
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="small" style={{ padding: 8 }}>No matches</div>}
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" type="button" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: "salmon", marginBottom: 8 }}>{error}</div>}

      {/* Results */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {Object.keys(result).length === 0 && !loading && (
          <div className="small">Pick targets and click Convert.</div>
        )}
        {Object.entries(result).map(([code, val]) => (
          <motion.div
            key={code}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            style={{
              minWidth: 160,
              padding: 12,
              borderRadius: 10,
              background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))",
              border: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: "rgba(255,255,255,.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {CURRENCIES.find((x) => x.code === code)?.flag || "💱"}
                </span>
              </div>
              <div>
                <div className="small" style={{ opacity: 0.9 }}>
                  {code} — {CURRENCIES.find((x) => x.code === code)?.country || ""}
                </div>
                <div className="convert-value">
                  <AnimatedNumber value={val} duration={800} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
