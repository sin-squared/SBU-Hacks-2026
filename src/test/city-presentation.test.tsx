import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionPopup } from "@/components/ActionPopup";
import { Contracts, EngineProject, Expeditions, Research } from "@/components/CityPanels";
import { ResourceAmounts } from "@/components/ResourceAmounts";
import {
  activeProduction,
  actionReason,
  advanceCity,
  cityAction,
  freshCity,
  type CityState,
} from "@/game/city";
import { CONTRACTS, ENGINE_STEPS, PLOT_TECHNOLOGIES, TECHNOLOGIES } from "@/game/city-config";
import { CITY_SAVE_KEY, decodeCity, writeCity } from "@/game/city-save";
import { useCity, type CityGame } from "@/hooks/useCity";

function funded(): CityState {
  const s = freshCity(100000);
  return {
    ...s,
    hasBuiltOilRig: true,
    permits: ["industrial", "aetherport"],
    earned: 10000,
    contracts: ["gears"],
    resources: {
      coins: 10000,
      gears: 10000,
      oil: 10000,
      steam: 200,
      crystals: 10000,
      research: 10000,
    },
    plots: [{ kind: "steamrig", level: 3 }, ...Array.from({ length: 11 }, () => null)],
    blueprints: ["hull", "lens", "engine"],
    artifact: true,
    technologies: ["reservoir"],
  };
}
function gameFor(state: CityState): CityGame {
  return { state, act: vi.fn(), reset: vi.fn(), loaded: true, now: 100000, saveError: false };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("One advancing land upgrade", () => {
  it("shows only the next card, updates every price and description, then retires at twelve", () => {
    let s = funded();
    const ui = render(<Research game={gameFor(s)} />);
    for (const t of PLOT_TECHNOLOGIES) {
      const card = screen.getByRole("article", { name: "Land expansion" });
      expect(screen.getAllByRole("article", { name: "Land expansion" })).toHaveLength(1);
      expect(within(card).getByRole("heading")).toHaveTextContent(`Unlock Plot ${t.unlockPlot}`);
      expect(card).toHaveTextContent(t.name);
      expect(card).toHaveTextContent(t.description);
      expect(screen.getAllByRole("button", { name: /^Unlock Plot/ })).toHaveLength(1);
      if (t.unlockPlot < 12)
        expect(
          screen.queryByRole("button", { name: `Unlock Plot ${t.unlockPlot + 1}` }),
        ).not.toBeInTheDocument();
      for (const [key, amount] of Object.entries(t.cost))
        expect(card.querySelector(`[data-resource="${key}"]`)).toHaveTextContent(String(amount));
      const game = gameFor(s);
      ui.rerender(<Research game={game} />);
      fireEvent.click(screen.getByRole("button", { name: `Unlock Plot ${t.unlockPlot}` }));
      expect(game.act).toHaveBeenCalledExactlyOnceWith({ type: "technology", id: t.id });
      s = cityAction(s, { type: "technology", id: t.id });
      writeCity(s, 100000);
      s = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 100000)!;
      s.resources = funded().resources;
      ui.rerender(<Research game={gameFor(s)} />);
    }
    expect(screen.getByText("All plots unlocked!")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Land expansion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Unlock Plot/ })).not.toBeInTheDocument();
  });

  it("queues the displayed stage only once and announces successful research with green feedback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    writeCity(funded());
    function City() {
      const game = useCity();
      return (
        <>
          <Research game={game} />
          <ActionPopup feedback={game.state.actionFeedback} />
          <button
            onClick={() => {
              game.act({ type: "technology", id: "plot3" });
              game.act({ type: "technology", id: "plot3" });
            }}
          >
            Queued land
          </button>
        </>
      );
    }
    render(
      <StrictMode>
        <City />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Queued land" }));
    const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 100000)!;
    expect(saved.unlockedPlots).toBe(3);
    expect(saved.resources.coins).toBe(9955);
    expect(saved.resources.oil).toBe(9988);
    expect(saved.actionFeedback).toBe(null);
    expect(screen.getByRole("status")).toHaveTextContent("RESEARCH COMPLETE!");
    expect(screen.getByRole("status")).not.toHaveTextContent("A Little More Elbow Room");
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Unlock Plot 4" })).toBeEnabled();
  });
});

describe("Current production requirement indicators", () => {
  it("keeps a zero-stock producer bright but mutes stock without a producer, using the same style for icons and quantities", () => {
    const s = freshCity();
    s.plots[0] = { kind: "oilrig", level: 1 };
    const ui = render(
      <ResourceAmounts
        amounts={{ oil: 12, gears: 10 }}
        active={activeProduction(s)}
        stock={s.resources}
      />,
    );
    const oil = document.querySelector('[data-resource="oil"]')!;
    const gears = document.querySelector('[data-resource="gears"]')!;
    expect(s.resources.oil).toBe(0);
    expect(oil).toHaveAttribute("data-muted", "false");
    expect(gears).toHaveAttribute("data-muted", "true");
    expect(gears).toHaveClass("resource-requirement-muted");
    expect(gears.querySelector("svg")).toBeInTheDocument();
    expect(gears).toHaveTextContent("12/10 Gears");
    s.plots[0] = null;
    ui.rerender(<ResourceAmounts amounts={{ oil: 12 }} active={activeProduction(s)} />);
    expect(document.querySelector('[data-resource="oil"]')).toHaveAttribute("data-muted", "true");
  });

  it("uses operational state, full input checks, supplier ordering, modifiers and current rather than stale measurements", () => {
    const s = freshCity();
    s.resources.oil = 0;
    s.resources.steam = 0;
    s.plots[0] = { kind: "steamrig", level: 1 };
    expect(activeProduction(s).steam).toBe(0);
    s.plots[11] = { kind: "oilrig", level: 1 };
    expect(activeProduction(s).steam).toBeCloseTo(0.9);
    s.technologies = ["boilers", "whirr"];
    expect(activeProduction(s).steam).toBeCloseTo(0.9 * 1.5 * 1.05);
    const measured = advanceCity(s, 1);
    expect(measured.lastProduction?.output.steam).toBeGreaterThan(0);
    measured.resources.oil = 0;
    measured.damagedPlots = [11];
    expect(activeProduction(measured).oil).toBe(0);
    expect(activeProduction(measured).steam).toBe(0);
    measured.damagedPlots = [0];
    expect(activeProduction(measured).steam).toBe(0);
    expect(activeProduction(measured).oil).toBeGreaterThan(0);
    const before = JSON.stringify(measured);
    activeProduction(measured);
    expect(JSON.stringify(measured)).toBe(before);
  });

  it("does not confuse full storage with an inoperable supplier or allow one of two missing inputs", () => {
    const s = funded();
    s.plots[0] = { kind: "boiler", level: 3 };
    s.resources.steam = 255;
    expect(activeProduction(s).steam).toBeGreaterThan(0);
    s.plots[1] = { kind: "refinery", level: 1 };
    s.resources.oil = 0;
    expect(activeProduction(s).crystals).toBe(0);
    s.resources.oil = 1;
    expect(activeProduction(s).crystals).toBeGreaterThan(0);
  });

  it("shares affordability styling across research and contract requirements without applying it to rewards", () => {
    const s = funded();
    s.resources.gears = 119;
    s.plots[1] = { kind: "workshop", level: 1 };
    render(
      <>
        <Research game={gameFor(s)} />
        <Contracts game={gameFor(s)} />
      </>,
    );
    const research = screen.getByRole("heading", { name: "Efficient Boilers" }).closest("article")!;
    const delivery = screen
      .getByRole("heading", { name: "Gear Me Up, Scotty" })
      .closest("article")!;
    expect(research.querySelector('[data-resource="gears"]')).toHaveAttribute(
      "data-muted",
      "false",
    );
    expect(research.querySelector('[data-resource="research"]')).toHaveAttribute(
      "data-affordable",
      "true",
    );
    expect(
      within(delivery)
        .getByLabelText("Delivery requirements")
        .querySelector('[data-resource="gears"]'),
    ).toHaveAttribute("data-affordable", "false");
    expect(
      within(delivery)
        .getByText(/Reward:/)
        .querySelector('[data-resource="research"]'),
    ).toHaveAttribute("data-muted", "false");
  });
});

describe("Presentation and progression feedback", () => {
  it("uses larger prices, red benefits and Engine costs, yellow rewards and existing voyage timers", () => {
    const s = funded();
    s.technologies = ['boilers'];
    render(
      <>
        <Research game={gameFor(s)} />
        <Contracts game={gameFor(s)} />
        <EngineProject game={gameFor(s)} />
      </>,
    );
    for (const label of ["Research price", "Delivery requirements", "Engine price"]) {
      for (const node of screen.getAllByLabelText(label)) expect(node).toHaveClass("text-base");
    }
    expect(screen.getByText("All buildings produce and consume resources 5% faster.")).toHaveClass(
      "text-trade-cost",
    );
    for (const reward of screen.getAllByText(/Reward:/)) expect(reward).toHaveClass("text-amber");
    cleanup();
    s.expedition = { destination: 0, endsAt: 110000, choice: null };
    render(<Expeditions game={gameFor(s)} />);
    expect(screen.getByText("10 seconds remaining")).toHaveClass("text-amber");
  });

  it.each(TECHNOLOGIES)("attaches generic completion and a green effect only to successful $id research", (t) => {
    const s = funded();
    s.unlockedPlots = "unlockPlot" in t ? t.unlockPlot - 1 : 2;
    s.technologies = t.requires ? ["reservoir", t.requires] : ["reservoir"];
    if (t.id === "reservoir") s.technologies = ["boilers"];
    const poor = { ...s, resources: freshCity().resources };
    expect(cityAction(poor, { type: "technology", id: t.id }).actionFeedback).toBe(null);
    const next = cityAction(s, { type: "technology", id: t.id });
    expect(next.actionFeedback).toMatchObject({
      id: 1,
      message: 'RESEARCH COMPLETE!',
      effect: "green-vignette",
      category: "progression",
    });
    expect(cityAction(next, { type: "technology", id: t.id }).actionFeedback).toBe(
      next.actionFeedback,
    );
  });

  it("does not create an additional completion popup when a contract reward is claimed", () => {
    const s = funded();
    s.contracts = [];
    const c = CONTRACTS[0];
    expect(s.actionFeedback).toBe(null);
    const next = cityAction(s, { type: "contract", id: c.id });
    expect(next.actionFeedback).toBe(s.actionFeedback);
    expect(next.resources.coins).toBe(s.resources.coins+100);
    expect(cityAction(next, { type: "contract", id: c.id }).actionFeedback).toBe(
      next.actionFeedback,
    );
  });

  it("details actual Engine stages and victory, preserves failed-action feedback, and never applies research green", () => {
    let s = funded();
    for (let i = 0; i < ENGINE_STEPS.length; i++) {
      const next = cityAction(s, { type: "engine" });
      expect(next.engineStep).toBe(i + 1);
      expect(next.actionFeedback?.category).toBe("progression");
      expect(next.actionFeedback?.detail).toContain(
        i === 2 ? "Great Engine awakens" : ENGINE_STEPS[i]!.name,
      );
      expect(next.actionFeedback?.effect).toBeUndefined();
      s = next;
    }
    expect(s.victory).toBe(true);
    expect(cityAction(s, { type: "engine" }).actionFeedback).toBe(s.actionFeedback);
  });

  it("names permit gates consistently without removing research or blueprint prerequisites", () => {
    const s = funded();
    s.permits = [];
    expect(actionReason(s, { type: "construct", plot: 1, kind: "factory" })).toBe(
      "Industrial Permit Required",
    );
    expect(actionReason(s, { type: "construct", plot: 1, kind: "dock" })).toBe(
      "Aetherport Permit Required",
    );
    expect(actionReason(s, { type: "technology", id: "fineprint" })).toBe(
      "Industrial Permit Required",
    );
    expect(actionReason(s, { type: "contract", id: "maintenance" })).toBe(
      "Industrial Permit Required",
    );
    expect(actionReason(s, { type: "engine" })).toBe("Aetherport Permit Required");
    s.permits = ["industrial"];
    expect(actionReason(s, { type: "technology", id: "fineprint" })).toBe(
      "Requires Efficient Boilers",
    );
    s.blueprints = [];
    expect(actionReason(s, { type: "contract", id: "sky" })).toContain("hull blueprint");
  });
});

describe("Shared green and red effects", () => {
  it("holds named progression feedback for 3000ms then fades for 500ms without duplicate timers", () => {
    vi.useFakeTimers();
    const feedback = {
      id: 1,
      message: "INVENTION PERFECTED!",
      detail: "The Fine-Print Shredder",
      category: "progression" as const,
      effect: "green-vignette" as const,
    };
    const ui = render(<ActionPopup feedback={feedback} />);
    expect(screen.getByRole("status")).toHaveClass(
      "progression-popup",
      "motion-reduce:transition-none",
    );
    act(() => vi.advanceTimersByTime(1000));
    ui.rerender(<ActionPopup feedback={{ ...feedback }} />);
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(250));
    expect(document.querySelector(".research-vignette")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1749));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "visible");
    expect(screen.getByRole("status")).toHaveTextContent(feedback.detail);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "fading");
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    ui.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lets red and green finish their own lifetimes despite successive ordinary popups", () => {
    vi.useFakeTimers();
    const ui = render(
      <ActionPopup feedback={{ id: 1, message: "BAD DEAL!", effect: "red-vignette" }} />,
    );
    act(() => vi.advanceTimersByTime(400));
    ui.rerender(
      <ActionPopup feedback={{ id: 2, message: "BOILERS OPTIMIZED!", effect: "green-vignette" }} />,
    );
    const green = document.querySelector(".research-vignette")!;
    expect(green).toHaveClass("pointer-events-none", "fixed", "inset-0", "screen-vignette");
    expect(green).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelectorAll(".failure-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(850));
    expect(document.querySelector(".failure-vignette")).not.toBeInTheDocument();
    expect(green).toBeInTheDocument();
    ui.rerender(<ActionPopup feedback={{ id: 3, message: "WORKSHOP BUILT!" }} />);
    act(() => vi.advanceTimersByTime(400));
    expect(green).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    ui.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
