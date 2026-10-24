import { ScrollText } from "lucide-react";
import { OBJECTIVES } from "@/game/data";
import { formatNumber } from "@/game/economy";
import { currentObjective } from "@/game/progression";
import type { Game } from "@/hooks/useGame";

export function ObjectivePanel({ game }: { game: Game }) {
  const { state } = game;
  const obj = currentObjective(state);
  const [cur, target] = obj ? obj.progress(state) : [1, 1];
  const pct = Math.min(100, (cur / target) * 100);
  return (
    <section className="parchment rounded-md border-2 border-copper p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5" />
        <h2 className="text-sm font-bold uppercase">Current Commission</h2>
        <span className="ml-auto text-xs">{state.completedObjectives.length}/{OBJECTIVES.length}</span>
      </div>
      <p className="mt-2 font-display text-lg font-bold">{obj ? obj.title : "Brasshaven is restored!"}</p>
      {obj && (
        <>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-parchment-ink/20">
            <div className="h-full bg-copper transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs">{formatNumber(Math.min(cur, target))} / {formatNumber(target)} · Reward: 1 Steam Core</p>
        </>
      )}
    </section>
  );
}
