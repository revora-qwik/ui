import { useState } from "react";

export default function WaitlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!email) return;

    setLoading(true);

    
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

     
      <div className="relative z-10 w-[90%] max-w-md bg-linear-to-b from-[#7faeb9] to-[#5f8f9b] rounded-3xl border-4 border-front shadow-[0_12px_0_#2b4c55] px-6 sm:px-8 py-8 text-center animate-jump-in">

        
        <img
          src="/images/chicken-idle.png"
          alt="Happy chicken"
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-28 sm:w-32 animate-chicken-bob"
        />

        {!submitted ? (
          <>
            <h2 className="mt-10 font-luckiest-guy text-2xl sm:text-3xl text-back drop-outline">
              JOIN THE WAITLIST
            </h2>

            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Be first to join future farms 🌾
            </p>

            <input
              type="email"
              placeholder="you@farmmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-5 w-full px-4 py-3 rounded-xl border-4 border-front text-back font-semibold focus:outline-none"
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="
                mt-4 w-full
                bg-amber-300 text-back uppercase font-luckiest-guy
                text-lg
                px-6 py-3
                rounded-full
                border-4 border-front
                drop-outline
                shadow-[0_6px_0_#2b4c55]
                hover:bg-amber-400 hover:scale-105
                active:translate-y-[2px] active:shadow-[0_3px_0_#2b4c55]
                transition-all duration-200
                disabled:opacity-60
              "
            >
              {loading ? "ADDING..." : "🥚 JOIN WAITLIST"}
            </button>

            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider pt-4">
              No spam. Just farm alpha 🐔
            </p>
          </>
        ) : (
          <>
            
            <h2 className="text-back py-6 uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              🎉 YAAAY!
            </h2>

            <p className="text-back pb-12 uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              You are officially on the Real-World REVSHARE waitlist 🐓
            </p>

            <p className="text-back  uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Tell your friends and grow the farm together 🌱
            </p>

            <button
              onClick={onClose}
              className="
                mt-6
                bg-amber-300 text-back uppercase font-luckiest-guy
                text-lg
                px-8 py-3
                rounded-full
                border-4 border-front
                drop-outline
                hover:bg-amber-400 hover:scale-105
                transition-all
              "
            >
              DONE
            </button>
          </>
        )}
      </div>
    </div>
  );
}
