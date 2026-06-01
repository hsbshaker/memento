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
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background"
        style={{
          opacity: !visible || fadingOut ? 0 : 1,
          transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="relative z-10 flex flex-col items-center gap-12">
          {/* Logo — enters first */}
          <div
            className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground"
            style={item(visible, 0)}
          >
            <div className="h-8 w-8 animate-pulse rounded-full bg-accent" />
            Memento
          </div>

          {/* Credit card — enters 150ms after logo */}
          <div style={{ ...item(visible, 150), width: 300, height: 189 }}>
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
              {/* Magnetic strip */}
              <div
                className="absolute left-0 right-0 overflow-hidden bg-surface-subtle"
                style={{ top: 22, height: 27 }}
              >
                {/* Scan line */}
                <div
                  className="absolute inset-y-0 w-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, var(--active) 35%, var(--border-strong) 50%, var(--active) 65%, transparent 100%)",
                    animation: "magneticScan 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </div>

              {/* Signature panel */}
              <div
                className="absolute left-4 right-16 overflow-hidden rounded-sm bg-surface-muted"
                style={{ top: 72, height: 24 }}
              />

              {/* CVV box next to signature */}
              <div
                className="absolute right-4 flex items-center justify-center rounded-sm border border-border bg-surface-muted"
                style={{ top: 72, width: 40, height: 24 }}
              >
                <div className="h-1.5 w-5 rounded-full bg-border-strong" />
              </div>

              {/* Bottom row — placeholder text lines */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="space-y-1.5">
                  <div className="h-1 w-20 rounded-full bg-surface-muted" />
                  <div className="h-1 w-28 rounded-full bg-surface-muted" />
                </div>
                {/* Network logo placeholder */}
                <div className="flex gap-[-4px]">
                  <div className="h-6 w-6 rounded-full bg-surface-muted" />
                  <div className="-ml-2 h-6 w-6 rounded-full bg-surface-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Cycling text — enters 300ms after logo */}
          <div className="h-6" style={item(visible, 300)}>
            <p
              className="text-base font-medium uppercase tracking-widest text-muted-foreground"
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
