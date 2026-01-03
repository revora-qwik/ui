export default function () {
  return (
    <section className="relative min-h-screen overflow-hidden bg-background-primary">

      
      <img
        className="absolute inset-0 w-full h-full object-cover object-bottom z-0"
        src="/images/chicken-bg-hero.png"
        alt="chicken background for hero banner"
      />

      
      
<div className="absolute inset-0 z-5 pointer-events-none">

  {/* Left standing chicken (near coop) */}
  <img
    src="/images/chicken-walk.png"
    className="
      absolute
      bottom-28 sm:bottom-32
      left-32 sm:left-40
      w-28 sm:w-32
      max-w-none
      animate-chicken-breathe
    "
    alt=""
  />

  {/* Right standing chicken (near barn) */}
  <img
    src="/images/chicken-idle.png"
    className="
      absolute
      bottom-28 sm:bottom-32
      right-32 sm:right-40
      w-28 sm:w-32
      max-w-none
      animate-chicken-tilt
    "
    alt=""
  />

  {/* Sitting chicken (mid-ground anchor) */}
  <img
    src="/images/chicken-sit.png"
    className="
      absolute
      bottom-22 sm:bottom-26
      right-1/3
      w-24 sm:w-28
      max-w-none
      animate-chicken-blink
    "
    alt=""
  />

</div>




      
      
      <header
        className="relative z-30 flex items-center justify-between
        px-4 sm:px-6 md:px-10 lg:px-14
        py-5 sm:py-7"
      >
        
        <div className="flex items-center gap-4">
          <img
            src="/images/icon.png"
            alt="FarmFi logo"
            className="h-13 sm:h-14 md:h-16 w-auto"
          />

          <div className="flex flex-col leading-none">
            <span className="uppercase font-luckiest-guy text-back text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide drop-outline">
              Real-World
            </span>
            <span className="uppercase font-luckiest-guy text-back text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide drop-outline">
              Revshare
            </span>
          </div>
        </div>

        
        <div className="flex items-center gap-4 sm:gap-6">
          <button className="
            bg-amber-300 text-back uppercase font-luckiest-guy
            text-base sm:text-lg md:text-xl
            px-5 sm:px-6 py-2
            rounded-full
            border-2 sm:border-3 md:border-4 border-front
            drop-outline
            hover:bg-amber-400 hover:scale-105
            active:bg-amber-500
            transition-all duration-200
          ">
            LOGIN
          </button>

          <button className="
            p-4 sm:p-5 rounded-full
            hover:scale-110 hover:bg-white/10
            transition-all duration-200
          ">
            <img
              src="/images/setting.png"
              alt="Settings"
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11"
            />
          </button>
        </div>
      </header>

      
      <div
        className="
          relative z-20 flex items-center justify-center
          min-h-[calc(100vh-96px)]
          px-4 
          -mt-8 sm:-mt-12 md:-mt-16
          
        "
      >
        <div className="relative">

          
          <img
            src="/images/chicken-only.png"
            alt="FarmFi chicken mascot"
            className="
              absolute
              -top-28 sm:-top-32 md:-top-36
              left-1/2 -translate-x-1/2
              w-40 sm:w-48 md:w-56
              z-10
              animate-jump-in animate-chicken-bob
            "
          />

          
          <div
            className="
              relative z-20
              px-10 sm:px-14 md:px-20
              py-6 sm:py-7 md:py-8
              rounded-3xl
              bg-gradient-to-b from-[#7faeb9] to-[#5f8f9b]
              border-4 border-front
              shadow-[0_10px_0_#2b4c55]
            "
          >
            <span
              className="
                uppercase font-luckiest-guy text-back
                text-base sm:text-lg md:text-xl lg:text-2xl
                leading-none tracking-wide
                drop-outline
              "
            >
              Real-World Revshare
            </span>
          </div>

        </div>
      </div>

    </section>
  );
}
