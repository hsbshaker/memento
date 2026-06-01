// Restrained ambient accent glow for the landing page only.
// Do not add to authenticated app or onboarding pages.
export function PageBackgroundBlobs() {
  return (
    <>
      <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,var(--accent-muted)_0%,transparent_65%)] blur-3xl" />
      <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,var(--accent-muted)_0%,transparent_65%)] blur-3xl" />
    </>
  );
}
