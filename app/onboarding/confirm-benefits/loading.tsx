"use client";

import { useEffect, useState } from "react";

const PHRASES = ["Scanning your cards", "Finding your benefits", "Almost ready"];
const PHRASE_INTERVAL = 2183;
const PHRASE_TRANSITION = 220;
const LAST_PHRASE_LINGER = 783;
const FADE_OUT_DELAY = (PHRASES.length - 1) * (PHRASE_INTERVAL + PHRASE_TRANSITION) + LAST_PHRASE_LINGER;

function item(visible: boolean, delay: number) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
  };
}

export default function ConfirmBenefitsLoading() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const fadeOut = setTimeout(() => setFadingOut(true), FADE_OUT_DELAY);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeOut);
    };
  }, []);

  useEffect(() => {
    if (phraseIndex >= PHRASES.length - 1) return;
    const cycle = setTimeout(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIndex((i) => i + 1);
        setPhraseVisible(true);
      }, PHRASE_TRANSITION);
    }, PHRASE_INTERVAL);
    return () => clearTimeout(cycle);
  }, [phraseIndex]);

  return (
    <>
      <style>{`
        @keyframes magneticScan {
          0%   { left: -5rem; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: calc(100% + 5rem); opacity: 0; }
        }
        @keyframes scanGlow {
          0%   { left: -5rem; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: calc(100% + 5rem); opacity: 0; }
        }
      `}</style>

      <div
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0D0D11]"
        style={{
          opacity: !visible || fadingOut ? 0 : 1,
          transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)] blur-3xl" />
          <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)] blur-3xl" />
          <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-12">
          {/* Logo — enters first */}
          <div
            className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white"
            style={item(visible, 0)}
          >
            <div className="h-8 w-8 animate-pulse rounded-full bg-gradient-to-tr from-[#4A9EFF] to-[#C8A94B]/80" />
            Memento
          </div>

          {/* Credit card — enters 150ms after logo */}
          <div style={{ ...item(visible, 150), width: 300, height: 189 }}>
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_60px_-10px_rgba(74,158,255,0.15)]">
              {/* Card body */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1C2A42] to-[#0D1520]" />

              {/* Subtle top-right glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(74,158,255,0.12),transparent_65%)]" />

              {/* Magnetic strip — ISO 7811: ~4mm from top, ~7.62mm tall → 14px / 27px at 3.50px/mm */}
              <div
                className="absolute left-0 right-0 overflow-hidden"
                style={{ top: 22, height: 27 }}
              >
                {/* Strip body */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#080808] to-[#0f0f0f]" />

                {/* Subtle strip texture lines */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
                  }}
                />

                {/* Scan line */}
                <div
                  className="absolute inset-y-0 w-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(74,158,255,0.15) 20%, rgba(147,210,255,0.7) 45%, rgba(255,255,255,0.85) 50%, rgba(147,210,255,0.7) 55%, rgba(74,158,255,0.15) 80%, transparent 100%)",
                    animation: "magneticScan 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />

                {/* Glow bloom that follows scan line */}
                <div
                  className="absolute w-24 blur-md"
                  style={{
                    insetBlock: "-6px",
                    background:
                      "linear-gradient(90deg, transparent, rgba(74,158,255,0.25), transparent)",
                    animation: "scanGlow 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </div>

              {/* Signature panel */}
              <div
                className="absolute left-4 right-16 overflow-hidden rounded-sm"
                style={{
                  top: 72,
                  height: 24,
                  background:
                    "repeating-linear-gradient(90deg, #ede8dd 0px, #e4dfd4 3px, #ede8dd 6px)",
                }}
              />

              {/* CVV box next to signature */}
              <div
                className="absolute right-4 flex items-center justify-center rounded-sm border border-white/10 bg-white/5"
                style={{ top: 72, width: 40, height: 24 }}
              >
                <div className="h-1.5 w-5 rounded-full bg-white/15" />
              </div>

              {/* Bottom row — placeholder text lines */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="space-y-1.5">
                  <div className="h-1 w-20 rounded-full bg-white/10" />
                  <div className="h-1 w-28 rounded-full bg-white/8" />
                </div>
                {/* Network logo placeholder */}
                <div className="flex gap-[-4px]">
                  <div className="h-6 w-6 rounded-full bg-white/10" />
                  <div className="-ml-2 h-6 w-6 rounded-full bg-white/6" />
                </div>
              </div>
            </div>
          </div>

          {/* Cycling text — enters 300ms after logo */}
          <div className="h-6" style={item(visible, 300)}>
            <p
              className="text-base font-medium uppercase tracking-widest text-white/25"
              style={{
                opacity: phraseVisible ? 1 : 0,
                transform: phraseVisible ? "translateY(0)" : "translateY(-4px)",
                transition: `opacity ${PHRASE_TRANSITION}ms ease, transform ${PHRASE_TRANSITION}ms ease`,
              }}
            >
              {PHRASES[phraseIndex]}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
