import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityEvent } from '@/components/CityPanels';
import { ActionPopup } from '@/components/ActionPopup';
import { BALANCE, CITY_EVENTS, cityEvent, MERCHANT_OFFERS } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, freshCity, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity, type CityGame } from '@/hooks/useCity';

function merchant(visit = 0): CityState {
 const s = freshCity(100000);
 return { ...s, hasBuiltOilRig: true, eventIndex: 1 + visit * CITY_EVENTS.length, eventActive: true, resources: { ...s.resources, coins: 1000, gears: 100 } };
}
function gameFor(state: CityState): CityGame {
 return { state, loaded: true, now: 100000, saveError: false, act: vi.fn(), reset: vi.fn() };
}
function open() { fireEvent.click(screen.getByRole('button', { name: /City Alert/ })); }
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Merchant characters and stable rotating offers', () => {
 it('keeps the single merchant event and both existing trades, rotating only the guest', () => {
  expect(CITY_EVENTS.filter(e => /merchant/i.test(e.title))).toHaveLength(1);
  const guests = ['Captain Mara "Brasshook"', 'Silas Sprocket', 'Quartermaster Holt'];
  for (let visit = 0; visit < 6; visit++) {
   const event = cityEvent(merchant(visit).eventIndex)!;
   expect(event.options).toHaveLength(3);
   expect(event.options[0]).toBe(MERCHANT_OFFERS[0]);
   expect(event.options[1]).toBe(MERCHANT_OFFERS[1]);
   const guest = event.options[2]!;
   expect('character' in guest && guest.character.name).toBe(guests[visit % 3]);
  }
 });

 it.each([0, 1, 2])('visit %i displays correct identities, quotes and trade details before the button', visit => {
  const s = merchant(visit);
  render(<CityEvent game={gameFor(s)}/>);
  open();
  for (const offer of cityEvent(s.eventIndex)!.options) {
   if (!('character' in offer)) throw new Error('Merchant character missing');
   const heading = screen.getByRole('heading', { name: `OFFER FROM: ${offer.character.name}, ${offer.character.role}` });
   const card = heading.parentElement!.parentElement!;
   expect(card).toHaveTextContent(offer.character.quote);
   expect(card.querySelector('blockquote')).toHaveTextContent(offer.character.quote);
   expect(card).toHaveTextContent('You pay:');
   const button = within(card).getByRole('button', { name: offer.label });
   expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
   if ('risk' in offer) {
    expect(card).toHaveTextContent('50% chance: receive 160 Brass Coins (net +100 Brass Coins)');
    expect(card).toHaveTextContent('50% chance: lose the entry cost (60 Brass Coins)');
    expect(card).toHaveTextContent('Upfront cost is paid in both outcomes');
   } else expect(card).toHaveTextContent('You receive:');
   expect(within(card).getByText(/You pay:/).closest('p')).toHaveClass('text-base', 'text-trade-cost');
   expect(within(card).getByText('risk' in offer ? /Potential reward:/ : /You receive:/).closest('p')).toHaveClass('text-base', 'text-trade-reward');
  }
 });

 it('keeps identities and quotes stable across ticks, dismissal, save and reload', () => {
  const s = merchant(1);
  const offers = cityEvent(s.eventIndex)!.options;
  const game = gameFor(s);
  const ui = render(<CityEvent game={game}/>);
  open();
  const before = screen.getByRole('dialog').textContent;
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(game.act).not.toHaveBeenCalled();
  expect(s.eventActive).toBe(true);
  expect(cityEvent(advanceCity(s, 100).eventIndex)!.options).toEqual(offers);
  expect(writeCity(s)).toBe(true);
  const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(cityEvent(restored.eventIndex)!.options).toEqual(offers);
  ui.rerender(<CityEvent game={gameFor(restored)}/>);
  open();
  expect(screen.getByRole('dialog').textContent).toBe(before);
 });
});

describe('Merchant resource exchanges and actual risk outcomes', () => {
 it('offers distinct bulk economics: premium crystals, simple civilian sales and generous pirate gears', () => {
  const [ceo, civilian, pirate, crook, guild] = MERCHANT_OFFERS;
  expect(ceo.cost.coins).toBe(600);
  expect(ceo.reward.crystals).toBe(30);
  expect(ceo.cost.coins).toBeGreaterThan(civilian.reward.coins);
  expect(civilian.cost.gears).toBe(30);
  expect(civilian.reward.coins).toBe(120);
  expect('risk' in civilian).toBe(false);
  expect('risk' in pirate).toBe(false);
  expect(pirate.reward.gears / pirate.cost.coins).toBeGreaterThan(18 / 35);
  expect(pirate.cost.coins / pirate.reward.gears).toBeLessThan(civilian.reward.coins / civilian.cost.gears);
  expect(crook.cost.coins).toBe(60);
  expect(guild.cost.gears).toBe(40);
  expect(guild.reward.coins).toBe(160);
 });

 it.each([
  { visit: 0, index: 0, coins: -600, gears: 0, crystals: 30, message: 'CRYSTALS ACQUIRED!', quote: 'Profit waits for no one.' },
  { visit: 0, index: 1, coins: 120, gears: -30, crystals: 0, message: 'GEARS TRADED!', quote: 'Every gear keeps us going.' },
  { visit: 0, index: 2, coins: -60, gears: 40, crystals: 0, message: 'SUPPLIES SECURED!', quote: 'Take it before I reconsider.' },
  { visit: 2, index: 2, coins: 160, gears: -40, crystals: 0, message: 'GUILD DELIVERY COMPLETE!', quote: 'Delivered before the next whistle.' },
 ])('applies visit $visit option $index exactly once', trade => {
  const s = merchant(trade.visit);
  const action = { type: 'event', index: trade.index, eventIndex: s.eventIndex } as const;
  const next = cityAction(s, action);
  expect(next.resources).toEqual({ ...s.resources, coins: s.resources.coins + trade.coins, gears: s.resources.gears + trade.gears, crystals: trade.crystals });
  expect(next.actionFeedback?.message).toBe(trade.message);
  expect(next.actionFeedback?.category).toBe('trade');
  expect(next.actionFeedback?.effect).toBeUndefined();
  expect(next.actionFeedback?.quote).toBe(trade.quote);
  expect(trade.quote.split(/\s+/).length).toBeGreaterThanOrEqual(3);
  expect(trade.quote.split(/\s+/).length).toBeLessThanOrEqual(6);
  expect(next.eventActive).toBe(false);
  expect(next.emergenciesResolved).toBe(0);
  expect(cityAction(next, action).resources).toEqual(next.resources);
  expect(cityAction(next, action).actionFeedback).toBe(next.actionFeedback);
  const later = advanceCity(next, BALANCE.eventInterval);
  expect(cityAction(later, action).resources).toEqual(later.resources);
 });

 it.each([
  [0, 1100, 'DEAL PAID OFF!'], [.499999, 1100, 'DEAL PAID OFF!'],
  [.5, 940, 'BAD DEAL!'], [.999999, 940, 'BAD DEAL!'],
 ] as const)('roll %f matches the disclosed 50%% boundary and correct popup', (randomRoll, coins, message) => {
  const s = merchant(1);
  const action = { type: 'event', index: 2, eventIndex: s.eventIndex, randomRoll } as const;
  const next = cityAction(s, action);
  expect(next.resources.coins).toBe(coins);
  expect(next.earned).toBe(coins === 1100 ? 160 : 0);
  expect(next.actionFeedback?.message).toBe(message);
  expect(next.actionFeedback?.effect).toBe(coins === 1100 ? undefined : 'red-vignette');
  expect(next.actionFeedback?.quote).toBe(coins === 1100 ? 'Luck loves a loose cog.' : 'Nothing ventured, nothing gained.');
  expect(next.eventActive).toBe(false);
  expect(next.emergenciesResolved).toBe(0);
  expect(next.notice).toContain(coins === 1100 ? 'Net gain: 100' : '60 Brass Coins are lost');
  const repeated = cityAction(next, { ...action, randomRoll: 1 - randomRoll });
  expect(repeated.resources).toEqual(next.resources);
  expect(repeated.actionFeedback).toBe(next.actionFeedback);
 });

 it('matches exact outcome counts across evenly spaced rolls', () => {
  let successes = 0;
  for (let i = 0; i < 100; i++) {
   const next = cityAction(merchant(1), { type: 'event', index: 2, eventIndex: merchant(1).eventIndex, randomRoll: i / 100 });
   if (next.resources.coins === 1100) successes++;
  }
  expect(successes).toBe(50);
 });

 it('does not process missing or invalid random values', () => {
  const s = merchant(1);
  for (const randomRoll of [undefined, NaN, Infinity, -1, 1]) {
   const next = cityAction(s, { type: 'event', index: 2, ...(randomRoll === undefined ? {} : { randomRoll }) });
   expect(next.resources).toEqual(s.resources);
   expect(next.eventActive).toBe(true);
   expect(next.actionFeedback).toBe(null);
   expect(next.notice).toContain('Trade outcome unavailable');
  }
 });

 it.each([0, 1, 2])('prevents every unaffordable offer on visit %i with an explanation', visit => {
  const s = merchant(visit);
  s.resources.coins = 0;
  s.resources.gears = 0;
  render(<CityEvent game={gameFor(s)}/>);
  open();
  cityEvent(s.eventIndex)!.options.forEach((offer, index) => {
   const button = screen.getByRole('button', { name: offer.label });
   expect(button).toBeDisabled();
   expect(button.parentElement).toHaveTextContent('Need');
   const action = { type: 'event', index, eventIndex: s.eventIndex, randomRoll: 0 } as const;
   expect(actionReason(s, action)).toContain('Need');
   const next = cityAction(s, action);
   expect(next.resources).toEqual(s.resources);
   expect(next.eventActive).toBe(true);
   expect(next.actionFeedback).toBe(null);
  });
 });
});

describe('Merchant shared popup and save integration', () => {
 it('only triggers the vignette after a paid loss, allows other actions, and does not replay it after reload', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.spyOn(Math, 'random').mockReturnValue(.99);
  writeCity(merchant(1));
  function City() {
   const game = useCity();
   return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/><button onClick={() => game.act({ type: 'construct', kind: 'workshop', plot: 0 })}>Build workshop</button></>;
  }
  const ui = render(<City/>);
  open();
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  open();
  fireEvent.click(screen.getByRole('button', { name: "Take Silas's risky deal" }));
  expect(document.querySelector('.failure-vignette')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('BAD DEAL!');
  fireEvent.click(screen.getByRole('button', { name: 'Build workshop' }));
  expect(screen.getByRole('status')).toHaveTextContent('WORKSHOP BUILT!');
  expect(document.querySelector('.failure-vignette')).toBeInTheDocument();
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBe(865);
  ui.unmount();
  render(<City/>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
 });

 it('keeps every outcome quote between three and six words', () => {
  for (const offer of MERCHANT_OFFERS) {
   const quotes = 'risk' in offer ? [offer.risk.successQuote, offer.risk.failureQuote] : [offer.popupQuote];
   for (const quote of quotes) {
    expect(quote.split(/\s+/).length).toBeGreaterThanOrEqual(3);
    expect(quote.split(/\s+/).length).toBeLessThanOrEqual(6);
   }
  }
 });

 it.each([
  [0, 0, 'CRYSTALS ACQUIRED!', 'Profit waits for no one.'],
  [0, 1, 'GEARS TRADED!', 'Every gear keeps us going.'],
  [0, 2, 'SUPPLIES SECURED!', 'Take it before I reconsider.'],
  [2, 2, 'GUILD DELIVERY COMPLETE!', 'Delivered before the next whistle.'],
 ] as const)('visit %i choice %i shows the matching message and character quote', (visit, index, message, quote) => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(merchant(visit));
  function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/></>; }
  render(<City/>);
  open();
  fireEvent.click(screen.getByRole('button', { name: cityEvent(merchant(visit).eventIndex)!.options[index]!.label }));
  expect(screen.getByRole('status')).toHaveTextContent(message);
  expect(screen.getByRole('status')).toHaveTextContent(`"${quote}"`);
 });

 it.each([0, .99])('processes randomized outcome %f once through the real hook under StrictMode', roll => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.spyOn(Math, 'random').mockReturnValue(roll);
  writeCity(merchant(1));
  function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/><button onClick={() => {
   game.act({ type: 'event', index: 2, eventIndex: merchant(1).eventIndex });
   game.act({ type: 'event', index: 2, eventIndex: merchant(1).eventIndex });
  }}>Queued risky trade</button></>; }
  render(<StrictMode><City/></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: 'Queued risky trade' }));
  expect(screen.getByText(roll < .5 ? 'DEAL PAID OFF!' : 'BAD DEAL!')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(roll < .5 ? '"Luck loves a loose cog."' : '"Nothing ventured, nothing gained."');
  expect(document.querySelectorAll('.failure-vignette')).toHaveLength(roll < .5 ? 0 : 1);
  act(() => vi.advanceTimersByTime(1249));
  expect(document.querySelectorAll('.failure-vignette')).toHaveLength(roll < .5 ? 0 : 1);
  act(() => vi.advanceTimersByTime(1));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(saved.resources.coins).toBe(roll < .5 ? 1100 : 940);
  expect(saved.eventActive).toBe(false);
  expect(saved.eventIndex).toBe(merchant(1).eventIndex + 1);
  expect(saved.actionFeedback).toBe(null);
  act(() => vi.advanceTimersByTime(499));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(500));
  expect(document.querySelector('.action-popup')).not.toBeInTheDocument();
 });

 it('accepts the actual risky choice button and does not replay an outcome after reload', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.spyOn(Math, 'random').mockReturnValue(.1);
  writeCity(merchant(1));
  function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/></>; }
  const ui = render(<City/>);
  open();
  fireEvent.click(screen.getByRole('button', { name: "Take Silas's risky deal" }));
  expect(screen.getByText('DEAL PAID OFF!')).toBeInTheDocument();
  ui.unmount();
  const hook = renderHook(() => useCity());
  expect(hook.result.current.state.resources.coins).toBe(1100);
  expect(hook.result.current.state.eventActive).toBe(false);
  expect(hook.result.current.state.actionFeedback).toBe(null);
  act(() => hook.result.current.act({ type: 'event', index: 2, eventIndex: merchant(1).eventIndex }));
  expect(hook.result.current.state.resources.coins).toBe(1100);
  expect(hook.result.current.state.actionFeedback).toBe(null);
 });
});
