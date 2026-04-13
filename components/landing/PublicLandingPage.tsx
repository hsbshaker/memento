"use client";

import type { CSSProperties } from "react";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingNavigation } from "@/components/landing/LandingNavigation";

export function PublicLandingPage() {
  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground dark"
      style={
        {
          "--background": "#0D0D11",
          "--foreground": "#ffffff",
        } as CSSProperties
      }
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
        <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-6 py-6 md:px-12">
        <LandingNavigation />
        <main className="flex-1">
          <HeroSection />
          <HowItWorksSection />
          <FinalCtaSection />
        </main>
      </div>
    </div>
  );
}
