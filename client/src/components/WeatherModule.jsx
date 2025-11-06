import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const countryFlag = (cc = "") =>
  (!cc ? "🏳️" : cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt())));

const wmoIcon = (code) => {
  if (code == null) return "🌈";
  if ([0].includes(code)) return "☀️";
  if ([1,2,3].includes(code)) return "⛅";
  if ([45,48].includes(code)) return "🌫️";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "🌧️";
  if ([71,73,75,77,85,86].includes(code)) return "❄️";
  if ([95,96,99].includes(code)) return "⛈️";
  return "🌤️";
};

export default function WeatherModule() {
  const [city, setCity] = useState("London");
  const [data, setData] = useState(null); // { location, current, today }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchToday = async (e) => {
    if (e) e.preventDefault();
    setLoading(true); setError(""); setData(null);
    try {
      const res = await axios.get(`${API_BASE}/api/weather_today`, { params: { city } });
      setData(res.data);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Could not fetch today weather.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={fetchToday} className="row">
        <input
          className="input"
          value={city}
          onChange={(e)=>setCity(e.target.value)}
          placeholder="Enter city (e.g., Mumbai)"
          aria-label="City"
        />
        <button className="btn" type="submit" aria-label="Get today weather">
          {loading ? <span className="loader" /> : "Get Today Weather"}
        </button>
      </form>

      {error && <p style={{ color: "salmon" }}>{error}</p>}

      {data && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ type:"spring", stiffness:120, damping:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className="flag" title={data.location.countryCode}>{countryFlag(data.location.countryCode)}</span>
            <strong style={{ fontSize:18 }}>{data.location.city}</strong>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>{wmoIcon(data.current.wmo)}</span>
              <span className="small">{data.current.condition}</span>
            </div>
          </div>

          <div className="small" style={{ marginTop:6 }}>
            Now: <strong>{data.current.tempC}°C</strong> • Feels like {data.current.feels_like}°C • Humidity {data.current.humidity}%
          </div>

          <div className="small" style={{ marginTop:6 }}>
            Today: Low {data.today.tmin}°C / High <strong>{data.today.tmax}°C</strong>{typeof data.today.pop === "number" ? ` • Rain chance ${data.today.pop}%` : ""}
          </div>
        </motion.div>
      )}

      {!data && !loading && !error && <p className="small">Type a city and press “Get Today Weather”.</p>}
    </div>
  );
}
