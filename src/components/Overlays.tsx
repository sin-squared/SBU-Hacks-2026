import { Cog, Trophy } from "lucide-react";
import { formatNumber } from "@/game/economy";
import type { District } from "@/game/types";

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-iron-deep/80 p-4 animate-in fade-in">
      <div className="panel max-w-md p-6 text-center animate-in zoom-in-90">{children}</div>
    </div>
  );
}

export function VictoryModal({ cores, onClose }: { cores: number; onClose: () => void }) {
  return (
    <Modal>
      <Trophy className="mx-auto h-14 w-14 text-brass animate-flicker" />
      <h2 className="mt-3 text-3xl font-black text-brass-gradient">The Great Engine Lives</h2>
      <p className="mt-2 text-foreground/90">Brasshaven thunders back to life. Every lamp burns, every gear turns, and the skies fill with airships.</p>
      <p className="mt-2 text-sm text-amber">Steam Cores earned: {cores}</p>
      <button onClick={onClose} className="btn-brass mt-4 px-5 py-2">Keep building</button>
    </Modal>
  );
}

export function DistrictUnlockModal({ district, onClose }: { district: District; onClose: () => void }) {
  return (
    <Modal>
      <Cog className="mx-auto h-14 w-14 text-brass animate-spin-slow" />
      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">District unlocked</p>
      <h2 className="text-3xl font-black text-brass-gradient">{district.name}</h2>
      <p className="mt-2 text-foreground/90">{district.description}</p>
      <button onClick={onClose} className="btn-brass mt-4 px-5 py-2">Open the gates</button>
    </Modal>
  );
}

export function OfflineModal({ amount, onClose }: { amount: number; onClose: () => void }) {
  return (
    <Modal>
      <h2 className="text-2xl font-black text-brass-gradient">Welcome back, Magnate</h2>
      <p className="mt-2">Your factories earned <span className="text-amber">{formatNumber(amount)}</span> coins while you were away.</p>
      <button onClick={onClose} className="btn-brass mt-4 px-5 py-2">Collect</button>
    </Modal>
  );
}
