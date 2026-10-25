import { StrictMode, useCallback } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionPopup } from "@/components/ActionPopup";
import { CityEvent } from "@/components/CityPanels";
import {
  advanceCity,
  cityAction,
  freshCity,
  trackContractCompletions,
  type CityState,
} from "@/game/city";
import { CONTRACTS, TECHNOLOGIES } from "@/game/city-config";
import { CITY_SAVE_KEY, decodeCity, writeCity } from "@/game/city-save";
import { useCity, type CityGame } from "@/hooks/useCity";

function started(): CityState {
  const s = freshCity(100000);
  return {
    ...s,
    hasBuiltOilRig: true,
    eventDue: 1e9,
    resources: { ...s.resources, gears: 0, steam: 0, oil: 0 },
  };
}
function complete(s: CityState, index: number, now: number) {
  const next = { ...s, resources: { ...s.resources } };
  switch (index) {
    case 1:
      next.firstResearch = true;
      break;
    case 2:
      next.resources.gears = 30;
      break;
    case 3:
      next.resources.oil = 60;
      break;
    case 4:
      next.resources.coins = 1000;
      break;
    case 5:
      next.expeditionCount = 1;
      break;
  }
  return trackContractCompletions(next, true, now);
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

describe("Actual contract completion combos", () => {
  it("counts completions across machines in one clock update using the same supplied wall-clock timestamp", () => {
    const s = started();
    s.resources = { ...s.resources, coins: 997.4, gears: 29.2, oil: 58 };
    s.plots[0] = { kind: "oilrig", level: 1 };
    s.plots[1] = { kind: "workshop", level: 1 };
    const next = advanceCity(s, 3, 0, 100000);
    expect(next.completedContracts).toEqual(
      expect.arrayContaining(["firstthousand", "gears", "crude"]),
    );
    expect(next.contractCombo).toMatchObject({ count: 3, completedAt: 100000 });
    expect(next.contracts).toEqual([]);
    expect(advanceCity(next, 0, 0, 100001).contractCombo).toBe(next.contractCombo);
  });

  it("counts no extra completion for research, expedition actions or reward claims unless a different objective becomes complete", () => {
    let s = complete(started(), 1, 100000);
    s.permits = ["industrial"];
    s.technologies = ["boilers"];
    s.resources = { ...s.resources, research: 50, gears: 40 };
    s = trackContractCompletions(s, false, 100000);
    const combo = s.contractCombo;
    s = cityAction(s, { type: "technology", id: "automation" }, 100100);
    expect(s.technologies).toContain("automation");
    expect(s.contractCombo).toBe(combo);
    s.expedition = { destination: 0, endsAt: 100200, choice: 1 };
    s = cityAction(s, { type: "collect" }, 100200);
    expect(s.contractCombo?.count).toBe(2);
    expect(s.completedContracts).toContain("firstvoyage");
    const voyageCombo = s.contractCombo;
    s.expedition = { destination: 0, endsAt: 100300, choice: 1 };
    s = cityAction(s, { type: "collect" }, 100300);
    expect(s.contractCombo).toBe(voyageCombo);
    s = cityAction(s, { type: "contract", id: "firstvoyage" }, 100400);
    expect(s.contractCombo).toBe(voyageCombo);
  });

  it("counts each actual objective, extends the window from the previous completion and resets at exactly two seconds", () => {
    let s = started();
    s = complete(s, 1, 1000);
    expect(s.contractCombo).toEqual({ id: 1, count: 1, completedAt: 1000 });
    s = complete(s, 2, 2999);
    expect(s.contractCombo?.count).toBe(2);
    s = complete(s, 3, 4998);
    expect(s.contractCombo?.count).toBe(3);
    s = complete(s, 4, 6997);
    expect(s.contractCombo?.count).toBe(4);
    const same = trackContractCompletions(s, true, 6998);
    expect(same.contractCombo).toBe(s.contractCombo);
    s = complete(same, 5, 8997);
    expect(s.contractCombo?.count).toBe(1);
    expect(s.completedContracts).toEqual(
      expect.arrayContaining(["firstscience", "gears", "crude", "firstthousand", "firstvoyage"]),
    );
    expect(s.contracts).toEqual([]);
  });

  it("counts simultaneous objectives individually, leaves manual rewards intact and rejects every repeated claim", () => {
    let s = started();
    s.firstResearch = true;
    s.resources.gears = 30;
    s.resources.oil = 60;
    s.resources.coins = 1000;
    s = trackContractCompletions(s, true, 100000);
    expect(s.contractCombo?.count).toBe(4);
    expect(s.contractCompletionId).toBe(1);
    const original = { ...s.resources };
    const ids = ["gears", "crude", "firstscience", "firstthousand"];
    const expected = { ...original };
    for (const id of ids) {
      const contract = CONTRACTS.find((c) => c.id === id)!;
      for (const [resource, value] of Object.entries(contract.cost))
        expected[resource as keyof typeof expected] -= value;
      for (const [resource, value] of Object.entries(contract.reward))
        expected[resource as keyof typeof expected] += value;
      s = cityAction(s, { type: "contract", id }, 100100);
      expect(s.contracts).toContain(id);
      const resources = { ...s.resources };
      const combo = s.contractCombo;
      const duplicate = cityAction(s, { type: "contract", id }, 100100);
      expect(duplicate.resources).toEqual(resources);
      expect(duplicate.contractCombo).toBe(combo);
    }
    expect(s.resources).toEqual(expected);
    // The rewards legitimately satisfy Industrial Charter, but do not claim it.
    expect(s.completedContracts).toContain("steam");
    expect(s.contracts).not.toContain("steam");
    expect(s.contractCombo?.count).toBe(5);
  });

  it("does not persist or replay the combo, but persists completions and claims", () => {
    let s = complete(started(), 1, 100000);
    s = cityAction(s, { type: "contract", id: "firstscience" }, 100001);
    expect(writeCity(s, 100001)).toBe(true);
    const raw = localStorage.getItem(CITY_SAVE_KEY)!;
    expect(JSON.parse(raw).state).not.toHaveProperty("contractCombo");
    const restored = decodeCity(raw, 100001)!;
    expect(restored.contractCombo).toBe(null);
    expect(restored.completedContracts).toContain("firstscience");
    expect(restored.contracts).toContain("firstscience");
    expect(trackContractCompletions(restored, true, 100002).contractCombo).toBe(null);
  });

  it.each(TECHNOLOGIES)(
    "uses generic research feedback only after a successful $id purchase",
    (topic) => {
      const s = started();
      s.permits = ["industrial", "aetherport"];
      s.unlockedPlots = "unlockPlot" in topic ? topic.unlockPlot - 1 : 2;
      s.technologies = topic.requires ? [topic.requires] : [];
      s.plots[0] = { kind: "steamrig", level: 3 };
      s.resources = {
        coins: 10000,
        gears: 10000,
        oil: 10000,
        research: 10000,
        steam: 255,
        crystals: 10000,
      };
      if (topic.id !== "reservoir") s.technologies.push("reservoir");
      const poor = {
        ...s,
        resources: { coins: 0, gears: 0, oil: 0, research: 0, steam: 0, crystals: 0 },
      };
      expect(cityAction(poor, { type: "technology", id: topic.id }, 100000).actionFeedback).toBe(
        null,
      );
      const next = cityAction(s, { type: "technology", id: topic.id }, 100000);
      expect(next.actionFeedback).toMatchObject({
        message: "RESEARCH COMPLETE!",
        category: "progression",
        effect: "green-vignette",
      });
      expect(next.actionFeedback?.detail).toBeUndefined();
      expect(cityAction(next, { type: "technology", id: topic.id }, 100001).actionFeedback).toBe(
        next.actionFeedback,
      );
      expect(next.contractCombo?.count).toBe(1);
    },
  );
});

describe("Shared completion popup and matching effect", () => {
  it("updates one popup and one combo edge channel through green, yellow and red without older timers hiding the latest count", () => {
    vi.useFakeTimers();
    let s = complete(started(), 1, Date.now());
    const ui = render(
      <StrictMode>
        <ActionPopup feedback={null} combo={s.contractCombo} />
      </StrictMode>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^CONTRACT COMPLETE!$/);
    expect(document.querySelectorAll("[data-contract-combo]")).toHaveLength(1);
    for (const count of [2, 3, 4, 5]) {
      act(() => vi.advanceTimersByTime(1000));
      s = complete(s, count, Date.now());
      ui.rerender(
        <StrictMode>
          <ActionPopup feedback={null} combo={s.contractCombo} />
        </StrictMode>,
      );
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getByRole("status")).toHaveTextContent(`CONTRACT COMPLETE! ${count}x`);
      const multiplier = screen.getByText(`${count}x`);
      expect(multiplier).toHaveAttribute(
        "data-color",
        count >= 4 ? "red" : count === 3 ? "yellow" : "green",
      );
      const overlays = document.querySelectorAll("[data-contract-combo]");
      expect(overlays).toHaveLength(1);
      expect(overlays[0]).toHaveClass(
        count >= 4
          ? "failure-vignette"
          : count === 3
            ? "combo-yellow-vignette"
            : "research-vignette",
      );
    }
    act(() => vi.advanceTimersByTime(1250));
    expect(document.querySelector("[data-contract-combo]")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "visible");
    act(() => vi.advanceTimersByTime(1749));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "visible");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "fading");
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    ui.rerender(
      <StrictMode>
        <ActionPopup feedback={null} combo={s.contractCombo} />
      </StrictMode>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shares a green effect with simultaneous research, stacks distinct popup cards and preserves independent negative effects", () => {
    vi.useFakeTimers();
    let s = started();
    s.resources.research = 20;
    s.resources.gears = 15;
    s = cityAction(s, { type: "technology", id: "boilers" }, Date.now());
    const ui = render(<ActionPopup feedback={s.actionFeedback} combo={s.contractCombo} />);
    expect(screen.getByText("RESEARCH COMPLETE!")).toBeInTheDocument();
    expect(screen.getByText("CONTRACT COMPLETE!")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.getAllByRole("status")[0]!.parentElement).toBe(
      screen.getAllByRole("status")[1]!.parentElement,
    );
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    expect(screen.queryByText("Efficient Boilers")).not.toBeInTheDocument();
    ui.rerender(
      <ActionPopup
        feedback={{ id: 2, message: "BAD DEAL!", effect: "red-vignette" }}
        combo={s.contractCombo}
      />,
    );
    expect(screen.getByText("BAD DEAL!")).toBeInTheDocument();
    expect(screen.getByText("CONTRACT COMPLETE!")).toBeInTheDocument();
    expect(document.querySelectorAll(".research-vignette")).toHaveLength(1);
    expect(document.querySelectorAll(".failure-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1250));
    expect(document.querySelector(".screen-vignette")).not.toBeInTheDocument();
  });

  it("waits for the newest combo before showing one unlock message and never alters interactive alerts", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    let s = complete(started(), 1, Date.now());
    s.eventActive = true;
    s.eventIndex = 1;
    const game: CityGame = {
      state: s,
      act: vi.fn(),
      reset: vi.fn(),
      loaded: true,
      saveError: false,
      now: Date.now(),
    };
    const notices = [{ id: 1, message: "NEW CONTRACTS UNLOCKED!", detail: "" }];
    const ui = render(
      <>
        <ActionPopup
          feedback={null}
          combo={s.contractCombo}
          unlockNotices={notices}
          dismissUnlock={dismiss}
        />
        <CityEvent game={game} />
      </>,
    );
    act(() => vi.advanceTimersByTime(1500));
    s = complete(s, 2, Date.now());
    ui.rerender(
      <>
        <ActionPopup
          feedback={null}
          combo={s.contractCombo}
          unlockNotices={notices}
          dismissUnlock={dismiss}
        />
        <CityEvent game={{ ...game, state: s }} />
      </>,
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText("NEW CONTRACTS UNLOCKED!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /City Alert.*merchant/ })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText("NEW CONTRACTS UNLOCKED!")).toBeInTheDocument();
    expect(screen.queryByText(/CONTRACT COMPLETE!/)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".unlock-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(2750));
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("shows the objective popup from actual production and does not restart it on claims, repeated clicks or reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    const s = started();
    s.resources.oil = 59.5;
    s.plots[0] = { kind: "oilrig", level: 1 };
    writeCity(s, 100000);
    function City() {
      const game = useCity();
      const { act: dispatch } = game;
      const dismiss = useCallback(
        (id: number) => dispatch({ type: "dismissUnlock", id }),
        [dispatch],
      );
      return (
        <>
          <ActionPopup
            feedback={game.state.actionFeedback}
            combo={game.state.contractCombo}
            unlockNotices={game.state.unlockNotices}
            dismissUnlock={dismiss}
          />
          <button
            onClick={() => {
              dispatch({ type: "contract", id: "crude" });
              dispatch({ type: "contract", id: "crude" });
            }}
          >
            Claim
          </button>
        </>
      );
    }
    const ui = render(
      <StrictMode>
        <City />
      </StrictMode>,
    );
    expect(screen.queryByText("CONTRACT COMPLETE!")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("CONTRACT COMPLETE!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(screen.getAllByText("CONTRACT COMPLETE!")).toHaveLength(1);
    expect(screen.queryByText("The Crude Awakening")).not.toBeInTheDocument();
    const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
    expect(saved.contracts).toContain("crude");
    expect(saved.resources.coins).toBeCloseTo(240);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "fading");
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText("CONTRACT COMPLETE!")).not.toBeInTheDocument();
    ui.unmount();
    render(<City />);
    expect(screen.queryByText("CONTRACT COMPLETE!")).not.toBeInTheDocument();
    expect(advanceCity(saved, 0).contractCombo).toBe(null);
  });
});
