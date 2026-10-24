import { useState } from "react";
import { Cog, Coins, Gauge, Settings, Sparkles } from "lucide-react";
import { formatNumber } from "@/game/economy";
import type { Game } from "@/hooks/useGame";

export function ResourceBar({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { state, income } = game;

  return (
    <header className="panel flex flex-wrap items-center gap-4 px-5 py-3">
      <div className="flex items-center gap-2">
        <Cog className="h-8 w-8 text-brass animate-spin-slow" />
        <h1 className="text-2xl font-black text-brass-gradient">Brasshaven</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <Stat icon={<Coins className="h-4 w-4" />} label="Brass Coins" value={formatNumber(state.coins)} />
        <Stat icon={<Gauge className="h-4 w-4" />} label="Per second" value={`+${formatNumber(income)}`} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Steam Cores" value={formatNumber(state.steamCores)} />
        <div className="relative">
          <button aria-label="Settings" onClick={() => { setOpen(!open); setConfirm(false); }} className="btn-brass p-2">
            <Settings className="h-5 w-5" />
          </button>
          {open && (
            <div className="panel absolute right-0 top-12 z-30 w-64 p-4 text-sm">
              <p className="mb-1 font-display text-brass">Ledger Settings</p>
              <p className="mb-3 text-muted-foreground">Progress saves automatically to this browser.</p>
              {!confirm ? (
                <button onClick={() => setConfirm(true)} className="w-full rounded-md border border-destructive px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Reset city
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-foreground">Demolish all progress? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => { game.reset(); setOpen(false); }} className="flex-1 rounded-md bg-destructive px-3 py-2 text-destructive-foreground">Yes, reset</button>
                    <button onClick={() => setConfirm(false)} className="btn-brass flex-1 px-3 py-2">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-copper/60 bg-iron-deep/70 px-3 py-1.5">
      <span className="text-brass">{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-display text-lg font-bold tabular-nums text-amber">{value}</div>
      </div>
    </div>
  );
}
