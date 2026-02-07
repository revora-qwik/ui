import { useEffect, useState } from "react";
import WaitlistModal from "./waitlistModal";

type Leader = {
  name: string;
  points: number;
  referralCode: string;
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const STORAGE_KEY = "revora_waitlist_referral";

const rankStyle = (i: number) => {
  if (i === 0) return "bg-amber-300/90 scale-[1.06] shadow-[0_14px_0_#8a6a1f]";
  if (i === 1) return "bg-slate-300/80";
  if (i === 2) return "bg-orange-300/80";
  return "bg-white/20";
};

const eggByRank = (i: number) => {
  if (i === 0) return "/images/goldenEgg.png";
  if (i === 1) return "/images/silverEgg.png";
  if (i === 2) return "/images/bronzeEgg.png";
  return null;
};

const rankBadgeColor = (i: number) => {
  if (i < 10) return "bg-[#4f7f88]/70";
  return "bg-slate-400/50";
};

const myGlow = "ring-4 ring-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.9)]";

export default function LeaderboardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [startWithOtp, setStartWithOtp] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [checking, setChecking] = useState(false);

  const [myStats, setMyStats] = useState<{
    rank: number;
    points: number;
    referralCode: string;
    name: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState("");

  const myReferralCode =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

  async function handleCheckEmail() {
    if (!emailInput) return;

    try {
      setChecking(true);

      const res = await fetch(`${SERVER_URL}/waitlist/email/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await res.json();

      // already joined → just save referral
      if (data?.alreadyJoined) {
        localStorage.setItem(STORAGE_KEY, data.referralCode);

        // refresh leaderboard + compute rank
        const res2 = await fetch(`${SERVER_URL}/leaderboard`);
        const list = await res2.json();

        const index = list.findIndex(
          (u: any) => u.referralCode === data.referralCode,
        );

        if (index !== -1) {
          setMyStats({
            rank: index + 1,
            points: list[index].points,
            referralCode: data.referralCode,
            name: list[index].name,
          });
        }

        setLeaders(list); // update leaderboard instantly
        return;
      }

      // OTP sent → open waitlist directly in OTP screen
      if (data?.message === "OTP sent") {
        setPrefillEmail(emailInput);
        setStartWithOtp(true);
        setShowWaitlist(true);
        return;
      }

      if (!res.ok) throw new Error(data?.error || "Failed");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${SERVER_URL}/leaderboard`);
        const data = await res.json();

        setLeaders(data);

        // ⭐ ADD THIS BLOCK
        if (myReferralCode) {
          const index = data.findIndex(
            (u: any) => u.referralCode === myReferralCode,
          );

          if (index !== -1) {
            setMyStats({
              rank: index + 1,
              points: data[index].points,
              referralCode: myReferralCode,
              name: data[index].name,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="
          relative z-10
          w-[95%] max-w-2xl h-[80vh]
          bg-linear-to-b from-[#7faeb9] to-[#5f8f9b]
          rounded-3xl border-4 border-front
          shadow-[0_14px_0_#2b4c55]
          flex flex-col
          animate-jump-in
          origin-center
        "
      >
        <div className="py-6 text-center relative">
          <h2 className="font-luckiest-guy text-4xl sm:text-5xl text-back drop-outline tracking-wide">
            🏆 TOP FARMERS
          </h2>

          <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
            Ranked by referral points
          </p>

          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-linear-to-r from-transparent via-black/30 to-transparent" />
        </div>
        {myStats ? (
          <div className="px-6 mt-6">
            <div
              className={`
        flex items-center justify-between
        rounded-2xl px-6 py-4
        border-4 border-front
        ${rankStyle(myStats.rank - 1)}
        ${myGlow}
      `}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`
            w-12 h-12 flex items-center justify-center
            rounded-full border-4 border-front
            font-luckiest-guy text-back text-lg
            drop-outline shadow-[0_3px_0_#2b4c55]
            ${rankBadgeColor(myStats.rank - 1)}
          `}
                >
                  #{myStats.rank}
                </div>

                <div className="min-w-0">
                  <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider">
                    {myStats.name}
                    <span className="ml-2 px-2 py-1 text-xs font-black bg-amber-300 text-back rounded-full border-2 border-front">
                      YOU
                    </span>
                  </p>

                  <p className="text-back uppercase font-semibold text-xs drop-outline tracking-wider mt-1">
                    Ref:{" "}
                    <span className="font-black">{myStats.referralCode}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider">
                  {myStats.points}
                </p>
                <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider">
                  Points
                </p>
              </div>
            </div>
          </div>
        ) : !myReferralCode ? (
          <div className="flex justify-center mt-6 px-6 animate-jump-in">
            <div className="w-full 
              border-4 border-front
              active:shadow-[0_3px_0_#2b4c55] 
              active:translate-y-[2px]
              shadow-[0_6px_0_#2b2b2b] text-back rounded-2xl px-6 py-3 flex items-center gap-3">
              <input
                type="email"
                placeholder="Enter email to check rank…"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-transparent text-lg text-back uppercase placeholder:text-back/80 outline-none font-semibold drop-outline" 
              />

              <button
                onClick={handleCheckEmail}
                disabled={checking}
                className="bg-amber-300 text-back uppercase font-luckiest-guy text-lg px-6 py-1 rounded-full border-4 border-front drop-outline hover:bg-amber-400 hover:scale-110 active:translate-y-[2px] transition-all"
              >
                {checking ? "..." : "CHECK"}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-back uppercase font-semibold drop-outline">
              Loading...
            </p>
          </div>
        ) : (
          <div
            className="
              flex-1
              overflow-y-auto
              overflow-x-hidden
              scroll-smooth
              overscroll-contain
              px-6 py-4
              space-y-4

              [&::-webkit-scrollbar]:w-3
              [&::-webkit-scrollbar-track]:bg-[#2b4c55]
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-track]:border-2
              [&::-webkit-scrollbar-track]:border-[#1f3a41]

              [&::-webkit-scrollbar-thumb]:bg-amber-300
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:border-2
              [&::-webkit-scrollbar-thumb]:border-[#2b4c55]
              [&::-webkit-scrollbar-thumb:hover]:bg-amber-400
            "
          >
            {leaders.map((l, i) => {
              const egg = eggByRank(i);
              const isMe = false;

              return (
                <div
                  key={i}
                  className={`
                    flex items-center justify-between
                    rounded-2xl px-6 py-4
                    border-4 border-front
                    animate-jump-in
                    hover:scale-[1.01] transition-transform
                    ${rankStyle(i)}
                    
                  `}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {egg ? (
                      <div className="w-12 h-12 flex items-center justify-center">
                        <img
                          src={egg}
                          alt="egg"
                          className={`w-9 drop-shadow-lg ${i === 0 ? "animate-bounce" : ""
                            }`}
                        />
                      </div>
                    ) : (
                      <div
                        className={`
                          w-12 h-12
                          flex items-center justify-center
                          rounded-full
                          border-4 border-front
                          font-luckiest-guy
                          text-back
                          text-lg
                          drop-outline
                          shadow-[0_3px_0_#2b4c55]
                          ${rankBadgeColor(i)}
                        `}
                      >
                        #{i + 1}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
                        {l.name}
                      </p>

                      {isMe && (
                        <p className="text-back uppercase font-semibold text-xs drop-outline tracking-wider mt-1">
                          Ref:{" "}
                          <span className="font-black">{l.referralCode}</span>
                        </p>
                      )}

                      <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider">
                        Rank #{i + 1}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
                      {l.points}
                    </p>
                    <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
                      Points
                    </p>
                  </div>
                </div>
              );
            })}

            {leaders.length === 0 && (
              <p className="text-back text-center mt-10 uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
                No farmers yet… first egg awaits 🥚
              </p>
            )}
          </div>
        )}

        <div className="py-5 text-center relative">
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-r from-transparent via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="bg-amber-300 text-back uppercase font-luckiest-guy text-lg px-12 py-3 rounded-full border-4 border-front drop-outline hover:bg-amber-400 hover:scale-110 active:translate-y-[2px] transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
      <WaitlistModal
        open={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        prefillEmail={prefillEmail}
        startWithOtp={startWithOtp}
      />
    </div>
  );
}
