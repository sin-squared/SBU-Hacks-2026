import { RESOURCE_NAMES, type Resource } from '@/game/city-config';
import { production, steamCapacity, type CityState } from '@/game/city';
import { formatNumber } from '@/game/economy';

const RESOURCE_ORDER: Resource[] = ['coins', 'oil', 'gears', 'steam', 'research', 'crystals'];

export function CityResources({ state }: { state: CityState }) {
 const rates = production({ ...state, lastProduction: null });
 return <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="City resources">
  {RESOURCE_ORDER.map(resource => {
   const net = rates.effectiveOutput[resource] - rates.effectiveInput[resource];
   const rounded = Number(net.toFixed(2));
   return <div key={resource} data-resource={resource} className="border-l-2 border-copper bg-secondary/30 p-3 sm:p-4 min-w-0 flex flex-col gap-2">
    <p className="text-base font-bold text-steam">{RESOURCE_NAMES[resource]}</p>
    <p className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-tight font-bold text-brass tabular-nums break-all">{formatNumber(state.resources[resource])}</p>
    {resource === 'steam' && <p className="text-xs text-muted-foreground">Capacity: {steamCapacity(state)}</p>}
    <p data-net-rate className={`mt-auto text-sm font-semibold tabular-nums ${rounded > 0 ? 'text-trade-reward' : rounded < 0 ? 'text-trade-cost' : 'text-muted-foreground'}`}>
     {rounded > 0 ? '+' : rounded < 0 ? '−' : ''}{rounded === 0 ? '0.0' : Math.abs(rounded)}{rounded !== 0 ? ` ${RESOURCE_NAMES[resource]}` : ''}<span className="text-xs"> /s</span>
    </p>
   </div>;
  })}
 </section>;
}
