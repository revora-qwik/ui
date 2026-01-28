import { useState } from "react";
import WaitlistModal from "./waitlistModal";

export default function () {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <section className="relative min-h-screen overflow-hidden bg-background-primary">
      {/* Background */}
      <img
        className="absolute inset-0 w-full h-full object-cover object-bottom z-0"
        src="/images/chicken-bg-hero.png"
        alt="chicken background for hero banner"
      />

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-14 py-5 sm:py-7">
        <div className="flex items-center gap-4">
          <img
            src="/images/icon.png"
            alt="FarmFi logo"
            className="h-13 sm:h-14 md:h-16 w-auto"
          />
          <div className="flex flex-col leading-none">
            <span className="uppercase font-luckiest-guy text-back text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide drop-outline">
              REVORA
            </span>
            <span className="uppercase font-luckiest-guy text-back text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide drop-outline">
              Real-World Revshare
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button className="bg-amber-300 text-back uppercase font-luckiest-guy text-base sm:text-lg md:text-xl px-5 sm:px-6 py-2 rounded-full border-2 sm:border-3 md:border-4 border-front drop-outline hover:bg-amber-400 hover:scale-105 active:bg-amber-500 transition-all duration-200">
            LOGIN
          </button>

          <button className="p-4 sm:p-5 rounded-full hover:scale-110 hover:bg-white/10 transition-all duration-200">
            <img
              src="/images/setting.png"
              alt="Settings"
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11"
            />
          </button>
        </div>
      </header>

      {/* Hero content */}
      <div className="relative z-20 flex items-center justify-center min-h-[calc(100vh-96px)] px-4 -mt-8 sm:-mt-12 md:-mt-32">
        <div className="relative flex flex-col items-center gap-6">
          {/* Mascot */}
          <img
            src="/images/chicken-only.png"
            alt="FarmFi chicken mascot"
            className="absolute -top-28 sm:-top-32 md:-top-36 left-1/2 -translate-x-1/2 w-40 sm:w-48 md:w-56 z-10 animate-jump-in animate-chicken-bob scale-150"
          />

          {/* Badge */}
          <div
            onClick={() => setWaitlistOpen(true)}
            className="relative z-20 px-10 sm:px-14 md:px-20 py-6 sm:py-7 md:py-8 rounded-full bg-amber-300 hover:scale-105 
              border-4 border-front 
               active:shadow-[0_3px_0_#2b4c55]
              drop-outline active:translate-y-[2px]
              shadow-[0_6px_0_#2b2b2b] cursor-pointer"
          >
            <span className="uppercase font-luckiest-guy text-back text-base sm:text-[3rem] md:text-[4rem] lg:text-[5rem] leading-none tracking-wide drop-outline">
              JOIN WAITLIST
            </span>
          </div>
        </div>
      </div>
      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </section>
  );
}
