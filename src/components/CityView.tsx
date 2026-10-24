import { useState } from "react";
import { BUSINESSES, CLICK_REWARD, DISTRICTS } from "@/game/data";
import { businessMultiplier } from "@/game/economy";
import type { BusinessId, DistrictId } from "@/game/types";
import type { Game } from "@/hooks/useGame";

/** Layout for each building silhouette in the 1000x420 SVG scene. */
const SPOTS: Record<BusinessId, { x: number; w: number; h: number; stack?: boolean; roof: "peak" | "flat" | "dome" }> = {
  workshop: { x: 40, w: 110, h: 120, roof: "peak" },
  bakery: { x: 165, w: 100, h: 95, stack: true, roof: "peak" },
  factory: { x: 640, w: 130, h: 150, stack: true, roof: "flat" },
  automaton: { x: 785, w: 110, h: 180, stack: true, roof: "flat" },
  airship: { x: 300, w: 90, h: 200, roof: "dome" },
  engine: { x: 0, w: 0, h: 0, roof: "dome" },
};

const DISTRICT_SPAN: Record<DistrictId, [number, number]> = {
  foundry: [20, 285],
  aetherport: [285, 620],
  industrial: [620, 980],
};

export function CityView({ game }: { game: Game }) {
  const { state } = game;
  const [floats, setFloats] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pulse, setPulse] = useState(0);
  const engineOwned = state.owned.engine > 0;

  const onEngine = (e: React.MouseEvent<HTMLButtonElement>) => {
    game.click();
    setPulse((p) => p + 1);
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFloats((f) => [...f.slice(-8), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
  };

  return (
    <section className="panel overflow-hidden p-0">
      <div className="relative">
        <svg viewBox="0 0 1000 420" className="block w-full bg-sky" role="img" aria-label="Brasshaven city skyline">
          {/* distant hills */}
          <path d="M0 330 Q150 270 300 310 T600 300 T1000 290 V420 H0Z" className="fill-iron/70" />
          {/* districts */}
          {DISTRICTS.map((d) => {
            const [x1, x2] = DISTRICT_SPAN[d.id];
            const unlocked = state.unlockedDistricts.includes(d.id);
            return (
              <g key={d.id}>
                <rect x={x1} y={360} width={x2 - x1} height={60} className={unlocked ? "fill-iron" : "fill-iron-deep"} />
                <text x={(x1 + x2) / 2} y={400} textAnchor="middle" className={`font-display text-[14px] tracking-widest ${unlocked ? "fill-brass" : "fill-muted-foreground/50"}`}>
                  {d.name.toUpperCase()}
                </text>
              </g>
            );
          })}
          {/* pipes */}
          <path d="M150 340 H640" className="stroke-copper" strokeWidth={6} fill="none" opacity={0.6} />
          {BUSINESSES.filter((b) => b.id !== "engine").map((b) => {
            const s = SPOTS[b.id];
            const unlocked = state.unlockedDistricts.includes(b.district);
            const owned = state.owned[b.id];
            const upgraded = businessMultiplier(state, b.id) > 1;
            return (
              <Building key={b.id} {...s} unlocked={unlocked} owned={owned} upgraded={upgraded} />
            );
          })}
          {/* airship */}
          {state.unlockedDistricts.includes("aetherport") && (
            <g className={state.owned.airship ? "" : "opacity-40"}>
              <ellipse cx={420} cy={80} rx={70} ry={22} className="fill-copper" />
              <rect x={400} y={100} width={40} height={14} rx={3} className="fill-iron" />
              <circle cx={492} cy={80} r={6} className="fill-brass animate-spin-slow" />
            </g>
          )}
          {/* Great engine housing */}
          <g>
            <rect x={445} y={200} width={110} height={160} rx={8} className={engineOwned ? "fill-copper" : "fill-iron"} stroke="currentColor" />
            <rect x={470} y={140} width={18} height={60} className="fill-iron" />
            <rect x={512} y={150} width={18} height={50} className="fill-iron" />
            {engineOwned && [0, 1, 2].map((i) => (
              <circle key={i} cx={479} cy={130} r={14} className="fill-steam animate-steam" style={{ animationDelay: `${i * 1.1}s` }} />
            ))}
          </g>
        </svg>

        {/* Clickable Great Engine */}
        <button
          onClick={onEngine}
          aria-label={`Crank the Great Engine for ${CLICK_REWARD} coins`}
          className="group absolute left-1/2 top-[58%] flex h-[22%] w-[11%] min-w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <svg key={pulse} viewBox="0 0 100 100" className={`h-full w-full drop-shadow-lg ${pulse ? "animate-pop" : ""} ${engineOwned ? "glow rounded-full" : ""}`}>
            <Gear className="fill-brass animate-spin-slow" />
            <circle cx={50} cy={50} r={14} className="fill-iron-deep" />
            <circle cx={50} cy={50} r={7} className={engineOwned ? "fill-amber animate-flicker" : "fill-copper"} />
          </svg>
          {floats.map((f) => (
            <span key={f.id} className="pointer-events-none absolute font-display font-bold text-amber animate-float-up" style={{ left: f.x, top: f.y }}>
              +{CLICK_REWARD}
            </span>
          ))}
        </button>
      </div>
      <p className="border-t border-copper/50 px-4 py-2 text-center text-sm text-muted-foreground">
        {engineOwned ? "The Great Engine roars at full power." : "Crank the Great Engine for spare coins while the city wakes."}
      </p>
    </section>
  );
}

function Gear({ className }: { className?: string }) {
  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g className={className}>
      {teeth.map((a) => (
        <rect key={a} x={45} y={4} width={10} height={16} rx={2} transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={36} />
    </g>
  );
}

function Building({ x, w, h, stack, roof, unlocked, owned, upgraded }: {
  x: number; w: number; h: number; stack?: boolean; roof: "peak" | "flat" | "dome";
  unlocked: boolean; owned: number; upgraded: boolean;
}) {
  const base = 360;
  const top = base - h;
  const lit = owned > 0;
  const body = !unlocked ? "fill-iron-deep/60" : lit ? "fill-secondary" : "fill-iron/80";
  const win = upgraded ? "fill-amber animate-flicker" : lit ? "fill-brass/80" : "fill-iron-deep";
  const cols = Math.max(2, Math.floor(w / 28));
  const rows = Math.max(2, Math.floor(h / 40));
  const litCount = Math.min(cols * rows, owned * 2);
  return (
    <g className={unlocked ? "" : "opacity-40"}>
      {stack && <rect x={x + w - 26} y={top - 50} width={14} height={50} className={body} />}
      {stack && lit && unlocked && <circle cx={x + w - 19} cy={top - 60} r={10} className="fill-steam animate-steam" />}
      {roof === "peak" && <polygon points={`${x - 6},${top} ${x + w / 2},${top - 34} ${x + w + 6},${top}`} className={lit ? "fill-copper" : body} />}
      {roof === "dome" && <ellipse cx={x + w / 2} cy={top} rx={w / 2} ry={26} className={lit ? "fill-copper" : body} />}
      {roof === "flat" && <rect x={x - 4} y={top - 8} width={w + 8} height={8} className={lit ? "fill-copper" : body} />}
      <rect x={x} y={top} width={w} height={h} className={body} />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const i = r * cols + c;
          return (
            <rect key={i} x={x + 10 + c * ((w - 20) / cols)} y={top + 14 + r * ((h - 28) / rows)} width={12} height={16} rx={2}
              className={i < litCount ? win : "fill-iron-deep"} />
          );
        }),
      )}
      {upgraded && <circle cx={x + 16} cy={top + 10} r={7} className="fill-brass animate-spin-rev" />}
    </g>
  );
}
