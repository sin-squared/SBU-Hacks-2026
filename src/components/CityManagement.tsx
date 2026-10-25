import { useState } from 'react';
import { Cog, Flame, FlaskConical, Factory, Croissant, Ship, Plus, ArrowUp, Trash2, Lock, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILDINGS, type BuildingKind } from '@/game/city-config';
import { actionReason, costText, plotLimit, stage, upgradeCost } from '@/game/city';
import type { CityGame } from '@/hooks/useCity';
export const BUILDING_ICONS = { workshop: Cog, boiler: Flame, laboratory: FlaskConical, factory: Factory, bakery: Croissant, dock: Ship };
export function CityManagement({ game, selectedPlot, onSelectPlot }: { game: CityGame; selectedPlot: number; onSelectPlot: (plot: number) => void }) {
 const [foundryOpen, setFoundryOpen] = useState(false);
 const s = game.state;
 return <section className="space-y-4">
 <div className="city-title-hud flex items-center justify-between"><h2 className="text-xl text-brass">City of Brasshaven</h2><span className="text-sm text-muted-foreground">{s.plots.filter(Boolean).length}/{plotLimit(s)} plots occupied</span></div>
 <div className="city-foundry-menu">
 <Button type="button" className="btn-brass flex items-center gap-2" aria-expanded={foundryOpen} aria-controls="city-foundry-panel" onClick={() => setFoundryOpen(!foundryOpen)}>
 <Cog className="h-4 w-4" aria-hidden="true" /> Foundry Row <ChevronUp className={`h-4 w-4 transition-transform ${foundryOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
 </Button>
 <div id="city-foundry-panel" className="city-foundry-popover rounded-md border border-copper bg-iron-deep p-4" hidden={!foundryOpen}>
 <div className="mb-4 flex items-end justify-between border-b border-copper/60 pb-3"><div><p className="font-display text-lg text-brass">{['Foundry Row', 'Industrial Quarter', 'Aetherport'][stage(s)]}</p><p className="text-xs text-steam">{s.victory ? 'The Great Engine lives' : 'Rise of the Clockwork City'}</p></div><Cog className={`h-12 w-12 text-brass ${s.victory ? 'animate-spin-slow' : ''}`} /></div>
 <p className="mt-3 text-xs text-steam">Adjacent boilers boost factories and bakeries by 25%. Each boiler level adds 45 steam capacity.</p>
 </div>
 </div>
 <div className="city-plot-scene">
 <div className="city-plot-grid">{s.plots.map((p, i) => { const locked = i >= plotLimit(s); const Icon = p ? BUILDING_ICONS[p.kind] : locked ? Lock : Plus; return <Button key={i} variant="ghost" aria-label={`Plot ${i + 1}${p ? ': ' + BUILDINGS[p.kind].name : locked ? ': locked' : ': empty'}`} onClick={() => onSelectPlot(i)} disabled={locked} className={`city-plot h-auto min-w-0 flex-col whitespace-normal border p-1 sm:p-2 ${selectedPlot === i ? 'border-brass bg-brass/15' : 'border-copper/50 bg-iron-deep/50'}`}>
 {p ? <svg viewBox="0 0 100 88" className="w-full max-w-24" aria-hidden="true"><path d="M12 38 L50 14 L88 38 V82 H12Z" className="fill-secondary stroke-copper" strokeWidth="2"/><rect x="70" y="4" width="10" height="30" className="fill-copper"/>{p.kind === 'boiler' && <circle cx="75" cy="4" r="7" className="fill-steam animate-steam"/>}<rect x="24" y="47" width="13" height="15" className="fill-brass"/><rect x="62" y="47" width="13" height="15" className="fill-amber"/><rect x="43" y="63" width="14" height="19" className="fill-iron-deep"/>{p.level > 1 && <path d="M23 37 V18 H61 V37" className="fill-copper stroke-brass"/>}{p.level > 2 && <circle cx="42" cy="15" r="10" className="fill-brass"/>}</svg> : <Icon className="my-5 h-8 w-8 text-copper"/>}
 <span className="text-[10px] sm:text-xs leading-tight text-center">{p ? BUILDINGS[p.kind].name : locked ? 'Permit required' : `Plot ${i + 1}`}</span>{p && <span className="flex gap-1 text-xs text-brass"><Icon/> L{p.level}</span>}</Button>; })}</div>
 </div>
 </section>;
}

export function CityPlotDetails({ game, selectedPlot, demolish, setDemolish }: { game: CityGame; selectedPlot: number; demolish: boolean; setDemolish: (value: boolean) => void }) {
 const s = game.state; const plot = s.plots[selectedPlot];
 return <>
 <div className="flex items-center justify-between border-b border-copper pb-2"><h3 className="text-brass">Plot {selectedPlot + 1} {plot ? '· ' + BUILDINGS[plot.kind].name : '· Construction'}</h3></div>
 {plot ? <div className="space-y-3"><p className="text-sm text-muted-foreground">Level {plot.level} · {BUILDINGS[plot.kind].purpose}</p><p className="text-sm">Upgrade: {costText(upgradeCost(plot))}</p><div className="flex flex-wrap gap-2"><Button className="btn-brass" disabled={Boolean(actionReason(s, { type: 'upgrade', plot: selectedPlot }))} onClick={() => game.act({ type: 'upgrade', plot: selectedPlot })}><ArrowUp/> Upgrade</Button><Button variant="outline" onClick={() => setDemolish(!demolish)}><Trash2/> Demolish</Button></div><p className="text-xs text-muted-foreground">{actionReason(s, { type: 'upgrade', plot: selectedPlot })}</p>{demolish && <div className="border-l-2 border-destructive pl-3 space-y-2"><p className="text-sm">Demolish this building? Returns 50% of its base cost; upgrades are not refunded.</p><Button variant="destructive" onClick={() => { game.act({ type: 'demolish', plot: selectedPlot }); setDemolish(false); }}>Confirm demolition</Button></div>}</div> : <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(BUILDINGS) as BuildingKind[]).map(kind => { const b = BUILDINGS[kind]; const Icon = BUILDING_ICONS[kind]; const a = { type: 'construct' as const, plot: selectedPlot, kind }; const reason = actionReason(s, a); return <article key={kind} className="rounded-md border border-copper/60 bg-secondary/30 p-3 space-y-2"><h4 className="flex gap-2 items-center text-sm text-brass"><Icon className="h-4 w-4"/>{b.name}</h4><p className="text-xs text-muted-foreground">{b.purpose}</p><p className="text-xs">{costText(b.cost)}</p><p className="text-xs text-steam">Produces {costText(b.output)}/s{Object.keys(b.input).length ? ' · Uses ' + costText(b.input) + '/s' : ''}</p><Button size="sm" className="btn-brass w-full" disabled={Boolean(reason)} onClick={() => game.act(a)}><Plus/>Construct</Button>{reason && <p className="text-xs text-muted-foreground">{reason}</p>}</article>; })}</div>}
 </>;
}
