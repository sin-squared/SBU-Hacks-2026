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
import { ActionPopup } from "@/components/ActionPopup";
import { Contracts, Expeditions, Research } from "@/components/CityPanels";
import { ResourceAmounts } from "@/components/ResourceAmounts";
import {
  actionReason,
  advanceCity,
  cityAction,
  contractProgress,
  contractStatus,
  freshCity,
  steamCapacity,
  trackContractCompletions,
  type CityState,
} from "@/game/city";
import {
  CONTRACTS,
  DESTINATIONS,
  RESOURCE_NAMES,
  TECHNOLOGIES,
  type Resource,
} from "@/game/city-config";
import { CITY_SAVE_KEY, decodeCity, writeCity } from "@/game/city-save";
import { useCity, type CityGame } from "@/hooks/useCity";

function started(): CityState {
  const s = freshCity(100000);
  return {
    ...s,
    hasBuiltOilRig: true,
    resources: { ...s.resources, coins: 500, oil: 100, gears: 20, research: 100 },
    plots: [{ kind: "oilrig", level: 1 }, ...Array.from({ length: 11 }, () => null)],
  };
}
function gameFor(state: CityState): CityGame {
  return { state, now: 100000, loaded: true, saveError: false, act: vi.fn(), reset: vi.fn() };
}
function roundTrip(s: CityState) {
  expect(writeCity(s, 100000)).toBe(true);
  return decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 100000)!;
}
function card(title: string) {
  return screen.getByRole("heading", { name: title }).closest("article")!;
}
function expectSorted() {
  const states = screen
    .getAllByRole("article")
    .map((node) => node.querySelector("button")?.disabled === true);
  const first = states.indexOf(true);
  if (first >= 0) expect(states.slice(first).every(Boolean)).toBe(true);
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Per-resource affordability", () => {
  it("hides the highest-balance counter without changing its milestone or claim requirements", () => {
    let s = started();
    const ui = render(<Contracts game={gameFor(s)} />);
    const milestone = card("A Thousand Bucks? Practically Royalty!");
    expect(milestone).toHaveTextContent("Reach a balance of 1,000 Brass Coins once.");
    expect(screen.queryByText(/Highest coin balance/)).not.toBeInTheDocument();
    expect(within(milestone).queryByRole("progressbar")).not.toBeInTheDocument();
    expect(within(milestone).getByRole("button", { name: "Claim reward" })).toBeDisabled();
    s = trackContractCompletions({ ...s, resources: { ...s.resources, coins: 1000 } });
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(within(milestone).getByRole("button", { name: "Claim reward" })).toBeEnabled();
    expect(screen.queryByText(/Highest coin balance/)).not.toBeInTheDocument();
    const claimed = cityAction(s, { type: "contract", id: "firstthousand" });
    expect(claimed.resources.coins).toBe(1075);
    expect(claimed.contracts).toContain("firstthousand");
  });

  it.each(Object.keys(RESOURCE_NAMES) as Resource[])(
    "colors %s independently at the exact reducer threshold",
    (resource) => {
      const amounts = { [resource]: 10 };
      const s = started();
      s.resources[resource] = 9;
      const ui = render(<ResourceAmounts amounts={amounts} available={s.resources} />);
      const node = () => document.querySelector(`[data-resource="${resource}"]`)!;
      expect(node()).toHaveClass("text-trade-cost");
      expect(node()).toHaveAttribute("data-affordable", "false");
      expect(node().querySelector("svg")).toBeInTheDocument();
      s.resources[resource] = 10;
      ui.rerender(<ResourceAmounts amounts={amounts} available={s.resources} />);
      expect(node()).toHaveClass("text-trade-reward");
      expect(node()).toHaveAttribute("data-affordable", "true");
    },
  );

  it("updates mixed research requirements immediately, without requiring production or changing the price", () => {
    const s = started();
    s.permits = ["industrial"];
    s.technologies = ["boilers"];
    s.resources.coins = 350;
    s.resources.gears = 34;
    s.resources.oil = 50;
    s.resources.research = 40;
    const ui = render(<Research game={gameFor(s)} />);
    const c = card("Whirr Faster, Think Later");
    expect(c.querySelector('[data-resource="coins"]')).toHaveClass("text-trade-reward");
    expect(c.querySelector('[data-resource="gears"]')).toHaveClass("text-trade-cost");
    expect(c.querySelector('[data-resource="oil"]')).toHaveClass("text-trade-reward");
    expect(c.querySelector('[data-resource="research"]')).toHaveClass("text-trade-reward");
    expect(within(c).getByRole("button", { name: "Research" })).toBeDisabled();
    s.resources.gears = 35;
    ui.rerender(<Research game={gameFor(s)} />);
    expect(c.querySelector('[data-resource="gears"]')).toHaveClass("text-trade-reward");
    expect(within(c).getByRole("button", { name: "Research" })).toBeEnabled();
    const next = cityAction(s, { type: "technology", id: "whirr" });
    expect(next.resources.coins).toBe(0);
    expect(next.resources.gears).toBe(0);
    expect(next.resources.oil).toBe(0);
    expect(next.resources.research).toBe(0);
  });

  it("colors genuine contract deliveries independently and keeps every reward yellow with no invented milestone payment", () => {
    const s = started();
    s.contracts = ["gears"];
    s.resources.steam = 20;
    s.resources.gears = 14;
    s.earned = 100;
    const ui = render(<Contracts game={gameFor(s)} />);
    const c = card("Industrial Charter");
    const cost = within(c).getByLabelText("Delivery requirements");
    expect(cost.querySelector('[data-resource="steam"]')).toHaveClass("text-trade-reward");
    expect(cost.querySelector('[data-resource="gears"]')).toHaveClass("text-trade-cost");
    expect(within(c).getByRole("button", { name: "Deliver & claim" })).toBeDisabled();
    expect(
      within(card("Look Ma, I'm a Scientist!")).queryByLabelText("Delivery requirements"),
    ).not.toBeInTheDocument();
    for (const reward of screen.getAllByText(/Reward:/)) {
      expect(reward).toHaveClass("text-amber");
      expect(reward.querySelector("svg")).toBeInTheDocument();
      expect(reward.querySelector("[data-affordable]")).not.toBeInTheDocument();
    }
    s.resources.steam = 19;
    s.resources.gears = 15;
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(cost.querySelector('[data-resource="steam"]')).toHaveClass("text-trade-cost");
    expect(cost.querySelector('[data-resource="gears"]')).toHaveClass("text-trade-reward");
  });
});

describe("Completed card ordering and claims", () => {
  it("hides purchased research and restores purchasable-first order after reload", () => {
    let s = started();
    const ui = render(<Research game={gameFor(s)} />);
    s = cityAction(s, { type: "technology", id: "boilers" });
    ui.rerender(<Research game={gameFor(s)} />);
    expect(screen.queryByRole("heading", {name:"Efficient Boilers"})).not.toBeInTheDocument();
    expectSorted();
    const duplicate = cityAction(s, { type: "technology", id: "boilers" });
    expect(duplicate.resources).toEqual(s.resources);
    expect(duplicate.actionFeedback).toBe(s.actionFeedback);
    s = roundTrip(s);
    ui.rerender(<Research game={gameFor(s)} />);
    expect(screen.queryByRole("heading", {name:"Efficient Boilers"})).not.toBeInTheDocument();
    expectSorted();
  });

  it("moves ready contracts first, hides claimed contracts and persists completion after stock falls", () => {
    let s = started();
    s.firstResearch = true;
    s.resources.gears = 30;
    s = trackContractCompletions(s);
    const ui = render(<Contracts game={gameFor(s)} />);
    expectSorted();
    const guild = card("The Tinkers’ Guild");
    expect(guild).toHaveClass("completed-ledger-card");
    expect(within(guild).getByRole("button", { name: "Deliver & claim" })).toBeEnabled();
    s = cityAction(s, { type: "contract", id: "gears" });
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(screen.queryByRole("heading", {name:"The Tinkers’ Guild"})).not.toBeInTheDocument();
    expectSorted();
    const coins = s.resources.coins;
    expect(cityAction(s, { type: "contract", id: "gears" }).resources.coins).toBe(coins);
    s = roundTrip(s);
    ui.rerender(<Contracts game={gameFor(s)} />);
    expectSorted();
    s.resources.oil = 0;
    ui.rerender(<Contracts game={gameFor(s)} />);
    const crude = card("The Crude Awakening");
    expect(crude).toHaveClass("completed-ledger-card");
    expect(crude).toHaveTextContent("Completed · Delivery required");
    expect(within(crude).getByRole("button", { name: "Deliver & claim" })).toBeDisabled();
  });
});

describe("Beginner milestone gameplay", () => {
  it("tracks actual purchased research, including the first land upgrade, but not menu visits, rejected actions or duplicates", () => {
    let s = started();
    render(<Research game={gameFor(s)} />);
    expect(s.firstResearch).toBe(false);
    const poor = { ...s, resources: { ...s.resources, oil: 0 } };
    expect(cityAction(poor, { type: "technology", id: "plot3" }).firstResearch).toBe(false);
    expect(cityAction(s, { type: "technology", id: "unknown" }).firstResearch).toBe(false);
    s = cityAction(s, { type: "technology", id: "plot3" });
    expect(s.firstResearch).toBe(true);
    expect(s.completedContracts).toContain("firstscience");
    expect(s.actionFeedback?.effect).toBe("green-vignette");
    const completion = s.contractCompletionId;
    const before = { ...s.resources };
    s = cityAction(s, { type: "contract", id: "firstscience" });
    expect(s.resources.coins).toBe(before.coins + 40);
    expect(s.resources.gears).toBe(before.gears + 6);
    expect(s.resources.oil).toBe(before.oil + 10);
    expect(s.contractCompletionId).toBe(completion);
    expect(s.actionFeedback?.effect).toBe('green-vignette');
    expect(cityAction(s, { type: "contract", id: "firstscience" }).resources).toEqual(s.resources);
    expect(roundTrip(s).contracts).toContain("firstscience");
  });

  it.each([0, 1] as const)(
    "counts actual expedition cargo collection for outcome %i, not launching, choosing or premature collection",
    (choice) => {
      let s = started();
      s.resources.coins = 900;
      s.resources.steam = 50;
      s.resources.gears = 50;
      s.plots[1] = { kind: "dock", level: 1 };
      s = cityAction(s, { type: "launch", index: 0 }, 0);
      expect(s.completedContracts).not.toContain("firstvoyage");
      expect(cityAction(s, { type: "collect" }, 1).expeditionCount).toBe(0);
      s = cityAction(
        s,
        { type: "expeditionChoice", index: choice },
        DESTINATIONS[0].duration * 500,
      );
      expect(s.completedContracts).not.toContain("firstvoyage");
      s = cityAction(s, { type: "collect" }, DESTINATIONS[0].duration * 1000);
      expect(s.expeditionCount).toBe(1);
      expect(s.completedContracts).toContain("firstvoyage");
      expect(s.contractCompletionId).toBe(1);
      expect(s.blueprints.includes("lens")).toBe(choice === 0);
      const before = s;
      s = cityAction(s, { type: "contract", id: "firstvoyage" });
      expect(s.resources.coins).toBe(before.resources.coins + 100);
      expect(s.resources.gears).toBe(before.resources.gears + 15);
      expect(s.resources.oil).toBe(before.resources.oil + 20);
      expect(s.resources.steam).toBe(Math.min(steamCapacity(s), before.resources.steam + 10));
      expect(s.contractCompletionId).toBe(before.contractCompletionId);
      s = roundTrip(s);
      expect(cityAction(s, { type: "collect" }, 1000000).resources).toEqual(s.resources);
      expect(cityAction(s, { type: "contract", id: "firstvoyage" }).resources).toEqual(s.resources);
    },
  );

  it("records the 1000-coin balance during real production, survives spending below it and reload, and claims once", () => {
    let s = started();
    s.resources.coins = 997.5;
    s.resources.oil = 0;
    s.resources.gears = 0;
    s = advanceCity(s, 1);
    expect(s.resources.coins).toBe(1000);
    expect(s.peakCoins).toBe(1000);
    expect(s.completedContracts).toContain("firstthousand");
    const completion = s.contractCompletionId;
    s = cityAction(s, { type: "construct", kind: "workshop", plot: 1 });
    expect(s.resources.coins).toBe(925);
    expect(s.peakCoins).toBe(1000);
    expect(s.contractCompletionId).toBe(completion);
    s = roundTrip(s);
    expect(s.contractCompletionId).toBe(0);
    expect(
      contractStatus(
        s,
        CONTRACTS.find((c) => c.id === "firstthousand")!,
      ),
    ).toBe("Completed · Ready to claim");
    const before = s.resources;
    s = cityAction(s, { type: "contract", id: "firstthousand" });
    expect(s.resources.coins).toBe(before.coins + 75);
    expect(s.resources.gears).toBe(before.gears + 12);
    expect(s.resources.oil).toBe(before.oil + 20);
    expect(s.contractCompletionId).toBe(0);
    const reloaded = roundTrip(s);
    expect(cityAction(reloaded, { type: "contract", id: "firstthousand" }).resources).toEqual(
      reloaded.resources,
    );
  });

  it("uses balance not cumulative earnings and captures crossing from legitimate rewards", () => {
    let s = started();
    s.earned = 100000;
    s.resources.coins = 999;
    expect(actionReason(s, { type: "contract", id: "firstthousand" })).not.toBe("");
    s.eventIndex = 3;
    s.eventActive = true;
    s = cityAction(s, { type: "event", index: 1, eventIndex: 3 });
    expect(s.resources.coins).toBeGreaterThanOrEqual(1000);
    expect(s.completedContracts).toContain("firstthousand");
    const progress = contractProgress(
      s,
      CONTRACTS.find((c) => c.id === "firstthousand")!,
    );
    expect(progress?.value).toBe(s.peakCoins);
  });

  it("migrates known current milestones silently without guessing historical balances from lifetime earnings or grandfathered land", () => {
    const s = started();
    s.resources.coins = 1200;
    s.technologies = ["boilers"];
    s.expeditionCount = 1;
    const raw = JSON.parse(
      JSON.stringify({
        version: 2,
        economyRevision: 1,
        progressionRevision: 1,
        eventCycleLength: 7,
        state: s,
      }),
    );
    delete raw.state.firstResearch;
    delete raw.state.peakCoins;
    delete raw.state.completedContracts;
    const migrated = decodeCity(JSON.stringify(raw), 100000)!;
    expect(migrated.completedContracts).toEqual(
      expect.arrayContaining(["firstscience", "firstvoyage", "firstthousand"]),
    );
    expect(migrated.firstResearch).toBe(true);
    expect(migrated.contractCompletionId).toBe(0);
    expect(roundTrip(migrated).completedContracts).toEqual(migrated.completedContracts);
    raw.state.resources.coins = 100;
    raw.state.earned = 100000;
    raw.state.technologies = [];
    delete raw.progressionRevision;
    const older = decodeCity(JSON.stringify(raw), 100000)!;
    expect(older.unlockedPlots).toBe(4);
    expect(older.firstResearch).toBe(false);
    expect(older.completedContracts).not.toContain("firstscience");
    expect(older.completedContracts).not.toContain("firstthousand");
  });
});

describe("One contract-completion effect, separate from claiming", () => {
  it("announces actual clock completion once in StrictMode, then claims without restarting the popup or effect", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    const s = started();
    s.resources.oil = 59.2;
    s.resources.coins = 0;
    writeCity(s, 100000);
    function City() {
      const game = useCity();
      return (
        <>
          <ActionPopup
            feedback={game.state.actionFeedback}
            combo={game.state.contractCombo}
          />
          <Contracts game={game} />
          <button
            onClick={() => {
              game.act({ type: "contract", id: "crude" });
              game.act({ type: "contract", id: "crude" });
            }}
          >
            Queued claim
          </button>
        </>
      );
    }
    const ui = render(
      <StrictMode>
        <City />
      </StrictMode>,
    );
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    expect(screen.getByText("CONTRACT COMPLETE!")).toBeInTheDocument();
    const completed = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 101000)!;
    expect(completed.completedContracts).toContain("crude");
    act(() => vi.advanceTimersByTime(1250));
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Queued claim" }));
    expect(screen.getByRole("status")).toHaveTextContent("CONTRACT COMPLETE!");
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBeCloseTo(105.625);
    ui.rerender(
      <StrictMode>
        <City />
      </StrictMode>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    ui.unmount();
    const hook = renderHook(() => useCity());
    expect(hook.result.current.state.contractCompletionId).toBe(0);
    expect(hook.result.current.state.contracts).toContain("crude");
  });

  it("coalesces multiple simultaneous completions and a research green effect without replay on ordinary rerenders", () => {
    vi.useFakeTimers();
    const ui = render(
      <ActionPopup
        feedback={{ id: 1, message: "PLOT 3 UNLOCKED!", effect: "green-vignette" }}
        completionId={1}
      />,
    );
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1250));
    ui.rerender(
      <ActionPopup feedback={{ id: 2, message: "CONTRACT CLAIMED!" }} completionId={1} />,
    );
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    ui.rerender(
      <ActionPopup
        feedback={{ id: 3, message: "BAD DEAL!", effect: "red-vignette" }}
        completionId={2}
      />,
    );
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    expect(document.querySelectorAll(".failure-vignette")).toHaveLength(1);
    const s = started();
    s.firstResearch = true;
    s.expeditionCount = 1;
    s.resources.coins = 1000;
    const next = trackContractCompletions(s);
    expect(next.completedContracts).toEqual(
      expect.arrayContaining(["firstscience", "firstvoyage", "firstthousand"]),
    );
    expect(next.contractCompletionId).toBe(1);
    expect(trackContractCompletions(next).contractCompletionId).toBe(1);
  });

  it("tracks true offline progress while load of already completed objectives is silent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(102000);
    const s = started();
    s.resources.coins = 995;
    s.resources.oil = 0;
    writeCity(s, 100000);
    const hook = renderHook(() => useCity());
    expect(hook.result.current.state.completedContracts).toContain("firstthousand");
    expect(hook.result.current.state.contractCompletionId).toBe(1);
    hook.unmount();
    const loaded = renderHook(() => useCity());
    expect(loaded.result.current.state.contractCompletionId).toBe(0);
    expect(loaded.result.current.state.completedContracts).toContain("firstthousand");
  });
});

describe("Bold names", () => {
  it("bolds incomplete, locked and completed research/contracts and all expedition listings including underway", () => {
    const s = started();
    s.technologies = ["boilers"];
    s.contracts = ["gears"];
    s.expedition = { destination: 0, endsAt: 200000, choice: null };
    render(
      <>
        <Research game={gameFor(s)} />
        <Contracts game={gameFor(s)} />
        <Expeditions game={gameFor(s)} />
      </>,
    );
    for (const heading of screen.getAllByRole("heading").filter(e=>e.closest("article")))
      expect(heading).toHaveClass("font-bold");
    expect(screen.queryByRole("heading", {name:"Efficient Boilers"})).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", {name:"The Tinkers’ Guild"})).not.toBeInTheDocument();
    for (const d of DESTINATIONS)
      expect(screen.getByRole("heading", { name: d.name })).toHaveClass("font-bold");
    expect(screen.getByRole("heading", { name: "Abandoned Observatory · Underway" })).toHaveClass(
      "font-bold",
    );
  });
});
