// Shared decorative blob layer used on landing and onboarding surfaces.
// Do not add to authenticated app pages. Remove from onboarding in WO7.
export function PageBackgroundBlobs() {
  return (
    <>
      <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)] blur-3xl" />
      <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)] blur-3xl" />
    </>
  );
}
