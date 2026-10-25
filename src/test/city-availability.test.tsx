import { StrictMode, useCallback } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionPopup } from "@/components/ActionPopup";
import { CityEvent, Contracts, Research } from "@/components/CityPanels";
import { NewContentBadge } from "@/components/NewContentBadge";
import {
  actionReason,
  advanceCity,
  availableContracts,
  availableResearch,
  cityAction,
  freshCity,
  hasAirshipDock,
  interactiveEvents,
  reconcileContent,
  type CityState,
} from "@/game/city";
import { cityEvent, CITY_EVENTS } from "@/game/city-config";
import { CITY_SAVE_KEY, decodeCity, writeCity } from "@/game/city-save";
import { useCity, type CityGame } from "@/hooks/useCity";
import { Route } from "@/routes/index";

function rich(): CityState {
  const s = freshCity(100000);
  return reconcileContent(
    {
      ...s,
      hasBuiltOilRig: true,
      unlockedPlots: 12,
      earned: 10000,
      permits: ["industrial", "aetherport"],
      contracts: ["gears"],
      resources: {
        coins: 10000,
        gears: 10000,
        steam: 200,
        oil: 10000,
        crystals: 10000,
        research: 10000,
      },
      plots: [
        { kind: "oilrig", level: 3 },
        { kind: "steamrig", level: 3 },
        ...Array.from({ length: 10 }, () => null),
      ],
      technologies: ["reservoir"],
    },
    false,
  );
}
function gameFor(state: CityState): CityGame {
  return { state, act: vi.fn(), reset: vi.fn(), now: 100000, loaded: true, saveError: false };
}
function roundTrip(s: CityState) {
  expect(writeCity(s, 100000)).toBe(true);
  const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 100000);
  expect(restored).not.toBe(null);
  return restored!;
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Two interactive city slots without a backlog", () => {
  it.each([0, 1, 2])(
    "declines merchant visit %i for no resources, trade credit, emergency credit or bonuses",
    (visit) => {
      const s = { ...rich(), eventIndex: 1 + visit * CITY_EVENTS.length, eventActive: true };
      s.technologies.push("fineprint", "bargain");
      const next = cityAction(s, { type: "declineTrade", eventIndex: s.eventIndex });
      expect(next.resources).toEqual(s.resources);
      expect(next.traderTransactions).toBe(s.traderTransactions);
      expect(next.emergenciesResolved).toBe(s.emergenciesResolved);
      expect(next.eventActive).toBe(false);
      expect(next.eventDue).toBe(s.elapsed + 15);
      expect(
        cityAction(next, { type: "declineTrade", eventIndex: s.eventIndex }).resources,
      ).toEqual(s.resources);
      expect(advanceCity(next, 14.99).eventActive).toBe(false);
    },
  );

  it("keeps two alerts visible, pauses generation and resumes after answering only the second alert", () => {
    let s = { ...rich(), eventIndex: 1, eventActive: true };
    s = advanceCity(s, 30);
    expect(interactiveEvents(s).map((e) => e.eventIndex)).toEqual([1, 2]);
    expect(s.eventCursor).toBe(3);
    expect(s.nextEventDue).toBe(null);
    expect(actionReason(s, { type: "event", eventIndex: 3, index: 0 })).toBe(
      "No active city event",
    );
    const actSpy = vi.fn();
    const ui = render(<CityEvent game={{ ...gameFor(s), act: actSpy }} />);
    expect(screen.getAllByRole("button", { name: /City Alert/ })).toHaveLength(2);
    expect(screen.queryByText(/alerts queued/)).not.toBeInTheDocument();
    const trade = screen.getAllByRole("button", { name: /City Alert/ })[0]!;
    fireEvent.click(trade);
    const merchantText = screen.getByRole("dialog").textContent;
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(actSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: /City Alert/ })[1]!);
    expect(screen.getByRole("dialog")).toHaveTextContent("Supply Shortage");
    fireEvent.click(screen.getByRole("button", { name: "Salvage Materials" }));
    expect(actSpy).toHaveBeenCalledWith({ type: "event", index: 1, eventIndex: 2 });
    const before = s.resources;
    s = cityAction(s, { type: "event", index: 1, eventIndex: 2 });
    expect(s.resources.steam).toBe(before.steam - 5);
    expect(s.resources.gears).toBe(before.gears + 6);
    expect(interactiveEvents(s).map((e) => e.eventIndex)).toEqual([1]);
    expect(interactiveEvents(advanceCity(s, 14.999)).map((e) => e.eventIndex)).toEqual([1]);
    expect(interactiveEvents(advanceCity(s, 15)).map((e) => e.eventIndex)).toEqual([1, 3]);
    expect(cityAction(s, { type: "event", index: 1, eventIndex: 2 }).resources).toEqual(
      s.resources,
    );
    ui.rerender(<CityEvent game={gameFor(s)} />);
    fireEvent.click(screen.getAllByRole("button", { name: /City Alert/ })[0]!);
    expect(screen.getByRole("dialog").textContent).toBe(merchantText);
    fireEvent.click(screen.getByRole("button", { name: "Leave It Be" }));
    expect(s.traderTransactions).toBe(0);
  });

  it("persists both visible targets and pauses all generation during offline catch-up without stopping production", () => {
    let s = advanceCity({ ...rich(), eventIndex: 5, eventDue: 0 }, 15, 0.99);
    const events = interactiveEvents(s);
    expect(events.map((e) => e.eventIndex)).toEqual([5, 6]);
    const breakdown = events.find((e) => e.eventIndex === 5)!;
    const union = events.find((e) => e.eventIndex === 6)!;
    expect(breakdown.eventPlot).not.toBe(union.eventPlot);
    expect(s.damagedPlots).toContain(breakdown.eventPlot);
    expect(actionReason(s, { type: "demolish", plot: union.eventPlot! })).toContain("union");
    const restored = roundTrip(s);
    expect(interactiveEvents(restored)).toEqual(events);
    expect(restored.damagedPlots).toEqual(s.damagedPlots);
    expect(cityEvent(restored.eventIndex)).toEqual(cityEvent(s.eventIndex));
    const later = advanceCity(restored, 7200);
    expect(interactiveEvents(later)).toEqual(events);
    expect(later.eventCursor).toBe(restored.eventCursor);
    expect(later.nextEventDue).toBe(null);
    expect(later.resources.coins).toBeGreaterThan(restored.resources.coins);
    expect(later.damagedPlots).toEqual(restored.damagedPlots);
    expect(interactiveEvents(advanceCity(later, 0))).toEqual(events);
    s = cityAction(later, { type: "event", eventIndex: 5, index: 0 });
    expect(s.eventIndex).toBe(6);
    expect(s.eventActive).toBe(true);
    expect(interactiveEvents(s).map((e) => e.eventIndex)).toEqual([6]);
    expect(advanceCity(s, 14.999).secondEvent).toBe(null);
    expect(interactiveEvents(advanceCity(s, 15)).map((e) => e.eventIndex)).toEqual([6, 7]);
    s = cityAction(s, { type: "event", eventIndex: 6, index: 0 });
    expect(advanceCity(s, 14.999).eventActive).toBe(false);
    expect(interactiveEvents(advanceCity(s, 15)).map((e) => e.eventIndex)).toEqual([7]);
    expect(roundTrip(later).secondEvent).toEqual(later.secondEvent);
    expect(JSON.parse(localStorage.getItem(CITY_SAVE_KEY)!).state).not.toHaveProperty("eventQueue");
  });

  it("processes a secondary union refusal at exactly five seconds while the original breakdown stays unresolved", () => {
    let s = advanceCity({ ...rich(), eventIndex: 5, eventActive: false, eventDue: 0 }, 15, 0.99);
    expect(interactiveEvents(s).map((e) => e.eventIndex)).toEqual([5, 6]);
    const primary = s.eventPlot;
    const worker = s.secondEvent!.eventPlot!;
    s = cityAction(s, { type: "event", eventIndex: 6, index: 1 });
    expect(s.eventIndex).toBe(5);
    expect(s.pendingWalkout?.plot).toBe(worker);
    s = roundTrip(s);
    s = advanceCity(s, 4.999);
    expect(s.plots[worker]).not.toBe(null);
    s = advanceCity(s, 0.001);
    expect(s.plots[worker]).toBe(null);
    expect(s.eventPlot).toBe(primary);
    expect(s.damagedPlots).toContain(primary);
    expect(s.actionFeedback).toMatchObject({
      message: "WORKERS HAVE WALKED!",
      effect: "red-vignette",
    });
    expect(advanceCity(s, 0).actionFeedback?.id).toBe(s.actionFeedback?.id);
  });

  it("repairs only the chosen malfunction and union prevention cancels the visible union without affecting the other alert", () => {
    let s = advanceCity({ ...rich(), eventIndex: 4, eventDue: 0 }, 15);
    expect(interactiveEvents(s).map((e) => e.eventIndex)).toEqual([4, 5]);
    const plot = s.secondEvent!.eventPlot!;
    const repaired = cityAction(s, { type: "event", eventIndex: 5, index: 0 });
    expect(repaired.damagedPlots).not.toContain(plot);
    expect(repaired.plots).toEqual(s.plots);
    expect(repaired.eventIndex).toBe(4);
    s = advanceCity(repaired, 15, 0.99);
    expect(interactiveEvents(s).some((e) => e.eventIndex === 6)).toBe(true);
    s.technologies.push("airships");
    const next = cityAction(s, { type: "technology", id: "ununionizer" });
    expect(interactiveEvents(next).map((e) => e.eventIndex)).toEqual([4]);
    expect(next.damagedPlots).toEqual(s.damagedPlots);
    expect(next.pendingWalkout).toBe(null);
    expect(roundTrip(next).secondEvent).toEqual(next.secondEvent);
    expect(next.nextEventDue).toBe(next.elapsed + 15);
  });

  it("migrates an unresolved legacy event into the two-slot scheduler and rejects malformed legacy state", () => {
    const s = { ...rich(), eventIndex: 1, eventActive: true };
    const raw = JSON.parse(
      JSON.stringify({
        version: 2,
        economyRevision: 1,
        progressionRevision: 1,
        eventCycleLength: 7,
        state: s,
      }),
    );
    delete raw.state.secondEvent;
    delete raw.state.eventCursor;
    delete raw.state.nextEventDue;
    const restored = decodeCity(JSON.stringify(raw), 100000)!;
    expect(interactiveEvents(advanceCity(restored, 15)).map((e) => e.eventIndex)).toEqual([1, 2]);
    raw.state.eventQueue = [{ eventIndex: 1, eventPlot: null }];
    expect(decodeCity(JSON.stringify(raw))).toBe(null);
  });

  it("retains the two visible legacy alerts but cancels unseen backlog without costs, rewards or stranded damage", () => {
    const s = rich();
    const before = { ...s.resources };
    const raw = {
      version: 2,
      economyRevision: 1,
      progressionRevision: 1,
      eventCycleLength: 7,
      state: {
        ...s,
        eventActive: true,
        eventIndex: 1,
        eventQueue: [
          { eventIndex: 2, eventPlot: null },
          { eventIndex: 5, eventPlot: 0 },
          { eventIndex: 6, eventPlot: 1 },
        ],
        damagedPlots: [0],
        eventCursor: 7,
        nextEventDue: 15,
        unlockNotices: [
          { id: 1, message: "NEW CONTRACTS UNLOCKED!", detail: "Contracts" },
          { id: 2, message: "NEW RESEARCH UNLOCKED!", detail: "Research" },
        ],
        unlockNoticeId: 2,
      },
    };
    const { secondEvent: unused, ...legacy } = raw.state;
    expect(unused).toBe(null);
    const migrated = decodeCity(JSON.stringify({ ...raw, state: legacy }), 100000)!;
    expect(migrated).not.toBe(null);
    expect(interactiveEvents(migrated).map((e) => e.eventIndex)).toEqual([1, 2]);
    expect(migrated.damagedPlots).toEqual([]);
    expect(migrated.plots).toEqual(s.plots);
    expect(migrated.resources).toEqual(before);
    expect(migrated.emergenciesResolved).toBe(s.emergenciesResolved);
    expect(migrated.notice).toContain("Unseen legacy alerts were cancelled");
    expect(migrated.unlockNotices).toHaveLength(1);
    expect(migrated.unlockNotices[0]?.message).toBe("NEW RESEARCH AND CONTRACTS UNLOCKED!");
    expect(interactiveEvents(advanceCity(migrated, 7200))).toEqual(interactiveEvents(migrated));
    const saved = roundTrip(migrated);
    expect(saved.secondEvent).toEqual(migrated.secondEvent);
    expect(saved.damagedPlots).toEqual([]);
  });
});

describe("Actionable-first ledger ordering", () => {
  const titles = () =>
    screen.getAllByRole("article").map((card) => card.querySelector("h3,h4")?.textContent);
  const expectPurchasableFirst = () => {
    let disabled = false;
    for (const card of screen.getAllByRole("article")) {
      const button = within(card).getByRole("button");
      if (button.hasAttribute("disabled")) disabled = true;
      else expect(disabled).toBe(false);
    }
  };
  it("immediately moves ready contracts above progress and latched-but-unaffordable deliveries, then hides a successful claim", () => {
    let s = freshCity(100000);
    s.hasBuiltOilRig = true;
    s.resources.oil = 60;
    s = cityAction(s, { type: "viewContent", category: "contracts", id: "gears" });
    const ui = render(<Contracts game={gameFor(s)} />);
    expect(titles()[0]).toBe("The Crude Awakening");
    s = { ...s, firstResearch: true };
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(titles().slice(0, 2)).toEqual(["The Crude Awakening", "Look Ma, I'm a Scientist!"]);
    s = { ...s, resources: { ...s.resources, gears: 30 } };
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(titles()[0]).toBe("The Tinkers’ Guild");
    const guild = screen.getAllByRole("article")[0]!;
    expect(within(guild).queryByLabelText("New item")).not.toBeInTheDocument();
    const dispatch = vi.fn();
    ui.rerender(<Contracts game={{ ...gameFor(s), act: dispatch }} />);
    fireEvent.click(within(guild).getByRole("button", { name: "Deliver & claim" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "contract", id: "gears" });
    s = cityAction(s, { type: "contract", id: "gears" });
    const resources = { ...s.resources };
    ui.rerender(<Contracts game={gameFor(roundTrip(s))} />);
    expect(screen.queryByRole("heading", { name: "The Tinkers’ Guild" })).not.toBeInTheDocument();
    expect(cityAction(s, { type: "contract", id: "gears" }).resources).toEqual(resources);
    s = {
      ...s,
      completedContracts: [...s.completedContracts, "crude"],
      resources: { ...s.resources, oil: 0 },
    };
    ui.rerender(<Contracts game={gameFor(s)} />);
    expect(titles()[0]).toBe("Look Ma, I'm a Scientist!");
    expectPurchasableFirst();
  });

  it("uses all actual resource requirements to reorder land and industrial research immediately, preserving keyed cards and NEW badges", () => {
    let s = rich();
    s.unlockedPlots = 2;
    s.technologies = ["boilers"];
    s = reconcileContent(s, false);
    s = { ...s, viewedResearch: ["fineprint"], resources: { ...s.resources, research: 34 } };
    const ui = render(<Research game={gameFor(s)} />);
    const before = screen
      .getByRole("heading", { name: "The Fine-Print Shredder" })
      .closest("article")!;
    const unseen = screen
      .getByRole("heading", { name: "Whirr Faster, Think Later" })
      .closest("article")!;
    expect(within(unseen).getByLabelText("New item")).toBeInTheDocument();
    expect(titles()[0]).toBe("Unlock Plot 3");
    expect(within(before).getByRole("button")).toBeDisabled();
    expect(within(before).queryByLabelText("New item")).not.toBeInTheDocument();
    s = { ...s, resources: { ...s.resources, research: 35 } };
    ui.rerender(<Research game={gameFor(s)} />);
    expectPurchasableFirst();
    expect(titles().indexOf("The Fine-Print Shredder")).toBeLessThan(
      titles().indexOf("Whirr Faster, Think Later"),
    );
    expect(
      screen.getByRole("heading", { name: "The Fine-Print Shredder" }).closest("article"),
    ).toBe(before);
    expect(within(before).queryByLabelText("New item")).not.toBeInTheDocument();
    s = { ...s, resources: { ...s.resources, oil: 0, research: 50 } };
    ui.rerender(<Research game={gameFor(s)} />);
    expectPurchasableFirst();
    expect(within(unseen).getByLabelText("New item")).toBeInTheDocument();
    expect(titles().indexOf("The Fine-Print Shredder")).toBeLessThan(
      titles().indexOf("Unlock Plot 3"),
    );
    expect(
      screen.queryByRole("heading", { name: "The Un-Unionizer 9000" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("article", { name: "Land expansion" })).toHaveLength(1);
    const expected = titles();
    ui.rerender(<Research game={gameFor(roundTrip(s))} />);
    expect(titles()).toEqual(expected);
    s = cityAction(s, { type: "technology", id: "fineprint" });
    ui.rerender(<Research game={gameFor(s)} />);
    expect(
      screen.queryByRole("heading", { name: "The Fine-Print Shredder" }),
    ).not.toBeInTheDocument();
    expectPurchasableFirst();
  });
});

describe("Single availability source and persistent discoveries", () => {
  it("hides all unmet prerequisites and claimed/purchased items, while ready unclaimed objectives remain visible", () => {
    let s = freshCity(100000);
    expect(availableContracts(s).map((c) => c.id)).toEqual([
      "gears",
      "firstscience",
      "firstthousand",
    ]);
    expect(availableResearch(s).map((t) => t.id)).toEqual(["boilers"]);
    const ui = render(
      <>
        <Contracts game={gameFor(s)} />
        <Research game={gameFor(s)} />
      </>,
    );
    expect(
      screen.queryByRole("heading", { name: "City Maintenance Initiative" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "The Fine-Print Shredder" }),
    ).not.toBeInTheDocument();
    s = cityAction(s, { type: "construct", plot: 0, kind: "oilrig" });
    expect(availableResearch(s).map((t) => t.id)).toContain("plot3");
    expect(availableContracts(s).map((c) => c.id)).toContain("crude");
    s.resources.gears = 30;
    s = cityAction(s, { type: "contract", id: "gears" });
    s.firstResearch = true;
    s.resources.research = 100;
    s.resources.gears = 100;
    ui.rerender(
      <>
        <Contracts game={gameFor(s)} />
        <Research game={gameFor(s)} />
      </>,
    );
    expect(screen.queryByRole("heading", { name: "The Tinkers’ Guild" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Look Ma, I'm a Scientist!" })).toBeInTheDocument();
    expect(availableContracts(s).map((c) => c.id)).toContain("steam");
    s = cityAction(s, { type: "technology", id: "boilers" });
    ui.rerender(<Research game={gameFor(roundTrip(s))} />);
    expect(screen.queryByRole("heading", { name: "Efficient Boilers" })).not.toBeInTheDocument();
  });

  it("combines first-Oil-Rig research and contract discoveries, never repeats on views, rejected purchases or reload", () => {
    let s = cityAction(freshCity(100000), { type: "construct", plot: 0, kind: "oilrig" });
    expect(s.unlockNotices).toHaveLength(1);
    expect(s.unlockNotices[0]?.message).toBe("NEW RESEARCH AND CONTRACTS UNLOCKED!");
    expect(s.knownResearch).toContain("plot3");
    expect(s.knownContracts).toContain("crude");
    s = cityAction(s, { type: "viewContent", category: "research", id: "plot3" });
    expect(s.viewedResearch).toContain("plot3");
    expect(s.unlockNotices).toHaveLength(1);
    s = cityAction(s, { type: "technology", id: "plot3" });
    expect(s.unlockNotices).toHaveLength(1);
    const noticeId = s.unlockNotices[0]!.id;
    s = roundTrip(s);
    expect(s.unlockNotices).toEqual([]);
    expect(s.viewedResearch).toContain("plot3");
    expect(s.knownResearch).toContain("plot3");
    expect(s.knownContracts).toContain("crude");
    s = cityAction(s, { type: "dismissUnlock", id: noticeId });
    expect(roundTrip(s).unlockNotices).toEqual([]);
    expect(reconcileContent(s).unlockNotices).toEqual([]);
  });

  it("detects contracts only, research only and combined permit progression using real successful actions", () => {
    let s = rich();
    s.permits = [];
    s.contracts = [];
    s.technologies = [];
    s.knownContracts = ["gears", "crude", "firstscience", "firstthousand"];
    s.knownResearch = ["boilers"];
    s = reconcileContent(s, false);
    const guild = cityAction(s, { type: "contract", id: "gears" });
    expect(guild.unlockNotices.at(-1)?.message).toBe("NEW CONTRACTS UNLOCKED!");
    const next = { ...rich(), technologies: [], unlockNotices: [] };
    const boilers = cityAction(next, { type: "technology", id: "boilers" });
    expect(boilers.unlockNotices.at(-1)?.message).toBe("NEW RESEARCH UNLOCKED!");
    let charter = rich();
    charter.permits = [];
    charter.technologies = ["boilers", "airships"];
    charter.blueprints = ["hull"];
    charter = reconcileContent(
      { ...charter, knownContracts: [], knownResearch: [], unlockNotices: [] },
      false,
    );
    charter = cityAction(charter, { type: "contract", id: "steam" });
    expect(charter.unlockNotices.at(-1)?.message).toBe("NEW RESEARCH AND CONTRACTS UNLOCKED!");
    const count = charter.unlockNotices.length;
    expect(cityAction(charter, { type: "contract", id: "steam" }).unlockNotices).toHaveLength(
      count,
    );
  });

  it("reveals dock-dependent contracts from the actual building and guards navigation again when it is removed", () => {
    let s = rich();
    expect(hasAirshipDock(s)).toBe(false);
    expect(availableContracts(s).map((c) => c.id)).not.toContain("firstvoyage");
    s = cityAction(s, { type: "construct", kind: "dock", plot: 2 });
    expect(hasAirshipDock(s)).toBe(true);
    expect(s.unlockNotices.at(-1)?.message).toBe("NEW CONTRACTS UNLOCKED!");
    const count = s.unlockNotices.length;
    s = cityAction(s, { type: "demolish", plot: 2 });
    expect(hasAirshipDock(s)).toBe(false);
    expect(availableContracts(s).map((c) => c.id)).not.toContain("firstvoyage");
    s = cityAction(s, { type: "construct", kind: "dock", plot: 2 });
    expect(s.unlockNotices).toHaveLength(count);
    expect(hasAirshipDock(roundTrip(s))).toBe(true);
  });

  it("only marks an individual card viewed after 50% viewport visibility for 500ms and persists that view", () => {
    vi.useFakeTimers();
    const callbacks: IntersectionObserverCallback[] = [];
    const targets: Element[][] = [];
    class Observer {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
        targets.push([]);
      }
      observe(target: Element) {
        targets.at(-1)!.push(target);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    const s = rich();
    writeCity(s, 100000);
    function City() {
      const game = useCity();
      return (
        <>
          <article data-testid="first">
            <NewContentBadge game={game} category="research" id="boilers" />
          </article>
          <article data-testid="second">
            <NewContentBadge game={game} category="research" id="plot3" />
          </article>
        </>
      );
    }
    render(<City />);
    expect(screen.getAllByLabelText("New item")).toHaveLength(2);
    act(() =>
      callbacks[0]!(
        [{ isIntersecting: true, intersectionRatio: 0.49 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getAllByLabelText("New item")).toHaveLength(2);
    act(() =>
      callbacks[0]!(
        [{ isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    act(() => vi.advanceTimersByTime(499));
    expect(screen.getAllByLabelText("New item")).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(within(screen.getByTestId("first")).queryByText("NEW")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("second")).getByText("NEW")).toBeInTheDocument();
    const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
    expect(restored.viewedResearch).toContain("boilers");
    expect(restored.viewedResearch).not.toContain("plot3");
    expect(targets.flat()).toHaveLength(2);
  });

  it("cancels NEW acknowledgement when a card leaves view or its tab is hidden and does not re-badge viewed items", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    const state = rich();
    let notify: IntersectionObserverCallback = () => {};
    class Observer {
      constructor(cb: IntersectionObserverCallback) {
        notify = cb;
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const entry = (visible: boolean) =>
      act(() =>
        notify(
          [
            {
              isIntersecting: visible,
              intersectionRatio: visible ? 1 : 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        ),
      );
    const ui = render(
      <article>
        <NewContentBadge
          game={{ ...gameFor(state), act: dispatch }}
          category="research"
          id="boilers"
        />
      </article>,
    );
    entry(true);
    act(() => vi.advanceTimersByTime(499));
    entry(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(dispatch).not.toHaveBeenCalled();
    visibility.mockReturnValue("hidden");
    entry(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(dispatch).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(500));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "viewContent",
      category: "research",
      id: "boilers",
    });
    const viewed = cityAction(state, { type: "viewContent", category: "research", id: "boilers" });
    ui.rerender(
      <article>
        <NewContentBadge game={gameFor(roundTrip(viewed))} category="research" id="boilers" />
      </article>,
    );
    expect(screen.queryByLabelText("New item")).not.toBeInTheDocument();
  });

  it("does not use permissions, a damaged dock, or out-of-bounds plots incorrectly for Dock navigation", () => {
    const s = rich();
    s.plots[11] = { kind: "dock", level: 1 };
    s.unlockedPlots = 2;
    expect(hasAirshipDock(s)).toBe(false);
    s.plots[1] = { kind: "dock", level: 1 };
    s.damagedPlots = [1];
    expect(hasAirshipDock(s)).toBe(true);
    expect(actionReason(s, { type: "launch", index: 0 })).toBe(
      "Restore an operating Airship Dock first",
    );
  });

  it("silently baselines older saves and rejects stale notice acknowledgements and invalid queue ordering", () => {
    const s = rich();
    writeCity(s, 100000);
    const raw = JSON.parse(localStorage.getItem(CITY_SAVE_KEY)!);
    for (const key of [
      "knownResearch",
      "knownContracts",
      "viewedResearch",
      "viewedContracts",
      "unlockNotices",
      "unlockNoticeId",
    ])
      delete raw.state[key];
    const restored = decodeCity(JSON.stringify(raw), 100000)!;
    expect(reconcileContent(restored).unlockNotices).toEqual([]);
    let unlocked = cityAction(freshCity(100000), { type: "construct", kind: "oilrig", plot: 0 });
    unlocked = { ...unlocked, resources: { ...unlocked.resources, coins: 1000, oil: 100 } };
    unlocked = cityAction(unlocked, { type: "technology", id: "plot3" });
    expect(unlocked.unlockNotices).toHaveLength(1);
    expect(unlocked.unlockNotices[0]?.id).toBe(2);
    expect(unlocked.unlockNotices[0]?.message).toBe("NEW RESEARCH AND CONTRACTS UNLOCKED!");
    expect(cityAction(unlocked, { type: "dismissUnlock", id: 1 }).unlockNotices).toEqual(
      unlocked.unlockNotices,
    );
    const acknowledged = cityAction(unlocked, { type: "dismissUnlock", id: 2 });
    expect(acknowledged.unlockNotices).toEqual([]);
    expect(cityAction(acknowledged, { type: "dismissUnlock", id: 1 }).unlockNotices).toEqual(
      acknowledged.unlockNotices,
    );
    raw.state.eventActive = true;
    raw.state.eventIndex = 1;
    delete raw.state.secondEvent;
    raw.state.eventQueue = [
      { eventIndex: 3, eventPlot: null },
      { eventIndex: 2, eventPlot: null },
    ];
    expect(decodeCity(JSON.stringify(raw), 100000)).toBe(null);
  });
});

describe("Coalesced unlock popup and blue effect", () => {
  it("holds new-content notifications exactly 1000ms longer than the 1250ms standard and fades 500ms", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    render(
      <ActionPopup
        feedback={null}
        unlockNotices={[{ id: 1, message: "NEW CONTRACTS UNLOCKED!", detail: "Contracts" }]}
        dismissUnlock={dismiss}
      />,
    );
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("status")).toHaveTextContent("NEW CONTRACTS UNLOCKED!");
    const blue = document.querySelector(".unlock-vignette")!;
    expect(blue).toHaveClass("screen-vignette", "pointer-events-none");
    expect(blue).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(1250));
    expect(blue).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "visible");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "fading");
    act(() => vi.advanceTimersByTime(500));
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("preserves the action popup and displays one combined unlock announcement without stale dismissal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    writeCity(freshCity(100000), 100000);
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
            unlockNotices={game.state.unlockNotices}
            dismissUnlock={dismiss}
          />
          <button onClick={() => game.act({ type: "construct", kind: "oilrig", plot: 0 })}>
            Build
          </button>
        </>
      );
    }
    render(<City />);
    fireEvent.click(screen.getByRole("button", { name: "Build" }));
    expect(screen.getByRole("status")).toHaveTextContent("OIL RIG ONLINE!");
    expect(document.querySelector(".unlock-vignette")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1750));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("NEW RESEARCH AND CONTRACTS UNLOCKED!");
    expect(document.querySelectorAll(".unlock-vignette")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(2750));
    expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.unlockNotices).toEqual([]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("pauses an unlock announcement for newer action feedback without replaying its blue effect", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const notices = [{ id: 1, message: "NEW RESEARCH UNLOCKED!", detail: "" }];
    const ui = render(
      <ActionPopup feedback={null} unlockNotices={notices} dismissUnlock={dismiss} />,
    );
    act(() => vi.advanceTimersByTime(0));
    act(() => vi.advanceTimersByTime(1250));
    expect(document.querySelector(".unlock-vignette")).not.toBeInTheDocument();
    ui.rerender(
      <ActionPopup
        feedback={{ id: 3, message: "BAD DEAL!", effect: "red-vignette" }}
        unlockNotices={notices}
        dismissUnlock={dismiss}
      />,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("BAD DEAL!");
    act(() => vi.advanceTimersByTime(1750));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("NEW RESEARCH UNLOCKED!");
    expect(document.querySelector(".unlock-vignette")).not.toBeInTheDocument();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("keeps blue, green and red effects independent and acknowledges separate announcements exactly once in Strict Mode", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const notices = [
      { id: 1, message: "NEW CONTRACTS UNLOCKED!", detail: "" },
      { id: 2, message: "NEW RESEARCH UNLOCKED!", detail: "" },
    ];
    const ui = render(
      <StrictMode>
        <ActionPopup feedback={null} unlockNotices={notices.slice(0, 1)} dismissUnlock={dismiss} />
      </StrictMode>,
    );
    act(() => vi.advanceTimersByTime(0));
    act(() => vi.advanceTimersByTime(500));
    ui.rerender(
      <StrictMode>
        <ActionPopup
          feedback={{ id: 9, message: "BAD DEAL!", effect: "red-vignette" }}
          completionId={1}
          unlockNotices={notices.slice(0, 1)}
          dismissUnlock={dismiss}
        />
      </StrictMode>,
    );
    for (const color of ["unlock", "research", "failure"])
      expect(document.querySelectorAll(`.${color}-vignette`)).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1750));
    act(() => vi.advanceTimersByTime(2750));
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(1);
    ui.rerender(
      <StrictMode>
        <ActionPopup feedback={null} unlockNotices={notices.slice(1)} dismissUnlock={dismiss} />
      </StrictMode>,
    );
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("status")).toHaveTextContent("NEW RESEARCH UNLOCKED!");
    act(() => vi.advanceTimersByTime(2750));
    expect(dismiss.mock.calls).toEqual([[1], [2]]);
  });
});

describe("Actual Expeditions navigation", () => {
  it("looks locked but accepts a click to explain the actual Dock requirement, and enables only after a saved dock exists", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    const Index = Route.options.component;
    if (!Index) throw new Error("Missing dashboard component");
    let s = rich();
    writeCity(s, 100000);
    const ui = render(<Index />);
    const tab = screen.getByRole("button", { name: /Expeditions Locked/ });
    expect(tab).toHaveAttribute("aria-disabled", "true");
    expect(tab).not.toBeDisabled();
    fireEvent.click(tab);
    expect(screen.getByText("AIRSHIP DOCK REQUIRED!")).toBeInTheDocument();
    expect(
      screen.getByText("You need to unlock the Airship Dock on a plot first."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Abandoned Observatory" }),
    ).not.toBeInTheDocument();
    ui.unmount();
    s = cityAction(s, { type: "construct", kind: "dock", plot: 2 });
    writeCity(s, 100000);
    render(<Index />);
    const enabled = screen.getByRole("button", { name: "Expeditions" });
    expect(enabled).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(enabled);
    expect(screen.getByRole("heading", { name: "Abandoned Observatory" })).toBeInTheDocument();
  });
});
