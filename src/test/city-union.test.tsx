import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPopup } from '@/components/ActionPopup';
import { CityManagement } from '@/components/CityManagement';
import { CityEvent } from '@/components/CityPanels';
import { BALANCE, CITY_EVENTS, cityEvent, UNION } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, freshCity, production, steamCapacity, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity, type CityGame } from '@/hooks/useCity';

const unionIndex = CITY_EVENTS.findIndex(e => 'id' in e && e.id === 'worker-union');
function workplace(): CityState {
 const s = freshCity(100000);
 s.plots[0] = { kind: 'workshop', level: 1 };
 s.resources.coins = 500;
 return { ...s, hasBuiltOilRig: true, elapsed: 20, eventDue: 20, eventIndex: unionIndex };
}
function pending() { return advanceCity(workplace(), 0, 0); }
function choose(s: CityState, index: number) { return cityAction(s, { type: 'event', index, eventIndex: s.eventIndex }, 100000); }
function gameFor(state: CityState): CityGame { return { state, loaded: true, now: 100000, saveError: false, act: vi.fn(), reset: vi.fn() }; }
function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback}/><CityManagement game={game}/><CityEvent game={game}/></>; }
function open() { fireEvent.click(screen.getByRole('button', { name: /City Alert/ })); }
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Worker Union activation and choices', () => {
 it('appends one union event without changing existing event order or timing', () => {
  expect(unionIndex).toBe(6);
  expect(CITY_EVENTS.filter(e => 'id' in e && e.id === 'worker-union')).toHaveLength(1);
  expect(BALANCE.eventInterval).toBe(15);
 });

 it.each([0, .99])('selects only an operating workplace and keeps it stable (roll %f)', roll => {
  const s = workplace();
  s.plots[1] = { kind: 'factory', level: 1 };
  s.plots[2] = { kind: 'boiler', level: 1 };
  s.damagedPlots = [1, 2];
  const next = advanceCity(s, 0, roll);
  expect(next.eventActive).toBe(true);
  expect(next.eventPlot).toBe(0);
  expect(next.damagedPlots).toEqual([1, 2]);
  expect(advanceCity(next, 10, 1 - roll).eventPlot).toBe(0);
  expect(production(next).output.gears).toBe(.45);
 });

 it('skips without progress if there is no operating workplace', () => {
  const s = workplace();
  s.plots[0] = null;
  const next = advanceCity(s, 0);
  expect(next.eventActive).toBe(false);
  expect(next.eventIndex).toBe(unionIndex + 1);
  expect(next.emergenciesResolved).toBe(0);
  expect(next.notice).toContain('no operating production buildings');
 });

 it('shows the workplace and 200-coin payment without consequence descriptions, rewards or timing', () => {
  const game = gameFor(pending());
  render(<CityEvent game={game}/>);
  expect(screen.getByRole('button', { name: /City Alert/ })).toHaveTextContent('Clockwork Workshop on plot 1');
  open();
  const panel = screen.getByRole('dialog');
  expect(panel).toHaveTextContent('WORKERS DEMAND FAIR WAGES');
  expect(panel).toHaveTextContent('200 Brass Coins');
  expect(panel).not.toHaveTextContent(/Consequence:|Reward:|rehire|countdown|5 seconds|five seconds/i);
  const payment = screen.getByRole('button', { name: 'Pay the Union' }).parentElement!;
  expect(payment).toHaveTextContent('Cost: 200 Brass Coins');
  expect(payment).not.toHaveTextContent(/prevent|continues operating|walkout/i);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(game.act).not.toHaveBeenCalled();
  expect(game.state.eventActive).toBe(true);
  expect(game.state.pendingWalkout).toBe(null);
 });

 it('pays 200 coins once, preserves the building and counts a successfully resolved emergency', () => {
  const s = pending();
  const next = choose(s, 0);
  expect(next.resources.coins).toBe(300);
  expect(next.pendingWalkout).toBe(null);
  expect(next.plots).toEqual(s.plots);
  expect(next.emergenciesResolved).toBe(1);
  expect(next.actionFeedback).toMatchObject({ message: 'WORKERS PAID!', quote: 'Fair wages keep engines turning.' });
  const later = advanceCity(next, 10);
  expect(later.resources.gears - s.resources.gears).toBeCloseTo(4.5);
  expect(later.plots).toEqual(s.plots);
  const duplicate = cityAction(later, { type: 'event', index: 0, eventIndex: unionIndex });
  expect(duplicate.resources).toEqual(later.resources);
  expect(duplicate.emergenciesResolved).toBe(1);
 });

 it('rejects unaffordable wages with no success feedback', () => {
  const s = pending();
  s.resources.coins = UNION.wages - 1;
  render(<CityEvent game={gameFor(s)}/>);
  open();
  expect(screen.getByRole('button', { name: 'Pay the Union' })).toBeDisabled();
  expect(screen.getByRole('dialog')).toHaveTextContent('Need 1 Brass Coins');
  expect(choose(s, 0)).toMatchObject({ resources: s.resources, actionFeedback: null, eventActive: true, pendingWalkout: null });
 });

 it('refuses for free, then stops production at exactly five game seconds, including fractional steps', () => {
  const s = pending();
  const refused = choose(s, 1);
  expect(refused.resources).toEqual(s.resources);
  expect(refused.emergenciesResolved).toBe(0);
  expect(refused.pendingWalkout).toEqual({ plot: 0, dueAt: 25, eventIndex: unionIndex });
  expect(refused.actionFeedback).toMatchObject({ message: 'WAGES WITHHELD!', quote: 'You cannot silence the workers.' });
  const almost = advanceCity(refused, 4.75);
  expect(almost.plots[0]).toEqual(s.plots[0]);
  expect(almost.actionFeedback).toBe(refused.actionFeedback);
  const walked = advanceCity(almost, .25);
  expect(walked.pendingWalkout).toBe(null);
  expect(walked.plots[0]).toBe(null);
  expect(walked.resources.coins - s.resources.coins).toBeCloseTo(.3 * 5);
  expect(walked.earned - s.earned).toBeCloseTo(.3 * 5);
  expect(walked.resources.gears - s.resources.gears).toBeCloseTo(.45 * 5);
  expect(walked.actionFeedback).toEqual({ id: 2, message: 'WORKERS HAVE WALKED!', quote: 'No wages, no work.', category: 'walkout', effect: 'red-vignette' });
  expect(production(walked).output.gears).toBe(0);
  const later = advanceCity(walked, 10);
  expect(later.resources).toEqual(walked.resources);
  expect(later.actionFeedback).toBe(walked.actionFeedback);
  const offline = advanceCity(refused, 60);
  expect(offline.resources.coins).toBeCloseTo(walked.resources.coins);
  expect(offline.resources.gears).toBeCloseTo(walked.resources.gears);
 });

 it('does not reschedule on duplicate refusal, unrelated actions or an intervening popup', () => {
  const refused = advanceCity(choose(pending(), 1), 2);
  const duplicate = cityAction(refused, { type: 'event', index: 1, eventIndex: unionIndex });
  expect(duplicate.pendingWalkout).toBe(refused.pendingWalkout);
  const other = cityAction(duplicate, { type: 'construct', kind: 'oilrig', plot: 1 });
  expect(other.actionFeedback?.message).toBe('OIL RIG ONLINE!');
  const walked = advanceCity(other, 3);
  expect(walked.actionFeedback).toMatchObject({ id: 3, message: 'WORKERS HAVE WALKED!' });
  expect(walked.plots[0]).toBe(null);
  expect(advanceCity(walked, 0).actionFeedback).toBe(walked.actionFeedback);
 });

 it('keeps the disputed building in place until the delayed consequence is processed', () => {
  for (const s of [pending(), choose(pending(), 1)]) {
   for (const type of ['upgrade', 'demolish'] as const) {
    const action = { type, plot: 0 };
    expect(actionReason(s, action)).toBe('Resolve the union dispute first');
    expect(cityAction(s, action).plots).toEqual(s.plots);
   }
  }
 });
});

describe('Property loss and production integration', () => {
 it('loses the building without refunds and allows rebuilding without a repeated walkout', () => {
  const walked = advanceCity(choose(pending(), 1), 5);
  expect(walked.resources.coins).toBeCloseTo(501.5);
  expect(walked.emergenciesResolved).toBe(0);
  expect(walked.plots[0]).toBe(null);
  const rebuilt = cityAction(walked, { type: 'construct', plot: 0, kind: 'workshop' });
  expect(rebuilt.resources.coins).toBeCloseTo(426.5);
  expect(production(rebuilt).output.gears).toBe(.45);
  const later = advanceCity(rebuilt, 5);
  expect(later.plots[0]).toEqual({ kind: 'workshop', level: 1 });
  expect(later.resources.gears - rebuilt.resources.gears).toBeCloseTo(.45 * 5);
  expect(later.actionFeedback).toBe(rebuilt.actionFeedback);
 });

 it('removes a boiler and its adjacency bonus, clamps steam capacity, and clears associated damage', () => {
  const s = pending();
  s.plots[0] = { kind: 'boiler', level: 3 };
  s.plots[1] = { kind: 'factory', level: 1 };
  s.resources.steam = steamCapacity(s);
  const refused = choose(s, 1);
  refused.damagedPlots = [0];
  const walked = advanceCity(refused, 5);
  expect(walked.plots[0]).toBe(null);
  expect(walked.plots[1]).toEqual(s.plots[1]);
  expect(walked.damagedPlots).toEqual([]);
  expect(steamCapacity(walked)).toBe(30);
  expect(walked.resources.steam).toBe(30);
  expect(production(walked).output.gears).toBe(1.5);
 });

 it('removes the original dock and prevents new launches after its loss', () => {
  const s = pending();
  s.plots[0] = { kind: 'dock', level: 1 };
  const walked = advanceCity(choose(s, 1), 5);
  expect(actionReason(walked, { type: 'launch', index: 0 })).toBe('Construct an Airship Dock first');
  expect(production(walked).input.steam).toBe(0);
 });

 it('leaves other workplaces and the shortage penalty intact', () => {
  const s = pending();
  s.plots[1] = { kind: 'bakery', level: 1 };
  s.shortageSeconds = 60;
  const walked = advanceCity(choose(s, 1), 5);
  expect(walked.shortageSeconds).toBe(55);
  expect(production(walked).output.coins).toBe(2.5);
  expect(production(walked).input.steam).toBe(.2);
  expect(production(walked).output.gears).toBe(0);
  const rebuilt = cityAction(walked, { type: 'construct', plot: 0, kind: 'workshop' });
  expect(production(rebuilt).output.gears).toBe(.225);
 });

 it('does not redirect the walkout when another plot is demolished and rebuilt during the delay', () => {
  const s = pending();
  s.resources.steam = 10;
  s.plots[1] = { kind: 'boiler', level: 1 };
  let refused = choose(s, 1);
  refused = cityAction(refused, { type: 'demolish', plot: 1 });
  refused = cityAction(refused, { type: 'construct', plot: 1, kind: 'bakery' });
  const walked = advanceCity(refused, 5);
  expect(walked.plots[0]).toBe(null);
  expect(walked.plots[1]).toEqual({ kind: 'bakery', level: 1 });
 });

 it('shows no countdown or rehire interface, then presents the emptied plot for construction', () => {
  const s = choose(pending(), 1);
  const game = gameFor(s);
  const ui = render(<CityManagement game={game}/>);
  expect(screen.getByRole('button', { name: 'Plot 1: Clockwork Workshop' })).not.toHaveTextContent(/walkout|seconds|5s/i);
  expect(document.body).not.toHaveTextContent(/workers will leave|rehiring|countdown/i);
  expect(screen.queryByRole('button', { name: /Rehire workforce/ })).not.toBeInTheDocument();
  const walked = advanceCity(s, 5);
  ui.rerender(<CityManagement game={gameFor(walked)}/>);
  expect(screen.getByRole('button', { name: 'Plot 1: empty' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Construct/ })[0]).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Rehire workforce/ })).not.toBeInTheDocument();
 });
});

describe('Union saves and production-clock deadlines', () => {
 it('preserves pending deadlines and property loss without replaying resolved feedback', () => {
  const refused = advanceCity(choose(pending(), 1), 2.5);
  writeCity(refused);
  const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(restored.pendingWalkout).toEqual(refused.pendingWalkout);
  expect(restored.actionFeedback).toBe(null);
  const walked = advanceCity(restored, 2.5);
  expect(walked.plots[0]).toBe(null);
  expect(walked.actionFeedback?.message).toBe('WORKERS HAVE WALKED!');
  writeCity(walked);
  const reloaded = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(reloaded.plots[0]).toBe(null);
  expect(reloaded.pendingWalkout).toBe(null);
  expect(advanceCity(reloaded, 20).actionFeedback).toBe(null);
 });

 it('preserves the unresolved workplace on reload and rejects malformed pending consequences', () => {
  writeCity(pending());
  const raw = localStorage.getItem(CITY_SAVE_KEY)!;
  expect(decodeCity(raw)?.eventPlot).toBe(0);
  const refused = choose(pending(), 1);
  for (const patch of [{ plot: 99 }, { dueAt: -1 }, { dueAt: '25' }, { eventIndex: 0 }]) {
   expect(decodeCity(JSON.stringify({ version: 2, eventCycleLength: CITY_EVENTS.length, state: { ...refused, pendingWalkout: { ...refused.pendingWalkout, ...patch } } }))).toBe(null);
  }
 });

 it.each([1, 7, 13, 19])('migrates old six-event save index %i without changing the merchant guest', oldIndex => {
  const old = { ...freshCity(100000), eventIndex: oldIndex, eventActive: true };
  const restored = decodeCity(JSON.stringify({ version: 2, state: old }))!;
  expect(restored.eventIndex).toBe(Math.floor(oldIndex / 6) * 7 + 1);
  expect(cityEvent(restored.eventIndex)?.title).toBe('Travelling brass merchant');
  const guest = cityEvent(restored.eventIndex)!.options[2]!;
  expect('character' in guest && guest.character.name).toBe(['Captain Mara "Brasshook"', 'Silas Sprocket', 'Quartermaster Holt', 'Captain Mara "Brasshook"'][Math.floor(oldIndex / 6)]);
  expect(restored).not.toHaveProperty('unstaffedPlots');
  expect(restored.pendingWalkout).toBe(null);
 });

 it('uses the real hook to show refusal immediately and departure at 5000ms, not after popup dismissal', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(pending());
  render(<StrictMode><City/></StrictMode>);
  act(() => vi.advanceTimersByTime(375));
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Refuse Their Demands' }));
  expect(screen.getByRole('status')).toHaveTextContent('WAGES WITHHELD!');
  expect(screen.getByRole('status')).toHaveTextContent('"You cannot silence the workers."');
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(4000));
  fireEvent.click(screen.getByRole('button', { name: 'Plot 2: empty' }));
  fireEvent.click(screen.getAllByRole('button', { name: /Construct/ })[0]!);
  // The ordinary construction popup is replaced at the saved walkout boundary.
  expect(screen.getByRole('status')).toHaveTextContent('OIL RIG ONLINE!');
  act(() => vi.advanceTimersByTime(999));
  expect(screen.queryByText('WORKERS HAVE WALKED!')).not.toBeInTheDocument();
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toHaveTextContent('WORKERS HAVE WALKED!');
  expect(screen.getByRole('status')).toHaveTextContent('"No wages, no work."');
  const vignette = document.querySelector('.failure-vignette')!;
  expect(vignette).toHaveClass('pointer-events-none', 'fixed', 'inset-0');
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(saved.plots[0]).toBe(null);
  expect(saved.plots[1]).toEqual({ kind: 'oilrig', level: 1 });
  expect(saved.pendingWalkout).toBe(null);
  expect(saved.elapsed).toBeCloseTo(25.375);
  act(() => vi.advanceTimersByTime(1249));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  expect(vignette).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(vignette).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  expect(screen.getByRole('status')).toHaveTextContent('"No wages, no work."');
  act(() => vi.advanceTimersByTime(499));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  expect(screen.getByRole('status')).toHaveTextContent('"No wages, no work."');
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
 });

 it('processes queued refusals once under StrictMode and never removes a rebuilt building', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(pending());
  const hook = renderHook(() => useCity(), { wrapper: StrictMode });
  act(() => {
   hook.result.current.act({ type: 'event', index: 1, eventIndex: unionIndex });
   hook.result.current.act({ type: 'event', index: 1, eventIndex: unionIndex });
  });
  expect(hook.result.current.state.actionFeedback?.id).toBe(1);
  expect(hook.result.current.state.actionFeedback?.effect).toBeUndefined();
  expect(hook.result.current.state.pendingWalkout?.dueAt).toBe(25);
  act(() => vi.advanceTimersByTime(5000));
  expect(hook.result.current.state.plots[0]).toBe(null);
  expect(hook.result.current.state.actionFeedback?.id).toBe(2);
  expect(hook.result.current.state.actionFeedback?.effect).toBe('red-vignette');
  const coins = hook.result.current.state.resources.coins;
  act(() => {
   hook.result.current.act({ type: 'construct', plot: 0, kind: 'workshop' });
   hook.result.current.act({ type: 'construct', plot: 0, kind: 'workshop' });
  });
  expect(hook.result.current.state.resources.coins).toBe(coins - 75);
  expect(hook.result.current.state.plots[0]).toEqual({ kind: 'workshop', level: 1 });
  expect(hook.result.current.state.emergenciesResolved).toBe(0);
  expect(hook.result.current.state.actionFeedback?.id).toBe(3);
  act(() => vi.advanceTimersByTime(5000));
  expect(hook.result.current.state.plots[0]).toEqual({ kind: 'workshop', level: 1 });
 });

 it('reloads between ticks without restarting or extending the five-second countdown', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(pending());
  const first = renderHook(() => useCity());
  act(() => vi.advanceTimersByTime(375));
  act(() => first.result.current.act({ type: 'event', index: 1, eventIndex: unionIndex }));
  act(() => vi.advanceTimersByTime(2200));
  act(() => window.dispatchEvent(new Event('pagehide')));
  first.unmount();
  const second = renderHook(() => useCity());
  expect(second.result.current.state.pendingWalkout?.dueAt).toBeCloseTo(25.375);
  expect(second.result.current.state.elapsed).toBeCloseTo(22.575);
  act(() => vi.advanceTimersByTime(2799));
  expect(second.result.current.state.plots[0]).not.toBe(null);
  act(() => vi.advanceTimersByTime(1));
  expect(second.result.current.state.plots[0]).toBe(null);
  expect(second.result.current.state.actionFeedback?.message).toBe('WORKERS HAVE WALKED!');
  second.unmount();
  const third = renderHook(() => useCity());
  expect(third.result.current.state.plots[0]).toBe(null);
  expect(third.result.current.state.actionFeedback).toBe(null);
 });

 it('processes a due walkout once on offline catch-up and displays its follow-up', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(choose(pending(), 1));
  vi.setSystemTime(120000);
  const hook = renderHook(() => useCity());
  expect(hook.result.current.state.plots[0]).toBe(null);
  expect(hook.result.current.state.resources.gears).toBeCloseTo(12 + .45 * 5);
  expect(hook.result.current.state.actionFeedback?.message).toBe('WORKERS HAVE WALKED!');
  const feedback = hook.result.current.state.actionFeedback;
  act(() => vi.advanceTimersByTime(3000));
  expect(hook.result.current.state.actionFeedback).toBe(feedback);
 });

 it('migrates previously unstaffed properties to permanent loss without a refund or repeated removal', () => {
  const s = freshCity(100000);
  s.plots[0] = { kind: 'boiler', level: 3 };
  s.plots[1] = { kind: 'workshop', level: 2 };
  s.resources.steam = 100;
  const migrated = decodeCity(JSON.stringify({ version: 2, eventCycleLength: 7, state: { ...s, unstaffedPlots: [0, 0, -1, 99, '1'] } }))!;
  expect(migrated.plots[0]).toBe(null);
  expect(migrated.plots[1]).toEqual(s.plots[1]);
  expect(migrated.resources.coins).toBe(s.resources.coins);
  expect(migrated.resources.steam).toBe(30);
  expect(migrated).not.toHaveProperty('unstaffedPlots');
  expect(migrated.notice).toContain('without refunds');
  const rebuilt = cityAction(migrated, { type: 'construct', plot: 0, kind: 'workshop' });
  writeCity(rebuilt);
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.plots[0]).toEqual({ kind: 'workshop', level: 1 });
 });
});
