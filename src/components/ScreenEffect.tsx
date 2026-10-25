import { useEffect, useRef, useState } from 'react';
import type { ActionFeedback } from '@/game/action-feedback';
import type { ContractCombo } from '@/game/city';

export function ScreenEffect({ trigger, completionId = 0, combo = null }: { trigger: Pick<ActionFeedback, 'id' | 'effect'>; completionId?: number; combo?: ContractCombo | null }) {
 const [active, setActive] = useState<Partial<Record<NonNullable<ActionFeedback['effect']>, number>>>({});
 const previous = useRef({ id: -1, effect: trigger.effect, completionId: 0, comboId: 0 });
 const comboId = combo?.id ?? 0; const comboCount = combo?.count ?? 0;
 useEffect(() => {
  const effects = new Set<NonNullable<ActionFeedback['effect']>>();
  const sharedGreen = comboId !== previous.current.comboId && comboCount > 0 && comboCount <= 2;
  if (trigger.effect && !(sharedGreen && trigger.effect === 'green-vignette') && (previous.current.id !== trigger.id || previous.current.effect !== trigger.effect)) effects.add(trigger.effect);
  if (completionId > 0 && previous.current.completionId !== completionId) effects.add('green-vignette');
  previous.current = { id: trigger.id, effect: trigger.effect, completionId, comboId };
  if (effects.size) setActive(current => { const next = { ...current }; for (const effect of effects) next[effect] = (next[effect] ?? 0) + 1; return next; });
 }, [trigger.id, trigger.effect, completionId, comboId, comboCount]);
 return <>{Object.entries(active).map(([effect, id]) => <Vignette key={`${effect}-${id}`} color={effect === 'green-vignette' ? 'research' : effect === 'blue-vignette' ? 'unlock' : 'failure'}/>)}
  {combo && <Vignette key={`combo-${combo.id}`} color={combo.count >= 4 ? 'failure' : combo.count === 3 ? 'combo-yellow' : 'research'} combo/>}
 </>;
}

function Vignette({ color, combo = false }: { color: 'research' | 'unlock' | 'failure' | 'combo-yellow'; combo?: boolean }) {
 const [visible, setVisible] = useState(true);
 useEffect(() => {
  const timer = window.setTimeout(() => setVisible(false), 1250);
  return () => window.clearTimeout(timer);
 }, []);
 return visible ? <div aria-hidden="true" data-contract-combo={combo || undefined} className={`screen-vignette ${color}-vignette pointer-events-none fixed inset-0 z-[55]`}/> : null;
}
