import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/labels";
import { Role } from "@prisma/client";

/**
 * Decorative "signal" motif for the marketing panel — a larger reprise of
 * the LoopMark idea already used for the brand icon (scattered dots =
 * scattered feedback, a threading arc = the loop being closed), rendered
 * as concentric orbit rings so it reads as an instrument rather than a
 * logo at this size. Purely decorative: aria-hidden, no data.
 */
function OrbitArt() {
  return (
    <svg
      viewBox="0 0 520 520"
      className="absolute -right-24 -top-16 h-[520px] w-[520px] opacity-90"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="260" cy="260" r="230" stroke="url(#ring1)" strokeWidth="1" />
      <circle cx="260" cy="260" r="170" stroke="url(#ring2)" strokeWidth="1" />
      <circle cx="260" cy="260" r="110" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <path
        d="M120 210a150 150 0 1 0 250 108"
        stroke="url(#thread)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="120" cy="210" r="5" fill="#4C7DFF" className="animate-pulse-slow" />
      <circle cx="370" cy="318" r="4" fill="#8B5CF6" className="animate-pulse-slow" />
      <circle cx="336" cy="120" r="3.5" fill="#2DD4BF" opacity="0.8" />
      <circle cx="410" cy="230" r="2.5" fill="#F3F5FA" opacity="0.5" />
      <circle cx="150" cy="360" r="3" fill="#F3F5FA" opacity="0.4" />
      <defs>
        <linearGradient id="ring1" x1="0" y1="0" x2="520" y2="520">
          <stop offset="0%" stopColor="rgba(76,125,255,0.35)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.05)" />
        </linearGradient>
        <linearGradient id="ring2" x1="520" y1="0" x2="0" y2="520">
          <stop offset="0%" stopColor="rgba(45,212,191,0.25)" />
          <stop offset="100%" stopColor="rgba(76,125,255,0.05)" />
        </linearGradient>
        <linearGradient id="thread" x1="120" y1="210" x2="370" y2="318">
          <stop offset="0%" stopColor="#4C7DFF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SignalCard() {
  const bars = [40, 65, 50, 80, 95, 70];
  return (
    <div className="glass absolute bottom-28 right-6 w-52 animate-float rounded-2xl p-4 shadow-card-lg sm:right-10">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-3">Sentiment signal</p>
      <div className="mt-3 flex h-14 items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-full rounded-sm bg-gradient-to-t from-primary to-primary-2"
            style={{ height: `${h}%`, opacity: 0.5 + (i / bars.length) * 0.5 }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold text-fg">78%</span>
        <span className="text-xs font-medium text-positive">positive</span>
      </div>
      <p className="text-xs text-fg-3">↑ 6% vs last week</p>
    </div>
  );
}

const FEATURE_BULLETS = [
  { text: "SSO keeps timing out for our team.", tone: "negative" as const },
  { text: "Support fixed our billing bug in minutes.", tone: "positive" as const },
  { text: "Would love a dark mode option.", tone: "neutral" as const },
];

const roleDotColor: Record<Role, string> = {
  ADMIN: "bg-primary",
  ANALYST: "bg-accent",
  VIEWER: "bg-fg-3",
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/inbox");
  }

  return (
    <div className="flex min-h-screen">
      {/* Marketing panel — desktop only. The real page content (login /
          signup) never depends on anything rendered here. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-base-2 p-10 text-fg xl:flex">
        <OrbitArt />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <LoopMark className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">LOOP</span>
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <span className="label-pill border border-primary/30 bg-primary-50 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI-native feedback intelligence
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.15] tracking-tight text-fg">
            Turn scattered feedback into your next
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {" "}
              evidence-backed decision.
            </span>
          </h1>

          <p className="mt-4 text-base leading-relaxed text-fg-2">
            LOOP pulls signal from support tickets, reviews, surveys, and sales calls — then tells
            your team exactly what to fix first.
          </p>

          <ul className="mt-7 space-y-3">
            {FEATURE_BULLETS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-fg-2">
                <span
                  className={
                    "mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full " +
                    (item.tone === "negative"
                      ? "bg-negative"
                      : item.tone === "positive"
                        ? "bg-positive"
                        : "bg-accent")
                  }
                />
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <SignalCard />

        <div className="relative z-10 flex items-center gap-5">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <div key={role} className="flex items-center gap-1.5" title={ROLE_DESCRIPTIONS[role]}>
              <span className={`h-1.5 w-1.5 rounded-full ${roleDotColor[role]}`} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-3">
                {ROLE_LABELS[role]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 xl:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2.5 xl:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <LoopMark className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-fg">LOOP</span>
          </div>

          <div className="glass animate-fade-in-up rounded-2xl p-8 shadow-card-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LoopMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <circle cx="9" cy="11" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="22" cy="9" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="20" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="11" cy="23" r="1.5" fill="currentColor" opacity="0.4" />
      <path
        d="M9 11a9 9 0 1 0 15 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
