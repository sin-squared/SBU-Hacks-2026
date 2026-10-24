import { BUSINESSES } from "@/game/data";
import type { Game } from "@/hooks/useGame";
import { BusinessCard } from "./BusinessCard";

export function BusinessPanel({ game }: { game: Game }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BUSINESSES.map((b) => (
        <BusinessCard key={b.id} business={b} game={game} />
      ))}
    </div>
  );
}
