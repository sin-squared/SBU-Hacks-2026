import { useState } from 'react';
import { Cog, Flame, FlaskConical, Factory, Croissant, Ship, Plus, ArrowUp, Trash2, Lock, Droplets, Gauge, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILDINGS, LEVEL_OUTPUT, RESOURCE_NAMES, type BuildingKind, type Resource, type Stock } from '@/game/city-config';
import { actionReason, buildingRates, costText, eventState, eventTerms, interactiveEvents, isBreakdown, nextPlotTechnology, plotLimit, stage, upgradeCost } from '@/game/city';
import type { CityGame } from '@/hooks/useCity';
export const BUILDING_ICONS = { oilrig: Droplets, steamrig: Gauge, refinery: Gem, workshop: Cog, boiler: Flame, laboratory: FlaskConical, factory: Factory, bakery: Croissant, dock: Ship };
function ProductionSummary({ output, input }: { output: Stock; input: Stock }) {
 const signed = (rates: Stock, sign: string) => Object.entries(rates).filter(([, n]) => n > 0).map(([key, value]) => `${sign}${Number(value.toFixed(4))} ${RESOURCE_NAMES[key as Resource]}`);
 const parts = [...signed(output, '+'), ...signed(input, '−')];
 return <p className="text-base font-semibold text-steam break-words">{parts.join(' · ') || '0.0'} <span className="text-xs font-normal text-muted-foreground">per second</span></p>;
}
export function CityManagement({ game }: { game: CityGame }) {
 const [selected, setSelected] = useState(0); const [demolish, setDemolish] = useState(false); const s = game.state; const plot = s.plots[selected];
 const firstRig = !s.hasBuiltOilRig;
 const currentRates = plot ? buildingRates(s, plot, selected) : null;
 const upgradedRates = plot && plot.level < 3 ? buildingRates(s, { ...plot, level: plot.level + 1 }, selected) : null;
 const land = nextPlotTechnology(s);
 const damaged = s.damagedPlots.includes(selected);
 const breakdown = interactiveEvents(s).find(event => event.eventPlot === selected && isBreakdown(eventState(s, event)));
 const repair = breakdown ? { type: 'event' as const, index: 0, eventIndex: breakdown.eventIndex } : null;
 const repairReason = repair ? actionReason(s, repair) : 'Repair event unavailable';
 const repairCost = breakdown ? eventTerms(eventState(s, breakdown), 0).cost : null;
 return <section className="space-y-4">
 <div className="flex items-center justify-between"><h2 className="text-xl text-brass">City of Brasshaven</h2><span className="text-sm text-muted-foreground">{s.plots.filter(Boolean).length}/{plotLimit(s)} plots occupied</span></div>
 <div className="city-map bg-sky overflow-hidden rounded-md border-2 border-copper p-3 sm:p-5">
 <div className="mb-4 flex items-end justify-between border-b border-copper/60 pb-3"><div><p className="font-display text-lg text-brass">{['Foundry Row', 'Industrial Quarter', 'Aetherport'][stage(s)]}</p><p className="text-xs text-steam">{s.victory ? 'The Great Engine lives' : 'Rise of the Clockwork City'}</p></div><Cog className={`h-12 w-12 text-brass ${s.victory ? 'animate-spin-slow' : ''}`} /></div>
 <div className="grid grid-cols-4 gap-2 sm:gap-3">{s.plots.map((p, i) => { const locked = i >= plotLimit(s); const Icon = p ? BUILDING_ICONS[p.kind] : locked ? Lock : Plus; return <Button key={i} variant="ghost" aria-label={`Plot ${i + 1}${p ? ': ' + BUILDINGS[p.kind].name : locked ? ': locked' : ': empty'}`} onClick={() => { setSelected(i); setDemolish(false); }} disabled={locked} className={`city-plot h-auto min-w-0 flex-col whitespace-normal border p-1 sm:p-2 ${selected === i ? 'border-brass bg-brass/15' : 'border-copper/50 bg-iron-deep/50'}`}>
 {p ? <svg viewBox="0 0 100 88" className="w-full max-w-24" aria-hidden="true"><path d="M12 38 L50 14 L88 38 V82 H12Z" className="fill-secondary stroke-copper" strokeWidth="2"/><rect x="70" y="4" width="10" height="30" className="fill-copper"/>{p.kind === 'boiler' && <circle cx="75" cy="4" r="7" className="fill-steam animate-steam"/>}<rect x="24" y="47" width="13" height="15" className="fill-brass"/><rect x="62" y="47" width="13" height="15" className="fill-amber"/><rect x="43" y="63" width="14" height="19" className="fill-iron-deep"/>{p.level > 1 && <path d="M23 37 V18 H61 V37" className="fill-copper stroke-brass"/>}{p.level > 2 && <circle cx="42" cy="15" r="10" className="fill-brass"/>}</svg> : <Icon className="my-5 h-8 w-8 text-copper"/>}
 <span className="text-[10px] sm:text-xs leading-tight text-center">{p ? BUILDINGS[p.kind].name : locked ? `Plot ${i + 1} · Research required` : `Plot ${i + 1}`}</span>{p && <span className="flex gap-1 text-xs text-brass"><Icon/> L{p.level}</span>}{p && s.damagedPlots.includes(i) && <span className="text-xs text-destructive">Damaged · Paused</span>}</Button>; })}</div>
 <p className="mt-3 text-xs text-steam">Operating adjacent boilers boost factories and bakeries by 25%. Each Boiler House or Steam Rig level adds 45 steam capacity.</p></div>
 {s.technologies.includes('whirr') && <p className="text-xs text-steam">Whirr Faster, Think Later: every machine runs 5% faster, using and producing 5% more per second.</p>}
 {land && <p className="text-sm text-steam">Next expansion: Plot {land.unlockPlot}. Open Research to unlock it.</p>}
 <div className="flex items-center justify-between border-b border-copper pb-2"><h3 className="text-brass">Plot {selected + 1} {plot ? '· ' + BUILDINGS[plot.kind].name : '· Construction'}</h3></div>
 {plot ? <div className="space-y-3">
 {currentRates && !damaged && <ProductionSummary {...currentRates}/>}
 {damaged && <p className="text-sm text-destructive">Damaged: production and consumption are paused.</p>}
 {upgradedRates && <><p className="text-sm">Upgrade: {costText(upgradeCost(plot))}</p><p className="text-xs text-steam">Next level: {LEVEL_OUTPUT[plot.level]}x base output. Input consumption stays unchanged.</p><ProductionSummary {...upgradedRates}/>{['boiler', 'steamrig'].includes(plot.kind) && <p className="text-xs">Upgrade adds 45 {RESOURCE_NAMES.steam} capacity.</p>}</>}
 <div className="flex flex-wrap gap-2"><Button className="btn-brass" disabled={Boolean(actionReason(s, { type: 'upgrade', plot: selected }))} onClick={() => game.act({ type: 'upgrade', plot: selected })}><ArrowUp/> Upgrade</Button><Button variant="outline" disabled={Boolean(actionReason(s, { type: 'demolish', plot: selected }))} onClick={() => setDemolish(!demolish)}><Trash2/> Demolish</Button></div><p className="text-xs text-muted-foreground">{actionReason(s, { type: 'upgrade', plot: selected })}</p>{demolish && <div className="border-l-2 border-destructive pl-3 space-y-2"><p className="text-sm">Demolish this building? Returns 50% of its current base cost; upgrades are not refunded. Losing your last income source can strand the city.</p><Button variant="destructive" disabled={Boolean(actionReason(s, { type: 'demolish', plot: selected }))} onClick={() => { game.act({ type: 'demolish', plot: selected }); setDemolish(false); }}>Confirm demolition</Button></div>}
 {damaged && <div className="border-t border-copper/40 pt-3 space-y-2">
  <Button className="btn-brass" disabled={Boolean(repairReason)} onClick={() => { if (repair) game.act(repair); }}>Repair Building{repairCost && ` · ${costText(repairCost)}`}</Button>
  {repairReason && <p className="text-sm text-trade-cost">{repairReason}</p>}
 </div>}
 </div> : <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(BUILDINGS) as BuildingKind[]).map(kind => { const b = BUILDINGS[kind]; const Icon = BUILDING_ICONS[kind]; const a = { type: 'construct' as const, plot: selected, kind }; const reason = actionReason(s, a); const highlighted = firstRig && kind === 'oilrig'; const rates = buildingRates(s, { kind, level: 1 }, selected); return <article key={kind} aria-label={b.name} className={`rounded-md border border-copper/60 bg-secondary/30 p-3 space-y-2 ${highlighted ? 'city-first-rig' : ''}`}>
 {highlighted && <p className="font-display text-sm font-bold text-brass">YOUR INDUSTRIAL EMPIRE STARTS HERE</p>}
 <h4 className="flex gap-2 items-center text-sm text-brass"><Icon className="h-4 w-4"/>{b.name}</h4><p className="text-xs text-muted-foreground">{b.purpose}</p>
 {highlighted && <p className="text-sm text-steam">Build this first to fund your city. It generates oil and passive Brass Coin income without clicking.</p>}
 <p className="text-xs">{costText(b.cost)}</p><ProductionSummary {...rates}/><Button size="sm" className="btn-brass w-full" disabled={Boolean(reason)} onClick={() => game.act(a)}><Plus/>Construct</Button>{reason && <p className="text-xs text-muted-foreground">{reason}</p>}</article>; })}</div>}
 </section>;
}
