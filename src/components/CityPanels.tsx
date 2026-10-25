import { useState } from 'react';
import { Bell, Check, CircleHelp, Factory, FlaskConical, Gauge, Lock, Package, ScrollText, Ship, Target, Trophy, UsersRound, Wrench, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BUILDINGS, CONTRACTS, TECHNOLOGIES, DESTINATIONS, ENGINE_STEPS, cityEvent } from '@/game/city-config';
import { actionReason, availableContracts, availableResearch, contractComplete, contractNeedsGuild, contractProgress, contractStatus, costText, eventState, eventTerms, interactiveEvents, isUnion, nextPlotTechnology, permitName, plotLimit, stage } from '@/game/city';
import { NewContentBadge } from '@/components/NewContentBadge';
import { ResourceAmounts } from '@/components/ResourceAmounts';
import type { CityGame } from '@/hooks/useCity';
function Meter({ value }: { value: number }) { return <progress className="city-progress w-full h-2" max={100} value={Math.min(100, Math.max(0, value))}/>; }
export function Contracts({ game }: { game: CityGame }) {
 const s = game.state;
 const visible = availableContracts(s)
  .sort((a, b) => Number(Boolean(actionReason(s, { type: 'contract', id: a.id }))) - Number(Boolean(actionReason(s, { type: 'contract', id: b.id }))));
 return <div className="space-y-3"><p className="text-xs text-muted-foreground">Deliveries spend stock; milestones only check progress.</p>{visible.map(c => {
  const done = s.contracts.includes(c.id);
  const complete = contractComplete(s, c);
  const reason = actionReason(s, { type: 'contract', id: c.id });
  const maintenance = 'requiredEmergencies' in c;
  const progress = contractProgress(s, c);
  const hideBalance = 'objective' in c && c.objective.kind === 'coinBalance';
  return <article data-completed={complete} className={`border-b border-copper/40 pb-4 space-y-2 ${complete ? 'completed-ledger-card bg-secondary/15 text-muted-foreground' : ''}`} key={c.id}>
   <h3 className="flex justify-between gap-2 font-bold text-brass">{c.title}{complete && <Check className="h-5 w-5 shrink-0"/>}</h3>
   <NewContentBadge game={game} category="contracts" id={c.id} completed={complete}/>
   <p className="text-xs font-semibold text-steam">{contractStatus(s, c)}</p>
   <p className="text-base text-trade-cost">{c.description}</p>
   {progress && !maintenance && !hideBalance && <><p className="text-base text-trade-cost">{progress.label}: {Math.min(progress.value, progress.target)}/{progress.target}</p><Meter value={progress.value / progress.target * 100}/></>}
   {maintenance && <>
    <p className="text-base text-trade-cost">Emergencies resolved: {Math.min(s.emergenciesResolved, c.requiredEmergencies)}/{c.requiredEmergencies}</p>
    <Meter value={s.emergenciesResolved / c.requiredEmergencies * 100}/>
    <details className="text-xs text-muted-foreground"><summary>What counts?</summary>Boiler repairs or safe venting, shortage purchases or salvage, breakdown repairs or scrapping, and union payments. Waiting or refusing wages does not count. Progress accumulates before unlocking.</details>
   </>}
   {Object.keys(c.cost).length > 0 && <p className="text-base" aria-label="Delivery requirements"><ResourceAmounts amounts={c.cost} available={s.resources} stock={s.resources} completed={complete}/></p>}
   {c.earned > 0 && <p className={`text-base ${s.earned + 1e-8 >= c.earned ? 'text-trade-reward' : 'text-trade-cost'}`}>Lifetime coins: {Math.floor(s.earned)}/{c.earned}</p>}
   {c.stage > 0 && <p className="text-xs text-muted-foreground">{permitName(c.stage)} Required</p>}
   {contractNeedsGuild(c) && <p className="text-xs text-muted-foreground">Requires The Tinkers' Guild delivery.</p>}
   {c.id === 'sky' && <p className="text-xs text-muted-foreground">Requires Improved Airships and a hull blueprint.</p>}
   <p className="text-sm text-amber" data-reward>Reward: <ResourceAmounts amounts={c.reward}/>{c.permit && ` · ${permitName(c.permit === 'industrial' ? 1 : 2)}`}{c.blueprint && ` · ${c.blueprint} blueprint`}</p>
   <Button size="sm" className="btn-brass" disabled={done || Boolean(reason)} onClick={() => game.act({ type: 'contract', id: c.id })}>{done ? 'Claimed' : progress ? 'Claim reward' : 'Deliver & claim'}</Button>
   {!done && reason && !hideBalance && <p className="text-xs text-muted-foreground">{reason}</p>}
  </article>;
 })}{visible.length === 0 && <p className="text-sm text-muted-foreground">No contracts awaiting delivery. Develop your city for new commissions.</p>}</div>;
}
export function ExpansionObjectives({ game, onOpenResearch }: { game: CityGame; onOpenResearch: () => void }) {
 const [open, setOpen] = useState(false);
 const s = game.state;
 const next = nextPlotTechnology(s);
 const reason = next ? actionReason(s, { type: 'technology', id: next.id }) : '';
 return <div className="city-objectives-control">
  <Button variant="outline" size="icon" aria-label="Expansion objectives" aria-expanded={open} aria-controls="city-expansion-objectives" title="Expansion objectives" onClick={() => setOpen(!open)}><Target aria-hidden="true"/></Button>
  <section id="city-expansion-objectives" className="city-objectives-panel space-y-3" aria-label="Expansion objectives" hidden={!open}>
   <h2 className="font-display text-brass">City objectives</h2>
   {next ? <>
    <p className="font-bold text-steam">Next expansion: Plot {next.unlockPlot}</p>
    <p className="text-sm text-muted-foreground">{next.name} · {next.description}</p>
    <p className="text-xs text-muted-foreground">Plots unlocked: {plotLimit(s)} / 12</p>
    <p className="text-sm"><ResourceAmounts amounts={next.cost} available={s.resources}/></p>
    <p className="text-xs text-muted-foreground">{reason || 'Requirements met. Unlock this expansion in Research.'}</p>
    <Button size="sm" className="btn-brass" onClick={onOpenResearch}>View Research</Button>
   </> : <p className="text-sm text-steam">All 12 plots are unlocked.</p>}
  </section>
 </div>;
}
export function Research({ game }: { game: CityGame }) {
 const s = game.state; const next = nextPlotTechnology(s);
 const topics = availableResearch(s).sort((a,b) =>
  Number(Boolean(actionReason(s,{type:'technology',id:a.id}))) - Number(Boolean(actionReason(s,{type:'technology',id:b.id}))) ||
  s.knownResearch.indexOf(b.id) - s.knownResearch.indexOf(a.id));
 return <div className="space-y-4">
  <p className="text-xs text-muted-foreground">Laboratories turn gears into research; early land needs no laboratory.</p>
  <h3 className="text-brass">Land office · {plotLimit(s)}/12 plots unlocked</h3>
  <p className="text-xs text-steam">Unlock one plot at a time. District permits unlock buildings, not land.</p>
  {!next ? <p className="text-brass">All plots unlocked!</p> : !s.hasBuiltOilRig && <p className="text-xs text-muted-foreground">Construct your first Oil Rig to unlock land research.</p>}
  <h3 className="text-brass">Available research · Purchasable first</h3>
  {topics.map(t => {
   const done = s.technologies.includes(t.id); const reason = actionReason(s, { type: 'technology', id: t.id });
   if ('unlockPlot' in t) return <article key={t.id} aria-label="Land expansion" className="border-l-2 border-brass bg-brass/10 py-3 pr-3 pl-4 space-y-2">
    <h4 className="font-bold text-brass">Unlock Plot {t.unlockPlot}</h4>
    <p className="text-xs font-bold text-steam">{t.name}</p>
    <NewContentBadge game={game} category="research" id={t.id}/>
    <p className="text-sm text-trade-cost">{t.description}</p>
    <p className="text-base" aria-label="Research price"><ResourceAmounts amounts={t.cost} available={s.resources}/></p>
    <Button size="sm" className="btn-brass" disabled={Boolean(reason)} onClick={() => game.act({ type: 'technology', id: t.id })}><Wrench/>Unlock Plot {t.unlockPlot}</Button>
    {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
   </article>;
   return <article data-completed={done} className={`border-l-2 border-copper pl-4 space-y-2 ${done ? 'completed-ledger-card bg-secondary/15 text-muted-foreground' : ''}`} key={t.id}>
    <h4 className="font-bold text-brass">{t.name}</h4><p className="text-sm text-trade-cost">{t.description}</p><p className="text-base" aria-label="Research price"><ResourceAmounts amounts={t.cost} available={s.resources} completed={done}/></p>
    <NewContentBadge game={game} category="research" id={t.id}/>
    <p className="text-xs text-muted-foreground">{t.requires && `Requires ${TECHNOLOGIES.find(p => p.id === t.requires)?.name}. `}{t.stage > 0 && `${permitName(t.stage)} Required`}</p>
    <Button size="sm" className={done ? '' : 'btn-brass'} disabled={done || Boolean(reason)} onClick={() => game.act({ type: 'technology', id: t.id })}>{done ? <Check/> : <Wrench/>}{done ? 'COMPLETED' : 'Research'}</Button>
    {!done && reason && <p className="text-xs text-muted-foreground">{reason}</p>}
   </article>;
  })}
  <h3 className="text-brass">District permits</h3>
  {['Foundry Row', permitName(1), permitName(2)].map((name, i) => <div className="flex gap-2 text-sm" key={name}>{stage(s) >= i ? <Check className="h-4 w-4 text-brass"/> : <Lock className="h-4 w-4"/>}{name}</div>)}
  <p className="text-xs text-muted-foreground">Industrial Charter grants the Industrial Permit; Aetherport Commission grants the Aetherport Permit.</p>
 </div>;
}
export function Expeditions({ game }: { game: CityGame }) {
 const s = game.state; const e = s.expedition; const d = e ? DESTINATIONS[e.destination] : null;
 return <div className="space-y-4">
  <p className="text-sm text-muted-foreground">Launch fees are paid upfront. Full cargo requires the paid encounter choice; safe salvage gives half the ordinary cargo, rounded down, without a blueprint or Ancient Core. Steam cargo is limited by available storage; excess is lost.</p>
  {e && d && <div className="border-l-2 border-brass pl-3 space-y-3">
   <h3 className="font-bold text-brass">{d.name} · Underway</h3>
   <p className="font-display text-amber">{Math.max(0, Math.ceil((e.endsAt - game.now) / 1000))} seconds remaining</p>
   <Meter value={(1 - Math.max(0, e.endsAt - game.now) / (d.duration * 1000 * (s.technologies.includes('airships') ? .75 : 1))) * 100}/>
   {e.choice === null ? <><p>{d.event}</p>{d.choices.map((label, i) => {
    const reason = actionReason(s, { type: 'expeditionChoice', index: i }, game.now);
    return <div key={label}><Button variant="outline" className="w-full whitespace-normal h-auto min-h-9" disabled={Boolean(reason)} onClick={() => game.act({ type: 'expeditionChoice', index: i })}>{label}</Button>{reason && <p className="text-xs text-muted-foreground">{reason}</p>}</div>;
   })}</> : <p className="text-sm text-muted-foreground">{e.choice === 0 ? 'Vault secured · full cargo and blueprint' : 'Safe salvage · half cargo, no blueprint'}</p>}
   <Button className="btn-brass" disabled={Boolean(actionReason(s, { type: 'collect' }, game.now))} onClick={() => game.act({ type: 'collect' })}>Collect expedition cargo</Button>
  </div>}
  {DESTINATIONS.map((destination, i) => {
   const reason = actionReason(s, { type: 'launch', index: i });
   return <article key={destination.id} className="border-b border-copper/40 pb-3 space-y-2">
    <h3 className="font-bold text-brass flex gap-2"><Ship className="h-4 w-4 shrink-0"/>{destination.name}</h3>
    <p className="text-xs text-muted-foreground">{Math.ceil(destination.duration * (s.technologies.includes('airships') ? .75 : 1))}s · {costText(destination.cost)}</p>
    <p className="text-xs">Full cargo: {costText(destination.reward)} · {destination.blueprint} blueprint{destination.artifact ? ' · Ancient Core artifact' : ''}</p>
    <Button size="sm" className="btn-brass" disabled={Boolean(reason)} onClick={() => game.act({ type: 'launch', index: i })}>Launch expedition</Button>
    {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
   </article>;
  })}
  <p className="text-xs text-muted-foreground">Blueprints: {s.blueprints.join(', ') || 'None recovered'} · {s.artifact ? 'Ancient Core recovered' : 'Ancient Core missing'}</p>
 </div>;
}
export function EngineProject({ game }: { game: CityGame }) {
 const s = game.state;
 return <div className="space-y-4">
  {s.victory ? <div className="text-center py-6"><Trophy className="mx-auto h-16 w-16 text-brass animate-flicker"/><h2 className="mt-4 text-2xl text-brass">The Great Engine Lives</h2><p className="mt-2 text-trade-cost">Brasshaven's lamps blaze. The clockwork city rises again.</p></div>
   : <><h3 className="text-brass">The Great Engine</h3><Meter value={s.engineStep / 3 * 100}/></>}
  {ENGINE_STEPS.map((step, i) => <div className="border-l-2 border-copper pl-3 space-y-2" key={step.name}>
   <h4 className="flex items-center gap-2 text-sm text-brass">{s.engineStep > i ? <Check className="h-4 w-4"/> : <span>{i + 1}.</span>}{step.name}</h4>
   <p className="text-base text-trade-cost" aria-label="Engine price"><ResourceAmounts amounts={step.cost}/></p>
   <p className="text-base text-trade-cost">{step.blueprint} blueprint{step.artifact ? ' + Ancient Core artifact' : ''}</p>
   <p className="text-sm text-trade-cost">{i === 2 ? 'Restores the Great Engine and wins the game.' : 'Unlocks the next restoration stage.'}</p>
   {s.engineStep === i && <><Button className="btn-brass" disabled={Boolean(actionReason(s, { type: 'engine' }))} onClick={() => game.act({ type: 'engine' })}>Complete project step</Button><p className="text-xs text-muted-foreground">{actionReason(s, { type: 'engine' })}</p></>}
  </div>)}
 </div>;
}
export function CityEvent({ game, shortages = [] }: { game: CityGame; shortages?: string[] }) {
  const [openEventIndex, setOpenEventIndex] = useState<number | null>(null);
  const events = interactiveEvents(game.state);
  const openEvent = events.find(event => event.eventIndex === openEventIndex);
  return <>
    <div role="region" aria-label="Gameplay messages" className="city-gameplay-notifications">
      <p aria-live="polite" className="city-notification-card text-sm text-brass">{game.state.notice}</p>
      {shortages.length > 0 && <p aria-live="polite" className="city-notification-card text-sm text-destructive">{shortages.join(' · ')}. Machines pause when supplies run out.</p>}
      {game.state.shortageSeconds > 0 && <p role="status" className="city-notification-card text-sm text-steam">Supply shortage: Gear-producing buildings run at 50% output for {Math.ceil(game.state.shortageSeconds)}s. Input consumption is unchanged.</p>}
    </div>
    <div role="region" aria-label="City alerts" className="city-alert-stack">
      {events.map(event => {
        const eventStateValue = eventState(game.state, event);
        const eventData = cityEvent(event.eventIndex);
        if (!eventData) return null;
        const plot = event.eventPlot === null ? null : eventStateValue.plots[event.eventPlot];
        const description = plot && event.eventPlot !== null
          ? isUnion(eventStateValue)
            ? `${eventData.description} Affected workplace: ${BUILDINGS[plot.kind].name} on plot ${event.eventPlot + 1}. Production continues while you decide.`
            : `${BUILDINGS[plot.kind].name} on plot ${event.eventPlot + 1} has broken down. Production is paused until you repair or scrap it.`
          : eventData.description;
        return <button
          key={event.eventIndex}
          type="button"
          onClick={() => setOpenEventIndex(event.eventIndex)}
          className="city-alert-card w-full shrink-0 rounded-lg border-2 border-brass bg-background p-3 text-left shadow-lg"
        >
          <span className="block text-xs font-bold uppercase text-muted-foreground">⚠️ City Alert · Click to Respond</span>
          <span className="mt-2 block font-semibold text-brass">{eventData.title}</span>
          <span className="mt-1 block text-sm">{description}</span>
          <span className="mt-3 block text-xs text-muted-foreground">{openEventIndex === event.eventIndex ? 'Details shown above ↑' : 'View details →'}</span>
        </button>;
      })}
    </div>
    {openEvent && <CityEventPanel
      game={{ ...game, state: eventState(game.state, openEvent) }}
      onClose={() => setOpenEventIndex(null)}
    />}
  </>;
}
function CityEventPanel({ game, onClose }: { game: CityGame; onClose: () => void }) {

  const s = game.state;

  if (!s.eventActive) return null;

  const event =
    cityEvent(s.eventIndex);

  if (!event) return null;
  const EventIcon = cityEventIcon(event);

  const damagedBuilding = s.eventPlot === null ? null : s.plots[s.eventPlot];
  const description = damagedBuilding && s.eventPlot !== null
    ? isUnion(s) ? `${event.description} Affected workplace: ${BUILDINGS[damagedBuilding.kind].name} on plot ${s.eventPlot + 1}. Production continues while you decide.`
    : `${BUILDINGS[damagedBuilding.kind].name} on plot ${s.eventPlot + 1} has broken down. Production is paused until you repair or scrap it.`
    : event.description;

  return (
      <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border-2 border-brass bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-copper/60 bg-iron-deep text-brass">
                  <EventIcon aria-hidden="true" className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{event.title === 'Travelling brass merchant' ? 'Trading Delegation' : 'City Emergency'}</p>
                  <DialogTitle className="mt-1 text-xl font-bold text-brass">{event.title}</DialogTitle>
                </div>
              </div>
            </div>
            <DialogDescription className="mt-4 text-sm">{description}</DialogDescription>
            <div className="mt-5 space-y-4">
              {event.options.map((option, index) => {
                const terms = eventTerms(s, index);
                const character = 'character' in option ? option.character : null;
                const quote = 'risk' in option && (s.technologies.includes('fineprint') || s.technologies.includes('bargain'))
                  ? `No contracts, no witnesses. ${costText(terms.cost)} buys a ${option.risk.probability * 100}% chance at ${costText(terms.riskReward)}. The rest keep your money.`
                  : character?.quote;
                const Icon = character?.icon === 'ship' ? Ship : character?.icon === 'wrench' ? Wrench : character?.icon === 'risk' ? CircleHelp : Factory;
                const reason = actionReason(s, {
                  type: 'event',
                  index,
                  eventIndex: s.eventIndex,
                });

                return (
                  <div
                    key={option.label}
                    className="rounded-lg border border-copper/50 p-3"
                  >
                    {character && <div className={`mb-3 border-l-2 pl-3 ${character.style}`}>
                      <h3 className="flex items-start gap-2 font-display text-sm font-bold uppercase"><Icon aria-hidden="true" className="h-5 w-5 shrink-0"/>OFFER FROM: {character.name}, {character.role}</h3>
                      <blockquote className="mt-2 rounded bg-secondary/40 p-3 text-sm italic text-foreground">"{quote}"</blockquote>
                    </div>}
                    {character && <div className="mb-3 space-y-2">
                      <p className="text-base font-semibold text-trade-cost"><span>You pay:</span> {costText(terms.cost)}</p>
                      {(s.technologies.includes('fineprint') || s.technologies.includes('bargain')) && <p className="text-xs text-steam">{s.technologies.includes('fineprint') && '20% trader discount (costs rounded up). '}{s.technologies.includes('bargain') && '25% successful reward bonus (rewards rounded down).'}</p>}
                      {'risk' in option ? <>
                        <p className="text-xs text-muted-foreground">Upfront cost is paid in both outcomes.</p>
                        <p className="text-base font-semibold text-trade-reward">Potential reward: {option.risk.probability * 100}% chance: receive {costText(terms.riskReward)} (net +{(terms.riskReward.coins ?? 0) - (terms.cost.coins ?? 0)} Brass Coins).</p>
                        <p className="text-base font-semibold text-trade-cost">{(1 - option.risk.probability) * 100}% chance: lose the entry cost ({costText(terms.cost)}).</p>
                      </> : Object.keys(terms.reward).length > 0 && <p className="text-base font-semibold text-trade-reward"><span>You receive:</span> {costText(terms.reward)}</p>}
                    </div>}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-10 w-full whitespace-normal"
                      disabled={Boolean(reason)}
                      onClick={() => {
                        game.act({
                          type: 'event',
                          index,
                          eventIndex: s.eventIndex,
                        });

                        onClose();
                      }}
                    >
                      {option.label}
                    </Button>

                    <div className="mt-2 space-y-1 text-xs">
                      {!character && <p>
                        <span className="font-semibold">
                          Cost:
                        </span>{' '}
                        {costText(option.cost) || 'Nothing'}
                      </p>}

                      {!character && Object.keys(option.reward).length > 0 && <p>
                        <span className="font-semibold">
                          Reward:
                        </span>{' '}
                        {costText(option.reward)}
                      </p>}

                      {'consequence' in option && <p className="text-brass"><span className="font-semibold">Consequence:</span> {option.consequence}</p>}
                      {reason && (
                        <p className="text-destructive">
                          {reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {event.title === 'Travelling brass merchant' && <div className="border-t border-copper/50 pt-3">
               <p className="mb-2 text-xs text-muted-foreground">Not today. My money is safer in my pocket.</p>
               <Button variant="outline" className="w-full" onClick={() => { game.act({type:'declineTrade',eventIndex:s.eventIndex}); onClose(); }}>Leave It Be</Button>
              </div>}
            </div>
        </DialogContent>
      </Dialog>
  );
}

function cityEventIcon(event: NonNullable<ReturnType<typeof cityEvent>>): LucideIcon {
  if ('id' in event) {
    if (event.id === 'worker-union') return UsersRound;
    if (event.id === 'equipment-breakdown') return Factory;
  }

  switch (event.title) {
    case 'Boiler malfunction': return Gauge;
    case 'Travelling brass merchant': return ScrollText;
    case 'Supply Shortage': return Package;
    case 'Machinery discovery': return FlaskConical;
    case 'Guild overtime': return Factory;
    case 'WORKERS DEMAND FAIR WAGES': return UsersRound;
    default: return Bell;
  }
}