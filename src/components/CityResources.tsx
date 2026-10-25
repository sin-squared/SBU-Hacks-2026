import { RESOURCE_NAMES, type Resource } from '@/game/city-config';
import { production, steamCapacity, type CityState } from '@/game/city';
import { formatNumber } from '@/game/economy';
import { RESOURCE_ICONS } from '@/components/ResourceAmounts';

const RESOURCE_ORDER: Resource[] = ['coins', 'oil', 'gears', 'steam', 'research', 'crystals'];

export function CityResources({ state }: { state: CityState }) {
 const rates = production({ ...state, lastProduction: null });
 return <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="City resources">
  {RESOURCE_ORDER.map(resource => {
   const net = rates.effectiveOutput[resource] - rates.effectiveInput[resource];
   const rounded = Number(net.toFixed(2));
   const Icon = RESOURCE_ICONS[resource];
   return <div key={resource} data-resource={resource} className="flex min-w-0 flex-col gap-2 rounded-md border border-copper/60 bg-iron-deep/90 p-3 shadow-md sm:p-4">
    <p className="flex items-center gap-2 text-sm font-bold text-steam"><Icon className="h-4 w-4 shrink-0 text-brass" aria-hidden="true" />{RESOURCE_NAMES[resource]}</p>
    <p className="break-all font-display text-2xl font-bold leading-tight tabular-nums text-brass sm:text-3xl">{formatNumber(state.resources[resource])}</p>
    {resource === 'steam' && <p className="text-xs text-muted-foreground">Capacity: {steamCapacity(state)}</p>}
    <p data-net-rate className={`mt-auto text-sm font-semibold tabular-nums ${rounded > 0 ? 'text-trade-reward' : rounded < 0 ? 'text-trade-cost' : 'text-muted-foreground'}`}>
     {rounded > 0 ? '+' : rounded < 0 ? '−' : ''}{rounded === 0 ? '0.0' : Math.abs(rounded)}{rounded !== 0 ? ` ${RESOURCE_NAMES[resource]}` : ''}<span className="text-xs"> /s</span>
    </p>
   </div>;
  })}
 </section>;
}
