export function makeReferralCode(name: string, email: string) {
  const n = name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  const e = email.split("@")[0].slice(0, 3).toUpperCase();
  const r = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${n}${e}${r}`;
}
