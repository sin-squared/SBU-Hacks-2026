import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CityManagement } from "@/components/CityManagement";
import { CityEvent, Contracts, Expeditions, Research } from "@/components/CityPanels";
import { ActionPopup } from "@/components/ActionPopup";
import {
  BUILDINGS,
  CITY_EVENTS,
  CONTRACTS,
  DESTINATIONS,
  PLOT_TECHNOLOGIES,
  TECHNOLOGIES,
  cityEvent,
  type BuildingKind,
  type Cost,
  type Resource,
} from "@/game/city-config";
import {
  actionReason,
  advanceCity,
  buildingRates,
  cityAction,
  contractProgress,
  contractStatus,
  eventTerms,
  freshCity,
  plotLimit,
  production,
  steamCapacity,
  type CityState,
} from "@/game/city";
import { CITY_SAVE_KEY, decodeCity, readCity, writeCity } from "@/game/city-save";
import { useCity, type CityGame } from "@/hooks/useCity";

function rich(): CityState {
  const s = freshCity(100000);
  return {
    ...s,
    hasBuiltOilRig: true,
    unlockedPlots: 12,
    earned: 50000,
    resources: { coins: 50000, gears: 5000, oil: 5000, steam: 250, research: 5000, crystals: 500 },
    permits: ["industrial", "aetherport"],
    contracts: ["gears"],
    technologies: [
      "boilers",
      "automation",
      "airships",
      "reservoir",
      ...PLOT_TECHNOLOGIES.map((t) => t.id),
    ],
    plots: [{ kind: "steamrig", level: 3 }, ...Array.from({ length: 11 }, () => null)],
  };
}
function gameFor(state: CityState): CityGame {
  return { state, loaded: true, now: 100000, saveError: false, act: vi.fn(), reset: vi.fn() };
}
function roundTrip(s: CityState) {
  expect(writeCity(s, 100000)).toBe(true);
  return decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 100000)!;
}
function merchant(visit = 0) {
  return { ...rich(), eventIndex: 1 + visit * CITY_EVENTS.length, eventActive: true };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Sequential land research", () => {
  it("starts with exactly two usable plots, renders locks and an obvious next unlock", () => {
    const s = freshCity(100000);
    render(
      <>
        <CityManagement game={gameFor(s)} />
        <Research game={gameFor(s)} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Plot 1: empty" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Plot 2: empty" })).toBeEnabled();
    for (let i = 3; i <= 12; i++)
      expect(screen.getByRole("button", { name: `Plot ${i}: locked` })).toBeDisabled();
    expect(screen.queryByRole("article", { name: "Land expansion" })).not.toBeInTheDocument();
    expect(screen.getByText("Construct your first Oil Rig to unlock land research.")).toBeInTheDocument();
    expect(actionReason(s, { type: "construct", plot: 2, kind: "oilrig" })).toContain(
      "unlocked plot",
    );
  });

  it("charges the exact increasing costs, enforces sequence and only adds one plot per action", () => {
    const s = rich();
    s.unlockedPlots = 2;
    s.technologies = ["boilers", "reservoir"];
    let current = s;
    for (const t of [...PLOT_TECHNOLOGIES].reverse().slice(0, -1)) {
      const rejected = cityAction(current, { type: "technology", id: t.id });
      expect(rejected.resources).toEqual(current.resources);
      expect(rejected.unlockedPlots).toBe(2);
      expect(rejected.notice).toContain("Unlock Plot 3 first");
    }
    for (const t of PLOT_TECHNOLOGIES) {
      const before = current;
      expect(t.unlockPlot).toBe(before.unlockedPlots + 1);
      const action = { type: "technology", id: t.id } as const;
      expect(actionReason(before, action)).toBe("");
      current = cityAction(before, action);
      expect(current.unlockedPlots).toBe(t.unlockPlot);
      expect(current.technologies).toContain(t.id);
      for (const [key, amount] of Object.entries(t.cost))
        expect(current.resources[key as Resource]).toBeCloseTo(
          before.resources[key as Resource] - amount,
        );
      expect(current.actionFeedback?.message).toBe('RESEARCH COMPLETE!');
      const duplicate = cityAction(current, action);
      expect(duplicate.resources).toEqual(current.resources);
      expect(duplicate.unlockedPlots).toBe(current.unlockedPlots);
      // Replenish test stock without involving unrelated delivery/storage behavior.
      current = { ...current, resources: rich().resources };
      expect(roundTrip(current).unlockedPlots).toBe(t.unlockPlot);
    }
    expect(plotLimit(current)).toBe(12);
  });

  it("uses only coins and oil for Plots 3-5, then introduces resources at the specified tiers", () => {
    expect(PLOT_TECHNOLOGIES.slice(0, 3).map((t) => Object.keys(t.cost))).toEqual(
      Array.from({ length: 3 }, () => ["coins", "oil"]),
    );
    expect(Object.keys(PLOT_TECHNOLOGIES[3].cost)).toEqual(["coins", "oil", "gears"]);
    expect(Object.keys(PLOT_TECHNOLOGIES[5].cost)).toContain("steam");
    expect(Object.keys(PLOT_TECHNOLOGIES[6].cost)).toContain("research");
    for (const t of PLOT_TECHNOLOGIES.slice(8)) expect(Object.keys(t.cost)).toContain("crystals");
    let s = cityAction(freshCity(0), { type: "construct", kind: "oilrig", plot: 0 }, 0);
    s.resources.gears = 0;
    s = advanceCity(s, 18);
    expect(actionReason(s, { type: "technology", id: "plot3" })).toBe("");
    const opened = cityAction(s, { type: "technology", id: "plot3" });
    expect(opened.unlockedPlots).toBe(3);
    expect(opened.resources.gears).toBe(0);
    const poor = { ...s, resources: { ...s.resources, oil: 11 } };
    expect(actionReason(poor, { type: "technology", id: "plot3" })).toBe("Need 1 Oil");
    expect(cityAction(poor, { type: "technology", id: "plot3" }).resources).toEqual(poor.resources);
  });

  it("does not grant land with district contracts and keeps advanced-building permit requirements", () => {
    let s = rich();
    s.unlockedPlots = 2;
    s.permits = [];
    s = cityAction(s, { type: "contract", id: "steam" });
    expect(s.permits).toContain("industrial");
    expect(s.unlockedPlots).toBe(2);
    s = cityAction(s, { type: "contract", id: "sky" });
    expect(s.permits).not.toContain("aetherport"); // Missing hull.
    s.blueprints = ["hull"];
    s = cityAction(s, { type: "contract", id: "sky" });
    expect(s.permits).toContain("aetherport");
    expect(s.unlockedPlots).toBe(2);
    expect(actionReason(s, { type: "construct", kind: "factory", plot: 2 })).toContain(
      "unlocked plot",
    );
    s.permits = [];
    expect(actionReason(s, { type: "construct", kind: "factory", plot: 1 })).toBe(
      "Industrial Permit Required",
    );
  });

  it("unlocks immediately through queued real-hook actions and preserves the new plot after reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    const s = rich();
    s.unlockedPlots = 2;
    s.technologies = [];
    writeCity(s);
    function City() {
      const game = useCity();
      return (
        <>
          <CityManagement game={game} />
          <Research game={game} />
          <ActionPopup feedback={game.state.actionFeedback} />
        </>
      );
    }
    const ui = render(
      <StrictMode>
        <City />
      </StrictMode>,
    );
    const next = screen.getByRole("article", { name: "Land expansion" });
    fireEvent.click(within(next).getByRole("button", { name: "Unlock Plot 3" }));
    expect(screen.getByRole("button", { name: "Plot 3: empty" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Plot 4: locked" })).toBeDisabled();
    expect(screen.getByText("RESEARCH COMPLETE!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plot 3: empty" }));
    fireEvent.click(
      within(screen.getByRole("article", { name: "Oil Rig" })).getByRole("button", {
        name: "Construct",
      }),
    );
    ui.unmount();
    const hook = renderHook(() => useCity());
    expect(hook.result.current.state.unlockedPlots).toBe(3);
    expect(hook.result.current.state.plots[2]?.kind).toBe("oilrig");
    const coins = hook.result.current.state.resources.coins;
    act(() => hook.result.current.act({ type: "technology", id: "plot3" }));
    expect(hook.result.current.state.resources.coins).toBe(coins);
  });

  it.each([0, 1, 2])(
    "migrates legacy stage %i plots and research without charging or removing buildings",
    (tier) => {
      const s = rich();
      s.permits = tier === 2 ? ["aetherport"] : tier === 1 ? ["industrial"] : [];
      s.technologies = ["boilers", "automation"];
      s.unlockedPlots = 2;
      s.resources.steam = 20;
      s.plots = Array.from({ length: 12 }, () => null);
      const expected = [4, 8, 12][tier]!;
      s.plots[expected - 1] = { kind: "workshop", level: 3 };
      const old = JSON.stringify({ version: 2, economyRevision: 1, eventCycleLength: 7, state: s });
      const migrated = decodeCity(old)!;
      expect(migrated.unlockedPlots).toBe(expected);
      expect(migrated.plots).toEqual(s.plots);
      expect(migrated.resources).toEqual(s.resources);
      expect(migrated.technologies).toEqual(expect.arrayContaining(["boilers", "automation"]));
      expect(migrated.technologies).toEqual(
        expect.arrayContaining(
          PLOT_TECHNOLOGIES.filter((t) => t.unlockPlot <= expected).map((t) => t.id),
        ),
      );
      const saved = roundTrip(migrated);
      expect(saved.unlockedPlots).toBe(expected);
      expect(saved.resources).toEqual(migrated.resources);
      expect(saved.technologies).toEqual(migrated.technologies);
      if (expected < 12) {
        saved.resources.steam = 50;
        expect(actionReason(saved, { type: "technology", id: `plot${expected + 1}` })).toBe("");
        expect(
          cityAction(saved, { type: "technology", id: `plot${expected + 1}` }).unlockedPlots,
        ).toBe(expected + 1);
      }
    },
  );

  it("never hides occupied plots even in a legacy save with an inconsistent permit", () => {
    const s = freshCity();
    s.plots[11] = { kind: "dock", level: 2 };
    const old = decodeCity(JSON.stringify({ version: 2, eventCycleLength: 7, state: s }))!;
    expect(old.unlockedPlots).toBe(12);
    expect(old.plots[11]).toEqual(s.plots[11]);
    expect(roundTrip(freshCity()).unlockedPlots).toBe(2);
  });

  it("preserves advanced land access when importing the legacy coin-only model", () => {
    localStorage.setItem(
      "brasshaven-save-v1",
      JSON.stringify({
        coins: 300,
        owned: { airship: 1 },
        unlockedDistricts: ["foundry", "industrial", "aetherport"],
      }),
    );
    const s = readCity();
    expect(s.unlockedPlots).toBe(12);
    expect(s.plots[0]?.kind).toBe("dock");
    expect(s.resources.coins).toBe(300);
    expect(s.technologies).toEqual(PLOT_TECHNOLOGIES.map((t) => t.id));
  });
});

describe("Trader research and actual transactions", () => {
  const offers = [
    { visit: 0, index: 0 },
    { visit: 0, index: 1 },
    { visit: 0, index: 2 },
    { visit: 1, index: 2 },
    { visit: 2, index: 2 },
  ];
  it.each([[], ["fineprint"], ["bargain"], ["fineprint", "bargain"]])(
    "applies independent effects %j to all five traders without duplicate rewards",
    (...technologies: string[]) => {
      for (const { visit, index } of offers) {
        const s = merchant(visit);
        s.technologies.push(...technologies);
        const option = cityEvent(s.eventIndex)!.options[index]!;
        for (const roll of [0, 0.99]) {
          const action = {
            type: "event",
            index,
            eventIndex: s.eventIndex,
            randomRoll: roll,
          } as const;
          const terms = eventTerms(s, index);
          const next = cityAction(s, action);
          const baseReward: Cost =
            "risk" in option ? (roll < 0.5 ? option.risk.reward : {}) : option.reward;
          const baseCosts: Cost = option.cost;
          for (const key of Object.keys(s.resources) as Resource[]) {
            const baseCost = baseCosts[key] ?? 0;
            const baseAmount = baseReward[key] ?? 0;
            const cost = technologies.includes("fineprint") ? Math.ceil(baseCost * 0.8) : baseCost;
            const reward = technologies.includes("bargain")
              ? Math.floor(baseAmount * 1.25)
              : baseAmount;
            expect(next.resources[key]).toBeCloseTo(s.resources[key] - cost + reward);
            expect(terms.cost[key] ?? 0).toBe(cost);
          }
          expect(next.traderTransactions).toBe(s.traderTransactions + 1);
          expect(next.emergenciesResolved).toBe(s.emergenciesResolved);
          const duplicate = cityAction(next, action);
          expect(duplicate.resources).toEqual(next.resources);
          expect(duplicate.traderTransactions).toBe(next.traderTransactions);
          expect(roundTrip(next).traderTransactions).toBe(next.traderTransactions);
        }
      }
    },
  );

  it("pays discounted non-coin costs at the boundary and rejects an unaffordable trade", () => {
    const s = merchant();
    s.technologies.push("fineprint", "bargain");
    s.resources.gears = 24;
    const action = { type: "event", index: 1, eventIndex: s.eventIndex } as const;
    const next = cityAction(s, action);
    expect(next.resources.gears).toBe(0);
    expect(next.resources.coins - s.resources.coins).toBe(150);
    s.resources.gears = 23;
    expect(actionReason(s, action)).toBe("Need 1 Gears");
    const rejected = cityAction(s, action);
    expect(rejected.resources).toEqual(s.resources);
    expect(rejected.traderTransactions).toBe(0);
    expect(rejected.eventActive).toBe(true);
  });

  it("shows adjusted risky prices, quote, odds and actual net outcomes without mutating offer definitions", () => {
    const s = merchant(1);
    s.technologies.push("fineprint", "bargain");
    const original = JSON.stringify(cityEvent(s.eventIndex));
    const game = gameFor(s);
    render(<CityEvent game={game} />);
    fireEvent.click(screen.getByRole("button", { name: /City Alert/ }));
    const card = screen.getByRole("button", { name: "Take Silas's risky deal" }).parentElement!;
    expect(card).toHaveTextContent("48 Brass Coins buys a 50% chance at 200 Brass Coins");
    expect(card).toHaveTextContent("net +152 Brass Coins");
    expect(card).toHaveTextContent("50% chance: lose the entry cost (48 Brass Coins)");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(game.act).not.toHaveBeenCalled();
    expect(s.traderTransactions).toBe(0);
    expect(JSON.stringify(cityEvent(s.eventIndex))).toBe(original);
    const win = cityAction(s, { type: "event", index: 2, randomRoll: 0.4999 });
    const loss = cityAction(s, { type: "event", index: 2, randomRoll: 0.5 });
    expect(win.resources.coins - s.resources.coins).toBe(152);
    expect(loss.resources.coins - s.resources.coins).toBe(-48);
    expect(win.notice).toContain("Net gain: 152");
    expect(loss.actionFeedback?.effect).toBe("red-vignette");
  });

  it("does not discount or boost unrelated events, contracts or construction", () => {
    const s = { ...rich(), eventIndex: 2, eventActive: true };
    const upgraded = { ...s, technologies: [...s.technologies, "fineprint", "bargain"] };
    const base = cityAction(s, { type: "event", index: 0 });
    const next = cityAction(upgraded, { type: "event", index: 0 });
    expect(next.resources).toEqual(base.resources);
    expect(next.traderTransactions).toBe(0);
    expect(
      cityAction(upgraded, { type: "construct", kind: "oilrig", plot: 1 }).resources.coins,
    ).toBe(upgraded.resources.coins - 135);
  });

  it("commits one researched trade under queued hook actions and saves its transaction without replaying feedback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const s = merchant(1);
    s.technologies.push("fineprint", "bargain");
    writeCity(s);
    const hook = renderHook(() => useCity());
    const action = { type: "event", index: 2, eventIndex: s.eventIndex } as const;
    act(() => {
      hook.result.current.act(action);
      hook.result.current.act(action);
    });
    expect(hook.result.current.state.resources.coins).toBe(s.resources.coins - 48);
    expect(hook.result.current.state.traderTransactions).toBe(1);
    expect(hook.result.current.state.actionFeedback).toMatchObject({
      message: "BAD DEAL!",
      effect: "red-vignette",
    });
    hook.unmount();
    const restored = renderHook(() => useCity());
    expect(restored.result.current.state.traderTransactions).toBe(1);
    expect(restored.result.current.state.actionFeedback).toBe(null);
    act(() => restored.result.current.act(action));
    expect(restored.result.current.state.resources.coins).toBe(s.resources.coins - 48);
  });
});

describe("Industrial research effects", () => {
  it.each(Object.keys(BUILDINGS) as BuildingKind[])(
    "runs %s exactly 5%% faster with proportional input consumption, at every level and after reload",
    (kind) => {
      for (const level of [1, 2, 3]) {
        const s = rich();
        s.plots = [{ kind, level }, ...Array.from({ length: 11 }, () => null)];
        s.resources.steam = Math.min(20, steamCapacity(s));
        const quick = { ...s, technologies: [...s.technologies, "whirr"] };
        const normalRates = buildingRates(s, s.plots[0]!, 0);
        const quickRates = buildingRates(quick, quick.plots[0]!, 0);
        for (const key of Object.keys(s.resources) as Resource[]) {
          expect(quickRates.output[key]).toBeCloseTo(normalRates.output[key] * 1.05);
          expect(quickRates.input[key]).toBeCloseTo(normalRates.input[key] * 1.05);
        }
        const restored = roundTrip(quick);
        const next = advanceCity(restored, 1);
        for (const key of Object.keys(s.resources) as Resource[]) {
          expect(next.resources[key] - restored.resources[key]).toBeCloseTo(
            quickRates.output[key] - quickRates.input[key],
          );
          expect(production(next).effectiveOutput[key]).toBeCloseTo(quickRates.output[key]);
        }
      }
    },
  );

  it("adds useful storage without changing production and prices union prevention in all six resources", () => {
    const s = rich();
    s.technologies = ["boilers"];
    const baseCapacity = steamCapacity(s);
    const next = cityAction(s, { type: "technology", id: "reservoir" });
    expect(steamCapacity(next)).toBe(baseCapacity + 90);
    expect(buildingRates(next, next.plots[0]!, 0)).toEqual(buildingRates(s, s.plots[0]!, 0));
    const union = TECHNOLOGIES.find((t) => t.id === "ununionizer")!;
    expect(Object.keys(union.cost).sort()).toEqual([
      "coins",
      "crystals",
      "gears",
      "oil",
      "research",
      "steam",
    ]);
    expect(union.stage).toBe(2);
    expect(union.requires).toBe("airships");
    const poor = rich();
    poor.resources.steam = 179;
    expect(actionReason(poor, { type: "technology", id: union.id })).toBe(
      "Need 1 Steam Components",
    );
  });

  it.each(["scheduled", "active", "pending"] as const)(
    "prevents %s unions once researched, including saved deadlines, but keeps other events",
    (mode) => {
      let s = rich();
      s.eventIndex = 6;
      s.eventDue = 0;
      if (mode !== "scheduled") s = advanceCity(s, 0);
      if (mode === "pending") s = cityAction(s, { type: "event", index: 1 });
      const beforePlots = s.plots;
      const beforeCredit = s.emergenciesResolved;
      const next = cityAction(s, { type: "technology", id: "ununionizer" });
      expect(next.technologies).toContain("ununionizer");
      expect(next.pendingWalkout).toBe(null);
      expect(next.eventIndex % 7).toBe(0);
      expect(next.eventActive).toBe(false);
      expect(next.plots).toEqual(beforePlots);
      expect(next.emergenciesResolved).toBe(beforeCredit);
      const restored = roundTrip(next);
      const later = advanceCity(restored, 20);
      expect(later.eventActive).toBe(true);
      expect(later.eventIndex % 7).toBe(0);
      expect(later.plots).toEqual(beforePlots);
      expect(later.actionFeedback).toBe(null);
      // Resolve a breakdown: the event loop jumps over union without changing its length.
      const breakdown = advanceCity(
        { ...later, eventIndex: 5, eventActive: false, eventDue: 0, secondEvent: null, eventCursor: null, nextEventDue: null },
        0,
      );
      expect(breakdown.damagedPlots).toHaveLength(1);
      const fixed = cityAction(breakdown, { type: "event", index: 0 });
      expect(fixed.eventIndex).toBe(7);
      expect(fixed.emergenciesResolved).toBe(beforeCredit + 1);
    },
  );

  it("cleans contradictory researched saves and preserves an unrelated unresolved emergency", () => {
    let pending = rich();
    pending.eventIndex = 6;
    pending.eventDue = 0;
    pending = cityAction(advanceCity(pending, 0), { type: "event", index: 1 });
    pending.technologies.push("ununionizer");
    const restored = roundTrip(pending);
    expect(restored.pendingWalkout).toBe(null);
    expect(advanceCity(restored, 5).plots).toEqual(pending.plots);
    const active = { ...rich(), eventIndex: 2, eventActive: true };
    const researched = cityAction(active, { type: "technology", id: "ununionizer" });
    expect(researched.eventIndex).toBe(2);
    expect(researched.eventActive).toBe(true);
    expect(researched.resources.coins).toBe(active.resources.coins - 4000);
    expect(cityAction(researched, { type: "technology", id: "ununionizer" }).resources).toEqual(
      researched.resources,
    );
  });

  it("cancels the real production-clock deadline rather than merely hiding its notification", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    let s = rich();
    s.eventIndex = 6;
    s.eventDue = 0;
    s = cityAction(advanceCity(s, 0), { type: "event", index: 1 });
    writeCity(s);
    const hook = renderHook(() => useCity());
    act(() => hook.result.current.act({ type: "technology", id: "ununionizer" }));
    expect(hook.result.current.state.pendingWalkout).toBe(null);
    const feedback = hook.result.current.state.actionFeedback;
    act(() => vi.advanceTimersByTime(6000));
    expect(hook.result.current.state.plots).toEqual(s.plots);
    expect(hook.result.current.state.actionFeedback).toBe(feedback);
    expect(hook.result.current.state.actionFeedback?.effect).toBe("green-vignette");
    expect(roundTrip(hook.result.current.state).pendingWalkout).toBe(null);
  });
});

describe("Expedition investment and cargo", () => {
  it.each([0, 1, 2])(
    "charges tier %i launch fees atomically and multiplies ordinary cargo exactly fivefold",
    (index) => {
      const d = DESTINATIONS[index]!;
      expect(d.cost.coins).toBe([800, 1200, 1800][index]);
      expect(d.reward).toEqual(
        [
          { crystals: 30, research: 75 },
          { gears: 350, crystals: 20 },
          { steam: 225, crystals: 40 },
        ][index],
      );
      const s = rich();
      s.plots[1] = { kind: "dock", level: 1 };
      s.resources.coins = d.cost.coins - 1;
      const launch = { type: "launch", index } as const;
      const poor = cityAction(s, launch, 0);
      expect(poor.resources).toEqual(s.resources);
      expect(poor.expedition).toBe(null);
      s.resources.coins++;
      const launched = cityAction(s, launch, 0);
      for (const [key, amount] of Object.entries(d.cost))
        expect(launched.resources[key as Resource]).toBe(s.resources[key as Resource] - amount);
      expect(cityAction(launched, launch, 0).resources).toEqual(launched.resources);
      expect(launched.expedition?.endsAt).toBe(d.duration * 750);
      for (const choice of [0, 1]) {
        const encountered = cityAction(
          launched,
          { type: "expeditionChoice", index: choice },
          d.duration * 500,
        );
        expect(encountered.expedition?.choice).toBe(choice);
        encountered.resources.steam = 0;
        const collected = cityAction(encountered, { type: "collect" }, d.duration * 1000);
        for (const [key, amount] of Object.entries(d.reward))
          expect(
            collected.resources[key as Resource] - encountered.resources[key as Resource],
          ).toBe(choice === 0 ? amount : Math.floor(amount / 2));
        expect(collected.blueprints.includes(d.blueprint)).toBe(choice === 0);
        expect(collected.artifact).toBe(choice === 0 && d.artifact);
        expect(collected.expeditionCount).toBe(1);
        expect(cityAction(collected, { type: "collect" }, d.duration * 1000).resources).toEqual(
          collected.resources,
        );
        expect(roundTrip(collected).expeditionCount).toBe(1);
      }
    },
  );

  it("shows full prices and cargo before launching and preserves steam limits on large rewards", () => {
    const s = rich();
    s.plots[1] = { kind: "dock", level: 1 };
    render(<Expeditions game={gameFor(s)} />);
    expect(screen.getByText(/90s · 800 Brass Coins/)).toBeInTheDocument();
    expect(screen.getByText(/1800 Brass Coins/)).toBeInTheDocument();
    expect(screen.getByText(/225 Steam Components/)).toBeInTheDocument();
    const limited: CityState = {
      ...s,
      technologies: [],
      plots: [{ kind: "dock", level: 1 }, ...Array.from({ length: 11 }, () => null)],
      resources: { ...s.resources, steam: 0 },
      expedition: { destination: 2, endsAt: 100000, choice: 0 },
    };
    const collected = cityAction(limited, { type: "collect" }, 100000);
    expect(collected.resources.steam).toBe(30);
    expect(collected.artifact).toBe(true);
  });
});

describe("Expanded contract objectives", () => {
  const newContracts = CONTRACTS.slice(6);
  it("preserves the eight expansion contracts and adds three beginner milestones", () => {
    expect(newContracts).toHaveLength(11);
    expect(new Set(CONTRACTS.map((c) => c.id)).size).toBe(CONTRACTS.length);
    expect(CONTRACTS.slice(0, 6).map((c) => c.id)).toEqual([
      "gears",
      "steam",
      "assembly",
      "sky",
      "engine",
      "maintenance",
    ]);
    expect(newContracts.filter((c) => c.stage === 0)).toHaveLength(4);
  });

  it.each(newContracts)(
    "$title tracks its real objective and pays exactly once through save/reload",
    (c) => {
      let s = rich();
      s.traderTransactions = 3;
      s.expeditionCount = 1;
      s.firstResearch = true;
      s.resources.steam = 200;
      s.technologies.push("whirr");
      const progress = contractProgress(s, c);
      if ("objective" in c) expect(progress?.value).toBeGreaterThanOrEqual(c.objective.target);
      else
        for (const [key, amount] of Object.entries(c.cost)) {
          const poor = { ...s, resources: { ...s.resources, [key]: amount - 1 } };
          expect(actionReason(poor, { type: "contract", id: c.id })).not.toBe("");
          expect(cityAction(poor, { type: "contract", id: c.id }).resources).toEqual(
            poor.resources,
          );
        }
      expect(contractStatus(s, c)).toBe("Completed · Ready to claim");
      const before = s;
      s = cityAction(s, { type: "contract", id: c.id });
      expect(s.contracts).toContain(c.id);
      expect(s.actionFeedback).toBe(before.actionFeedback);
      for (const key of Object.keys(s.resources) as Resource[]) {
        const spent = Object.entries(c.cost).find(([k]) => k === key)?.[1] ?? 0;
        const reward = Object.entries(c.reward).find(([k]) => k === key)?.[1] ?? 0;
        expect(s.resources[key]).toBeCloseTo(
          key === "steam"
            ? Math.min(255, before.resources[key] - spent + reward)
            : before.resources[key] - spent + reward,
        );
      }
      const restored = roundTrip(s);
      expect(contractStatus(restored, c)).toBe("Claimed");
      expect(cityAction(restored, { type: "contract", id: c.id }).resources).toEqual(
        restored.resources,
      );
    },
  );

  it("rejects incomplete milestone claims, excludes plot research from science, and presents stage-appropriate cards", () => {
    const s = rich();
    s.traderTransactions = 2;
    s.expeditionCount = 0;
    const trade = CONTRACTS.find((c) => c.id === "teacup")!;
    const science = CONTRACTS.find((c) => c.id === "questionable")!;
    expect(contractProgress(s, trade)).toEqual({
      label: "Trader transactions",
      value: 2,
      target: 3,
    });
    expect(contractProgress(s, science)?.value).toBe(4);
    for (const id of ["teacup", "tourist", "questionable"])
      expect(cityAction(s, { type: "contract", id }).contracts).not.toContain(id);
    const ui = render(<Contracts game={gameFor(freshCity())} />);
    expect(screen.queryByText("The Crude Awakening")).not.toBeInTheDocument();
    expect(screen.queryByText("Three Deals and a Teacup")).not.toBeInTheDocument();
    ui.rerender(<Contracts game={gameFor(s)} />);
    const card = screen
      .getByRole("heading", { name: "Three Deals and a Teacup" })
      .closest("article")!;
    expect(card).toHaveTextContent("Trader transactions: 2/3");
    expect(within(card).getByRole("button", { name: "Claim reward" })).toBeDisabled();
  });
});
