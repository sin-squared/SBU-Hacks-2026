import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Cog, Coins, Settings, ScrollText, Ship, FlaskConical, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CityManagement } from '@/components/CityManagement';
import { Contracts, Research, Expeditions, EngineProject, CityEvent } from '@/components/CityPanels';
import { RESOURCE_NAMES, type Resource } from '@/game/city-config';
import { production, stage, steamCapacity } from '@/game/city';
import { formatNumber } from '@/game/economy';
import { useCity } from '@/hooks/useCity';

export const Route = createFileRoute('/')({
 head: () => ({ meta: [
  { title: 'Brasshaven: Rise of the Clockwork City' },
  { name: 'description', content: 'Manage a steampunk city: balance gears and steam, fulfill contracts, explore lost frontiers, and restore the Great Engine.' },
  { property: 'og:title', content: 'Brasshaven: Rise of the Clockwork City' },
  { property: 'og:description', content: 'Build a resource-driven clockwork city with contracts, research, airship expeditions, and an ancient engine to restore.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
 ] }), component: Index,
});
const TABS = [{ name: 'Contracts', icon: ScrollText }, { name: 'Research', icon: FlaskConical }, { name: 'Expeditions', icon: Ship }, { name: 'Great Engine', icon: Wrench }] as const;
function Index() {
 const game = useCity(); const [tab, setTab] = useState<string>('Contracts'); const [settings, setSettings] = useState(false); const [confirmation, setConfirmation] = useState<'reset' | 'demo' | null>(null);
 if (!game.loaded) return <div className="min-h-screen flex items-center justify-center text-brass">Stoking the boilers…</div>;
 const s = game.state; const rates = production(s);
 return <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-5">
 <header className="flex items-center justify-between gap-3 border-b-2 border-copper pb-4"><div className="flex items-center gap-3"><Cog className="h-9 w-9 text-brass animate-spin-slow"/><div><h1 className="text-2xl sm:text-3xl font-black text-brass-gradient">Brasshaven</h1><p className="text-xs text-muted-foreground font-display">Rise of the Clockwork City</p></div></div><div className="flex items-center gap-2"><span className="hidden sm:block text-sm text-brass">{['Workshop', 'Industrial Quarter', 'Aetherport'][stage(s)]}</span><Button variant="outline" size="icon" aria-label="Settings" title="Settings" onClick={() => setSettings(!settings)}><Settings/></Button></div></header>
 {s.demo && <div className="border border-brass p-3 text-sm text-brass">DEMO CITY · Accelerated starting resources; expedition blueprints and the Ancient Core still need to be recovered.</div>}
 {settings && <section className="border-y border-copper py-4 space-y-3"><h2 className="text-brass">Ledger settings</h2><p className="text-sm text-muted-foreground">{game.saveError ? 'Saving is unavailable. Allow browser storage to keep your city.' : 'Saved automatically in this browser. Offline production is capped at two hours.'}</p><div className="flex gap-2 flex-wrap"><Button variant="outline" onClick={() => setConfirmation('reset')}>Reset city</Button><Button variant="outline" onClick={() => setConfirmation('demo')}>Load demo city</Button></div>{confirmation && <div className="space-y-2"><p className="text-sm">{confirmation === 'reset' ? 'Erase all city progress and start again?' : 'Replace your saved city with a late-game demo?'} This cannot be undone.</p><Button variant="destructive" onClick={() => { if (confirmation === 'reset') game.reset(); else game.act({ type: 'demo' }); setConfirmation(null); setSettings(false); }}>Confirm {confirmation}</Button><Button variant="ghost" onClick={() => setConfirmation(null)}>Cancel</Button></div>}</section>}
 <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="City resources">{(Object.keys(RESOURCE_NAMES) as Resource[]).map(k => <div key={k} className="border-l-2 border-copper bg-secondary/30 p-3 min-w-0"><p className="text-xs text-muted-foreground">{RESOURCE_NAMES[k]}</p><p className="font-display text-xl text-brass tabular-nums">{formatNumber(s.resources[k])}{k === 'steam' && <span className="text-sm text-muted-foreground">/{steamCapacity(s)}</span>}</p><p className="text-xs text-steam">+{rates.output[k].toFixed(2)}/s <span className="text-muted-foreground">−{rates.input[k].toFixed(2)}/s</span></p></div>)}</section>
 <div className="flex flex-wrap items-center justify-between gap-3 border-y border-copper/40 py-3"><p role="status" aria-live="polite" className="text-sm text-brass">{s.notice}</p><Button className="btn-brass" onClick={() => game.act({ type: 'click' })}><Coins/>Crank the Great Engine · +2</Button></div>
 {rates.shortages.length > 0 && <p className="text-sm text-destructive">{rates.shortages.join(' · ')}. Machines pause when supplies run out.</p>}
 {game.saveError && <p role="alert" className="text-destructive">Your city cannot be saved. Browser storage may be disabled or full.</p>}
 <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]"><div className="min-w-0"><CityManagement game={game}/><CityEvent game={game}/></div><section className="min-w-0 lg:border-l lg:border-copper/50 lg:pl-6"><nav aria-label="City management" className="grid grid-cols-2 gap-2 mb-5">{TABS.map(t => <Button key={t.name} variant={tab === t.name ? 'default' : 'outline'} className={tab === t.name ? 'btn-brass' : ''} onClick={() => setTab(t.name)}><t.icon/>{t.name}</Button>)}</nav>{tab === 'Contracts' && <Contracts game={game}/>}{tab === 'Research' && <Research game={game}/>}{tab === 'Expeditions' && <Expeditions game={game}/>}{tab === 'Great Engine' && <EngineProject game={game}/>}</section></div>
 <footer className="border-t border-copper/40 pt-4 text-xs text-muted-foreground flex justify-between"><span>Brasshaven City Ledger</span><span>{game.saveError ? 'Save unavailable' : 'Auto-save active'} · {s.contracts.length} contracts delivered</span></footer>
 </main>;
}
