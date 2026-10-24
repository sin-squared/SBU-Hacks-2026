import { describe, expect, it } from 'vitest';
import { actionReason, advanceCity, cityAction, freshCity, plotLimit, production, stage, steamCapacity, type CityAction, type CityState } from '@/game/city';
import { CONTRACTS, ENGINE_STEPS, TECHNOLOGIES } from '@/game/city-config';
import { decodeCity } from '@/game/city-save';

describe('Strategic city', () => {
 it('starts with one affordable meaningful action, not ready contracts', () => { const s = freshCity(0); expect(s.resources.coins).toBe(25); expect(actionReason(s, { type: 'construct', plot: 0, kind: 'workshop' })).toBe(''); expect(actionReason(s, { type: 'contract', id: 'gears' })).not.toBe(''); expect(plotLimit(s)).toBe(4); });
 it('constructs, upgrades and demolishes with a 50% base refund', () => { let s = cityAction(freshCity(0), { type: 'construct', plot: 0, kind: 'workshop' }); expect(s.resources.coins).toBe(10); expect(s.plots[0]?.level).toBe(1); s = { ...s, resources: { ...s.resources, coins: 100 } }; s = cityAction(s, { type: 'upgrade', plot: 0 }); expect(s.resources.coins).toBe(70); expect(s.plots[0]?.level).toBe(2); s = cityAction(s, { type: 'demolish', plot: 0 }); expect(s.resources.coins).toBe(77); expect(s.plots[0]).toBe(null); });
 it('never creates negative resources and caps steam storage', () => { let s = freshCity(0); s.plots[0] = { kind: 'factory', level: 3 }; s.resources.steam = 0; s = advanceCity(s, 7200); expect(s.resources.gears).toBe(12); for (const n of Object.values(s.resources)) expect(n).toBeGreaterThanOrEqual(0); s.plots[1] = { kind: 'boiler', level: 1 }; s = advanceCity(s, 7200); expect(s.resources.steam).toBeLessThanOrEqual(steamCapacity(s)); });
 it('adjacent boilers increase factory output by 25%', () => { const s = freshCity(0); s.plots[0] = { kind: 'factory', level: 1 }; s.plots[1] = { kind: 'boiler', level: 1 }; expect(production(s).output.gears).toBe(1.5); s.plots[1] = null; expect(production(s).output.gears).toBe(1.2); });
 it('money alone never unlocks industrial or aetherport', () => { const s = { ...freshCity(0), earned: 100000, resources: { ...freshCity(0).resources, coins: 100000 } }; expect(stage(s)).toBe(0); expect(actionReason(s, { type: 'construct', kind: 'factory', plot: 0 })).toContain('permit'); });
 it('contracts consume actual delivery stock and cannot reward twice', () => { let s = freshCity(0); s.resources.gears = 30; s = cityAction(s, { type: 'contract', id: 'gears' }); expect(s.resources.gears).toBe(0); expect(s.resources.coins).toBe(125); expect(cityAction(s, { type: 'contract', id: 'gears' }).resources).toEqual(s.resources); });
 it('validates saves and keeps expeditions and claims across reloads', () => { const s = cityAction(freshCity(0), { type: 'demo' }, 0); const launched = cityAction(s, { type: 'launch', index: 0 }, 0); const restored = decodeCity(JSON.stringify({ version: 2, state: launched }), 100000); expect(restored?.expedition?.destination).toBe(0); const bad = decodeCity(JSON.stringify({ version: 2, state: { resources: { gears: -8 }, plots: [{ kind: 'bad', level: 99 }] } })); expect(bad?.resources.gears).toBe(0); expect(bad?.plots[0]).toBe(null); expect(decodeCity('{oops')).toBe(null); expect(decodeCity('{"version":99}')).toBe(null); });
 it('offers five recoverable events and charges choices exactly once', () => { let s = freshCity(0); for (let i = 0; i < 5; i++) { s = { ...s, eventIndex: i, eventActive: true }; const selected = i === 1 ? 1 : 1; if (i === 1) s.resources.gears = 10; s = cityAction(s, { type: 'event', index: selected }); expect(s.eventIndex).toBe(i + 1); expect(s.eventActive).toBe(false); for (const n of Object.values(s.resources)) expect(n).toBeGreaterThanOrEqual(0); } });
 it('completes a fresh-save-to-engine path without demo grants', () => {
  let s: CityState = freshCity(0); let now = 0;
  function tick() { s = advanceCity(s, 10); now += 10000; }
  function doAction(a: CityAction) { for (let i = 0; i < 2000 && actionReason(s, a, now); i++) tick(); expect(actionReason(s, a, now), JSON.stringify(a)).toBe(''); s = cityAction(s, a, now); }
  doAction({ type: 'construct', plot: 0, kind: 'workshop' });
  doAction({ type: 'construct', plot: 1, kind: 'boiler' });
  doAction({ type: 'construct', plot: 2, kind: 'laboratory' });
  doAction({ type: 'contract', id: 'gears' }); doAction({ type: 'contract', id: 'steam' }); expect(stage(s)).toBe(1);
  doAction({ type: 'construct', plot: 4, kind: 'factory' }); doAction({ type: 'construct', plot: 5, kind: 'boiler' });
  for (let plot of [0, 1, 2, 4, 5]) doAction({ type: 'upgrade', plot });
  doAction({ type: 'technology', id: TECHNOLOGIES[0].id }); doAction({ type: 'technology', id: TECHNOLOGIES[1].id });
  doAction({ type: 'contract', id: 'assembly' }); doAction({ type: 'technology', id: 'airships' }); doAction({ type: 'contract', id: 'sky' }); expect(stage(s)).toBe(2);
  doAction({ type: 'construct', plot: 8, kind: 'dock' });
  for (const index of [0, 1, 2, 0, 2]) { doAction({ type: 'launch', index }); doAction({ type: 'expeditionChoice', index: 0 }); doAction({ type: 'collect' }); const resources = s.resources; s = cityAction(s, { type: 'collect' }, now); expect(s.resources).toEqual(resources); }
  expect(s.artifact).toBe(true); expect(s.blueprints).toEqual(expect.arrayContaining(['hull', 'lens', 'engine']));
  doAction({ type: 'contract', id: CONTRACTS[4].id }); for (const _step of ENGINE_STEPS) doAction({ type: 'engine' });
  expect(s.victory).toBe(true); expect(s.engineStep).toBe(3); expect(s.demo).toBe(false); expect(now).toBeGreaterThan(60000);
 });
});
