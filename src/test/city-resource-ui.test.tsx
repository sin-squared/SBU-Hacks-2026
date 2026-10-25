import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityResources } from '@/components/CityResources';
import { CityManagement } from '@/components/CityManagement';
import { advanceCity, cityAction, freshCity, type CityState } from '@/game/city';
import { CITY_EVENTS } from '@/game/city-config';
import { decodeCity, writeCity, CITY_SAVE_KEY } from '@/game/city-save';
import type { CityGame } from '@/hooks/useCity';

afterEach(() => { cleanup(); localStorage.clear(); });
function gameFor(state: CityState): CityGame {
 return { state, loaded: true, now: 0, saveError: false, act: vi.fn(), reset: vi.fn() };
}
function city() {
 const s = freshCity(0);
 s.hasBuiltOilRig = true;
 s.plots[0] = { kind: 'oilrig', level: 1 };
 s.plots[1] = { kind: 'steamrig', level: 1 };
 s.resources.coins = 1000;
 s.resources.oil = 10;
 s.resources.gears = 100;
 return s;
}
function rate(resource: string) {
 return document.querySelector(`[data-resource="${resource}"] [data-net-rate]`)!;
}
describe('Resource and building presentation', () => {
 it('orders all six resources, emphasizes amounts and names, and shows signed net rates', () => {
  const s = city();
  s.plots[0] = { kind: 'laboratory', level: 1 };
  render(<CityResources state={s}/>);
  const cards = screen.getByRole('region', { name: 'City resources' }).children;
  expect(Array.from(cards, card => card.getAttribute('data-resource'))).toEqual(['coins', 'oil', 'gears', 'steam', 'research', 'crystals']);
  expect(rate('research')).toHaveTextContent('+0.3 Research /s');
  expect(rate('research')).toHaveClass('text-trade-reward');
  expect(rate('gears')).toHaveTextContent('−0.12 Gears /s');
  expect(rate('gears')).toHaveClass('text-trade-cost');
  expect(rate('coins')).toHaveTextContent('0.0 /s');
  expect(rate('coins')).toHaveClass('text-muted-foreground');
  expect(cards[0]?.children[0]).toHaveClass('font-bold', 'text-base');
  expect(cards[0]?.children[1]?.className).toContain('clamp');
 });
 it('reflects current damage, upgrades, research, inputs and capped storage without stale interval rates', () => {
  let s = advanceCity(city(), 1, 0, 0);
  const ui = render(<CityResources state={s}/>);
  expect(rate('oil')).toHaveTextContent('+0.4 Oil /s');
  s = { ...s, damagedPlots: [0] };
  ui.rerender(<CityResources state={s}/>);
  expect(rate('oil')).toHaveTextContent('−0.4 Oil /s');
  s.resources.oil = 0;
  ui.rerender(<CityResources state={s}/>);
  expect(rate('steam')).toHaveTextContent('0.0 /s');
  expect(rate('oil')).toHaveTextContent('0.0 /s');
  s = { ...s, damagedPlots: [] };
  s = cityAction(s, { type: 'upgrade', plot: 0 });
  ui.rerender(<CityResources state={s}/>);
  expect(rate('coins')).toHaveTextContent('+3 Brass Coins /s');
  expect(rate('oil')).toHaveTextContent('+0.56 Oil /s');
  s = { ...s, technologies: ['whirr', 'boilers'] };
  ui.rerender(<CityResources state={s}/>);
  expect(rate('steam')).toHaveTextContent('+1.42 Steam Components /s');
  s.resources.steam = 75;
  ui.rerender(<CityResources state={s}/>);
  expect(rate('steam')).toHaveTextContent('0.0 /s');
 });
 it('formats construction and upgraded building summaries without redundant subtitles', () => {
  const s = city();
  const ui = render(<CityManagement game={gameFor(s)}/>);
  expect(screen.queryByText(/Rated output:|Uses |Level 1 ·/)).not.toBeInTheDocument();
  expect(screen.getByText(/\+2.5 Brass Coins · \+0.8 Oil/)).toHaveClass('text-base');
  fireEvent.click(screen.getByRole('button', { name: 'Plot 2: Steam Rig' }));
  expect(screen.getByText(/\+0.9 Steam Components · −0.4 Oil/)).toBeInTheDocument();
  s.plots[0] = null;
  ui.rerender(<CityManagement game={gameFor(s)}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Plot 1: empty' }));
  const preview = screen.getByRole('article', { name: 'Gear Factory' });
  expect(preview).toHaveTextContent('+1 Brass Coins · +1.5 Gears · −0.6 Steam Components per second');
 });
});

describe('Building panel repairs', () => {
 it.each([false, true])('repairs the matching %s secondary alert once, persists, and retains the other alert', secondary => {
  let s = city();
  const index = CITY_EVENTS.findIndex(e => 'id' in e && e.id === 'equipment-breakdown');
  s = { ...s, damagedPlots: [0], eventActive: true, eventIndex: secondary ? 0 : index, eventPlot: secondary ? null : 0,
   secondEvent: secondary ? { eventIndex: index, eventPlot: 0 } : { eventIndex: index + 1, eventPlot: 1 } };
  const game = gameFor(s);
  const ui = render(<><CityManagement game={game}/><CityResources state={s}/></>);
  const button = screen.getByRole('button', { name: 'Repair Building · 7 Gears' });
  expect(button).toBeEnabled();
  expect(button.parentElement).toBe(button.closest('.space-y-3')?.lastElementChild);
  fireEvent.click(button);
  expect(game.act).toHaveBeenCalledExactlyOnceWith({ type: 'event', index: 0, eventIndex: index });
  const action = { type: 'event' as const, index: 0, eventIndex: index };
  const repaired = cityAction(s, action, 0);
  expect(repaired.resources.gears).toBe(s.resources.gears - 7);
  expect(repaired.emergenciesResolved).toBe(s.emergenciesResolved + 1);
  expect(repaired.damagedPlots).toEqual([]);
  expect(repaired.actionFeedback).toBe(s.actionFeedback);
  expect(repaired.eventActive).toBe(true);
  expect(repaired.eventIndex).toBe(secondary ? 0 : index + 1);
  expect(cityAction(repaired, action, 0).resources).toEqual(repaired.resources);
  writeCity(repaired, 0);
  const loaded = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 0)!;
  expect(loaded.damagedPlots).toEqual([]);
  ui.rerender(<><CityManagement game={gameFor(loaded)}/><CityResources state={loaded}/></>);
  expect(screen.queryByRole('button', { name: /Repair Building/ })).not.toBeInTheDocument();
  expect(rate('coins')).toHaveTextContent('+2.5 Brass Coins /s');
 });
 it('shows the actual missing resource and disables unaffordable repairs', () => {
  const s = city();
  s.damagedPlots = [0];
  s.eventActive = true;
  s.eventIndex = CITY_EVENTS.findIndex(e => 'id' in e && e.id === 'equipment-breakdown');
  s.eventPlot = 0;
  s.resources.gears = 6;
  const game = gameFor(s);
  render(<CityManagement game={game}/>);
  const button = screen.getByRole('button', { name: 'Repair Building · 7 Gears' });
  expect(button).toBeDisabled();
  expect(within(button.parentElement!).getByText('Need 1 Gears')).toBeInTheDocument();
  fireEvent.click(button);
  expect(game.act).not.toHaveBeenCalled();
 });
});
