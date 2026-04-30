type HomeHeaderProps = {
  status: string;
};

export function HomeHeader({ status }: HomeHeaderProps) {
  return (
    <header className="space-y-2.5">
      <div className="space-y-1.5">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-white sm:text-[2.35rem]">Home</h1>
        <p className="max-w-3xl text-[15px] leading-7 text-white/74 sm:text-[17px]">
          What should you use next so you don’t lose value?
        </p>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-white/56">{status}</p>
    </header>
  );
}
