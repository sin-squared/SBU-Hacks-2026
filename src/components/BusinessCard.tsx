import { useState } from "react";
import { Lock } from "lucide-react";
import { DISTRICTS } from "@/game/data";
import { businessCost, businessIncome, businessMultiplier, canBuyBusiness, formatNumber } from "@/game/economy";
import type { Business } from "@/game/types";
import type { Game } from "@/hooks/useGame";

export function BusinessCard({ business, game }: { business: Business; game: Game }) {
  const { state } = game;
  const [flash, setFlash] = useState(0);
  const owned = state.owned[business.id];
  const unlocked = state.unlockedDistricts.includes(business.district);
  const cost = businessCost(business.baseCost, owned);
  const affordable = canBuyBusiness(state, business.id);
  const district = DISTRICTS.find((d) => d.id === business.district)!;
  const perUnit = business.baseIncome * businessMultiplier(state, business.id);

  const status = !unlocked ? "Locked" : owned > 0 ? "Owned" : "Available";

  return (
    <article
      key={flash}
      className={`rounded-md border-2 p-3 transition-colors ${flash ? "animate-pop" : ""} ${
        !unlocked ? "border-muted bg-iron-deep/60 opacity-60" : owned > 0 ? "border-brass bg-card glow" : "border-copper/70 bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-brass">{business.name}</h3>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{district.name} · {status}</p>
        </div>
        <span className="rounded border border-copper px-2 py-0.5 font-display text-sm tabular-nums">×{owned}</span>
      </div>
      <p className="mt-1 text-sm text-foreground/80">{business.description}</p>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span>+{formatNumber(perUnit)}/s each</span>
        <span className="text-amber">Total {formatNumber(businessIncome(state, business.id))}/s</span>
      </div>
      <button
        disabled={!affordable}
        onClick={() => { game.buyBusiness(business.id); setFlash((f) => f + 1); }}
        className="btn-brass mt-2 flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm"
      >
        {!unlocked ? (<><Lock className="h-4 w-4" /> Unlocks at {formatNumber(district.unlockAt)} lifetime</>) : <>Buy · {formatNumber(cost)} coins</>}
      </button>
    </article>
  );
}
