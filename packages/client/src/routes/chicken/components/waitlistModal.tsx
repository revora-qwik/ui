import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const STORAGE_KEY = "revora_waitlist_referral";

export default function WaitlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // read referral from URL
  const params = new URLSearchParams(window.location.search);
  const urlReferral = params.get("ref") ?? "";

  // allow manual override
  const [manualReferralCode, setManualReferralCode] =
    useState<string>(urlReferral);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ✅ CHECK LOCAL STORAGE WHEN MODAL OPENS
  useEffect(() => {
    if (!open) return;

    const storedCode = localStorage.getItem(STORAGE_KEY);
    if (storedCode) {
      setMyReferralCode(storedCode);
      setSubmitted(true);
    }
  }, [open]);

  if (!open) return null;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async () => {
    if (loading || submitted) return;

    if (!name || !email || !email.includes("@")) {
      alert("Please enter a valid name and email");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${SERVER_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          referralCode: manualReferralCode || undefined,
        }),
      });

      const data = await res.json();

      setMyReferralCode(data.referralCode);
      setSubmitted(true);

      // ✅ SAVE LOCALLY (PREVENT RE-SUBMIT)
      localStorage.setItem(STORAGE_KEY, data.referralCode);

      // clean URL so refresh doesn't reopen modal
      window.history.replaceState({}, "", "/chicken");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const referralLink = myReferralCode
    ? `${window.location.origin}/chicken?ref=${myReferralCode}`
    : "";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative z-10 w-[90%] max-w-md bg-linear-to-b from-[#7faeb9] to-[#5f8f9b] rounded-3xl border-4 border-front shadow-[0_12px_0_#2b4c55] px-6 sm:px-8 py-8 text-center animate-jump-in">
        <img
          src="/images/chicken-idle.png"
          alt="Happy chicken"
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-28 sm:w-32 animate-chicken-bob hover:scale-105 transition"
        />

        {!submitted ? (
          <>
            <h2 className="mt-10 font-luckiest-guy text-2xl sm:text-3xl text-back drop-outline">
              JOIN THE WAITLIST
            </h2>

            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-5 w-full px-4 py-3 rounded-xl border-4 border-front outline-none focus:scale-[1.02] focus:border-amber-300 transition"
            />

            <input
              type="email"
              placeholder="you@farmmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-4 w-full px-4 py-3 rounded-xl border-4 border-front outline-none focus:scale-[1.02] focus:border-amber-300 transition"
            />

            <input
              placeholder="Referral code (optional)"
              value={manualReferralCode}
              onChange={(e) => setManualReferralCode(e.target.value)}
              className="mt-3 w-full px-4 py-3 rounded-xl border-4 border-front outline-none focus:scale-[1.02] focus:border-amber-300 transition"
            />

            <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider mt-1">
              Earn rewards when friends join using your code
            </p>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 w-full bg-amber-300 font-luckiest-guy text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider px-6 py-3 rounded-full border-4 border-front disabled:opacity-60 hover:scale-105 transition"
            >
              {loading ? "🐔 HATCHING..." : "🥚 JOIN WAITLIST"}
            </button>
          </>
        ) : (
          <>
          <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider mb-8">
              You’re already on the waitlist 🐓
            </p>

            <div className="space-y-4">
              {/* REFERRAL CODE */}
              <div className="bg-white/20 rounded-xl px-4 py-3 border-2 border-front">
                <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider mb-1">Your referral code</p>
                <div className="flex items-center justify-between">
                  <span className="font-luckiest-guy tracking-wider text-back uppercase font-semibold text-xl drop-outline">
                    {myReferralCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(myReferralCode!)}
                    className="bg-amber-300 px-1 py-1 rounded-lg border-2 border-front text-sm font-bold hover:scale-105 transition"
                  >

                  <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* REFERRAL LINK */}
              <div className="bg-white/20 rounded-xl px-4 py-3 border-2 border-front">
              <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider mb-1">
                  Share link with friends
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-front font-semibold truncate bg-back/20 px-2 py-2 rounded-lg border border-front">
                    {referralLink}
                  </span>
                  <button
                    onClick={() => copyToClipboard(referralLink)}
                    className="bg-amber-300 px-1 py-1 rounded-lg border-2 border-front font-bold hover:scale-105 transition"
                  >
                  <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {copied && (

              <p className="text-back uppercase font-semibold text-sm drop-outline tracking-wider mb-1">
                  ✅ Copied to clipboard
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-6 bg-amber-300 text-back uppercase font-luckiest-guy text-lg px-8 py-3 rounded-full border-4 border-front hover:scale-110 transition  drop-outline"
            >
              DONE
            </button>
          </>
        )}
      </div>
    </div>
  );
}
