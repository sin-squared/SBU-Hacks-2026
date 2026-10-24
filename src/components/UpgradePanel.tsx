import { Check, Wrench } from "lucide-react";
import { UPGRADES } from "@/game/data";
import { canBuyUpgrade, formatNumber, getBusiness } from "@/game/economy";
import type { Game } from "@/hooks/useGame";

export function UpgradePanel({ game }: { game: Game }) {
  const { state } = game;
  return (
    <div className="space-y-3">
      {UPGRADES.map((u) => {
        const bought = state.upgrades.includes(u.id);
        const met = u.requires(state);
        const effect = u.effect.kind === "global"
          ? `All income ×${u.effect.multiplier}`
          : `${getBusiness(u.effect.target).name} income ×${u.effect.multiplier}`;
        return (
          <article key={u.id} className={`flex items-center gap-3 rounded-md border-2 p-3 ${bought ? "border-brass bg-card glow" : met ? "border-copper/70 bg-card" : "border-muted bg-iron-deep/60 opacity-70"}`}>
            <Wrench className="h-6 w-6 shrink-0 text-brass" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-brass">{u.name}</h3>
              <p className="text-sm text-foreground/80">{u.description}</p>
              <p className="text-xs text-amber">{effect}{!met && !bought ? ` · Requires: ${u.requirementText}` : ""}</p>
            </div>
            {bought ? (
              <span className="flex items-center gap-1 font-display text-sm text-brass"><Check className="h-4 w-4" /> Installed</span>
            ) : (
              <button disabled={!canBuyUpgrade(state, u)} onClick={() => game.buyUpgrade(u.id)} className="btn-brass shrink-0 px-3 py-1.5 text-sm">
                {formatNumber(u.cost)} coins
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
