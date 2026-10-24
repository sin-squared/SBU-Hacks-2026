import { Lock, Unlock } from "lucide-react";
import { DISTRICTS } from "@/game/data";
import { formatNumber } from "@/game/economy";
import type { Game } from "@/hooks/useGame";

export function DistrictPanel({ game }: { game: Game }) {
  const { state } = game;
  return (
    <div className="space-y-3">
      {DISTRICTS.map((d) => {
        const unlocked = state.unlockedDistricts.includes(d.id);
        const pct = d.unlockAt === 0 ? 100 : Math.min(100, (state.lifetimeCoins / d.unlockAt) * 100);
        return (
          <article key={d.id} className={`rounded-md border-2 p-3 ${unlocked ? "border-brass bg-card" : "border-muted bg-iron-deep/60"}`}>
            <div className="flex items-center gap-2">
              {unlocked ? <Unlock className="h-5 w-5 text-brass" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              <h3 className="font-bold text-brass">{d.name}</h3>
              <span className="ml-auto text-xs uppercase tracking-widest text-muted-foreground">{unlocked ? "Unlocked" : "Locked"}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/80">{d.description}</p>
            {!unlocked && (
              <>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-iron-deep">
                  <div className="h-full bg-brass transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(state.lifetimeCoins)} / {formatNumber(d.unlockAt)} lifetime coins
                </p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
