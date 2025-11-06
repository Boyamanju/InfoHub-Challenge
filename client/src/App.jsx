import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WeatherModule from "./components/WeatherModule.jsx";
import CurrencyConverter from "./components/CurrencyConverter.jsx";
import QuoteGenerator from "./components/QuoteGenerator.jsx";

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: i => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 16, delay: i * 0.08 }
  })
};

export default function App(){
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.key === "1") {
        document.querySelector('#weather input')?.focus();
      } else if (e.altKey && e.key === "2") {
        document.querySelector('#currency input[type="number"]')?.focus();
      } else if (e.altKey && e.key === "3") {
        // focus the first button in quotes card
        document.querySelector('#quotes button')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden />
          <div>
            <h1 className="title">InfoHub</h1>
            <p className="subtitle">Weather • Currency • Quotes </p>
          </div>
        </div>
        <span className="small">React • Express • Framer Motion</span>
      </header>

      <section className="modules-grid">
        <AnimatePresence>
          <motion.div
            id="weather"
            className="module"
            custom={0}
            initial="hidden" animate="show" exit="hidden"
            variants={cardVariants}
            whileHover={{ y: -6 }} whileTap={{ scale: .995 }}
            aria-label="Weather card"
          >
            <div className="module-head">
              <div className="module-title"><span className="badge">🌤 Weather</span></div>
              <span className="small">Live forecast</span>
            </div>
            <div className="module-body"><WeatherModule /></div>
          </motion.div>

          <motion.div
            id="currency"
            className="module"
            custom={1}
            initial="hidden" animate="show" exit="hidden"
            variants={cardVariants}
            whileHover={{ y: -6 }} whileTap={{ scale: .995 }}
            aria-label="Currency card"
          >
            <div className="module-head">
              <div className="module-title"><span className="badge">💱 Currency</span></div>
              <span className="small">Multi-target </span>
            </div>
            <div className="module-body"><CurrencyConverter /></div>
          </motion.div>

          <motion.div
            id="quotes"
            className="module"
            custom={2}
            initial="hidden" animate="show" exit="hidden"
            variants={cardVariants}
            whileHover={{ y: -6 }} whileTap={{ scale: .995 }}
            aria-label="Quotes card"
          >
            <div className="module-head">
              <div className="module-title"><span className="badge">💬 Quotes</span></div>
              <span className="small">Motivation on tap</span>
            </div>
            <div className="module-body"><QuoteGenerator /></div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
