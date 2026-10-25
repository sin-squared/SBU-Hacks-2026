import { afterEach, describe, expect, it, vi } from 'vitest';
import { cityAction, freshCity, reconcileContent, trackContractCompletions, type CityState } from '@/game/city';
import { CITY_EVENTS, DESTINATIONS, PLOT_TECHNOLOGIES } from '@/game/city-config';
import { CITY_SAVE_KEY, decodeCity, readCity, writeCity } from '@/game/city-save';

const transientKeys = [
  'actionFeedback', 'contractCombo', 'lastProduction', 'unlockNotices',
  'contractCompletionId', 'unlockNoticeId', 'notice', 'victory',
];

function progressed(): CityState {
  const s = freshCity(100000);
  return reconcileContent(trackContractCompletions({
    ...s,
    resources: { coins: 1234, gears: 250, steam: 75, oil: 500, crystals: 40, research: 300 },
    earned: 9000,
    plots: [
      { kind: 'oilrig', level: 3 },
      { kind: 'boiler', level: 2 },
      { kind: 'workshop', level: 2 },
      ...Array.from({ length: 8 }, () => null),
      { kind: 'dock', level: 1 },
    ],
    unlockedPlots: 12,
    hasBuiltOilRig: true,
    contracts: ['gears', 'steam'],
    completedContracts: ['gears', 'steam'],
    firstResearch: true,
    peakCoins: 5000,
    permits: ['industrial', 'aetherport'],
    technologies: ['boilers', 'automation', 'airships', ...PLOT_TECHNOLOGIES.map(t => t.id)],
    blueprints: ['hull', 'lens', 'engine'],
    artifact: true,
    expedition: { destination: 2, endsAt: 200000, choice: 0 },
    expeditionCount: 4,
    engineStep: 3,
    victory: true,
    eventIndex: 12,
    eventActive: true,
    eventPlot: 0,
    damagedPlots: [0],
    secondEvent: { eventIndex: 13, eventPlot: 1 },
    eventCursor: 14,
    nextEventDue: null,
    pendingWalkout: { plot: 2, eventIndex: 6, dueAt: 605 },
    shortageSeconds: 10,
    emergenciesResolved: 7,
    traderTransactions: 5,
    elapsed: 600,
    eventDue: 590,
    demo: true,
    viewedResearch: ['boilers'],
    viewedContracts: ['gears'],
  }, false), false);
}

function save(s: CityState, now = 100000) {
  expect(writeCity(s, now)).toBe(true);
  return JSON.parse(localStorage.getItem(CITY_SAVE_KEY)!);
}

function expectNoTransient(value: unknown) {
  if (value === null || typeof value !== 'object') return;
  for (const key of transientKeys) expect(Object.hasOwn(value, key), key).toBe(false);
  for (const child of Object.values(value)) expectNoTransient(child);
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Explicit city save payload', () => {
  it('omits populated runtime fields entirely and reconstructs fresh runtime defaults', () => {
    const s = progressed();
    s.actionFeedback = { id: 9, message: 'Temporary feedback' };
    s.contractCombo = { id: 8, count: 3, completedAt: 99999 };
    s.contractCompletionId = 8;
    s.lastProduction = { output: s.resources, input: s.resources, seconds: 1, paused: [] };
    s.unlockNotices = [{ id: 7, message: 'NEW RESEARCH UNLOCKED!', detail: 'Temporary popup' }];
    s.unlockNoticeId = 7;
    s.notice = 'Temporary notice';
    const raw = save(s, 100001);
    expectNoTransient(raw);
    expect(raw).toMatchObject({
      version: 2, economyRevision: 1, progressionRevision: 1,
      eventCycleLength: CITY_EVENTS.length, state: { lastSaved: 100001 },
    });
    const restored = decodeCity(JSON.stringify(raw), 100001)!;
    expect(restored).not.toBe(null);
    expect(restored.actionFeedback).toBe(null);
    expect(restored.contractCombo).toBe(null);
    expect(restored.lastProduction).toBe(null);
    expect(restored.unlockNotices).toEqual([]);
    expect(restored.contractCompletionId).toBe(0);
    expect(restored.unlockNoticeId).toBe(0);
    expect(restored.notice).not.toBe(s.notice);
    expect(restored.victory).toBe(true);
    expect(s.actionFeedback.id).toBe(9);
    expect(s.lastSaved).toBe(100000);
  });

  it('allows only approved fields, including inside nested gameplay objects', () => {
    const s = progressed();
    Object.assign(s, { futureRuntimeField: 'temporary' });
    for (const nested of [s.resources, s.plots[0], s.expedition, s.secondEvent, s.pendingWalkout]) {
      Object.assign(nested!, {
        actionFeedback: { id: 42, message: 'Nested feedback' },
        contractCombo: {}, lastProduction: {}, unlockNotices: [], futureRuntimeField: 'temporary',
      });
    }
    const raw = save(s);
    expectNoTransient(raw);
    expect(JSON.stringify(raw)).not.toContain('futureRuntimeField');
    expect(raw.state.plots[0]).toEqual({ kind: 'oilrig', level: 3 });
    expect(raw.state.expedition).toEqual({ destination: 2, endsAt: 200000, choice: 0 });
    expect(raw.state.secondEvent).toEqual({ eventIndex: 13, eventPlot: 1 });
    expect(raw.state.pendingWalkout).toEqual({ plot: 2, eventIndex: 6, dueAt: 605 });
  });

  it('preserves all durable fields through repeated save/load cycles without replaying claims', () => {
    let s = progressed();
    const expected = Object.fromEntries(
      Object.entries(s).filter(([key]) => !transientKeys.includes(key)),
    );
    for (let cycle = 0; cycle < 5; cycle++) {
      const raw = save(s);
      expectNoTransient(raw);
      expect(raw.state).toEqual(expected);
      s = readCity();
      expect(s).toMatchObject(expected);
      expect(s.unlockNotices).toEqual([]);
      expect(s.contractCombo).toBe(null);
      const duplicate = cityAction(s, { type: 'contract', id: 'gears' });
      expect(duplicate.resources).toEqual(s.resources);
      expect(duplicate.contracts).toEqual(s.contracts);
    }
  });

  it('retains expedition rewards after collection without allowing duplicate collection', () => {
    const s = progressed();
    save(s);
    const collected = cityAction(readCity(), { type: 'collect' }, 200000);
    expect(collected.expedition).toBe(null);
    expect(collected.expeditionCount).toBe(5);
    expect(collected.resources.crystals).toBe(s.resources.crystals + DESTINATIONS[2].reward.crystals);
    save(collected);
    const restored = readCity();
    expect(restored.resources).toEqual(collected.resources);
    expect(restored.blueprints).toEqual(collected.blueprints);
    expect(restored.artifact).toBe(true);
    expect(cityAction(restored, { type: 'collect' }, 200000).resources).toEqual(restored.resources);
  });

  it('migrates pre-revision version-2 saves without losing balances, buildings or progression', () => {
    const old = {
      version: 2,
      state: {
        resources: { coins: 650, gears: 40, steam: 15, crystals: 3, research: 20 },
        earned: 2000,
        plots: [{ kind: 'workshop', level: 2 }],
        contracts: ['gears'], permits: ['industrial'], technologies: ['boilers'],
        blueprints: ['hull'], expeditionCount: 2, engineStep: 1,
        eventIndex: 7, eventActive: true,
      },
    };
    const migrated = decodeCity(JSON.stringify(old), 100000)!;
    expect(migrated).toMatchObject({
      resources: { ...old.state.resources, oil: 0 }, earned: 2000,
      contracts: ['gears'], permits: ['industrial'], blueprints: ['hull'],
      expeditionCount: 2, engineStep: 1, unlockedPlots: 8, hasBuiltOilRig: true,
      eventIndex: 8, eventActive: true,
    });
    expect(migrated.plots[0]).toEqual(old.state.plots[0]);
    const raw = save(migrated);
    expectNoTransient(raw);
    expect(decodeCity(JSON.stringify(raw), 100000)).toMatchObject(raw.state);
  });

  it('migrates legacy coin saves and retains the migrated progress on subsequent saves', () => {
    localStorage.setItem('brasshaven-save-v1', JSON.stringify({
      coins: 789, lifetimeCoins: 4567,
      owned: { workshop: 1, bakery: 1, factory: 1, airship: 1 },
      unlockedDistricts: ['industrial', 'aetherport'],
    }));
    const migrated = readCity();
    expect(migrated.resources.coins).toBe(789);
    expect(migrated.earned).toBe(4567);
    expect(migrated.unlockedPlots).toBe(12);
    expect(migrated.plots.slice(0, 4).map(plot => plot?.kind)).toEqual([
      'workshop', 'bakery', 'factory', 'dock',
    ]);
    const raw = save(migrated);
    expectNoTransient(raw);
    expect(readCity()).toMatchObject(raw.state);
  });

  it('reports storage failures without claiming the save succeeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(writeCity(progressed())).toBe(false);
  });
});
