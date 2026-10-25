import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cog } from 'lucide-react';
import type { ActionFeedback } from '@/game/action-feedback';
import { ScreenEffect } from '@/components/ScreenEffect';
import type { ContractCombo, UnlockNotice } from '@/game/city';

export function ActionPopup({ feedback, completionId = 0, combo = null, unlockNotices = [], dismissUnlock }: { feedback: ActionFeedback | null; completionId?: number; combo?: ContractCombo | null; unlockNotices?: UnlockNotice[]; dismissUnlock?: (id: number) => void }) {
 return (feedback || completionId > 0 || combo || unlockNotices.length > 0) && typeof document !== 'undefined'
  ? createPortal(<div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 overflow-y-auto p-4">
   <ScreenEffect trigger={feedback ?? { id: 0 }} completionId={completionId} combo={combo}/>
   {feedback && <PopupMessage key={`action-${feedback.id}`} {...feedback}/>}
   {combo && <PopupMessage key={`combo-${combo.id}`} message="CONTRACT COMPLETE!" category="progression" multiplier={combo.count}/>}
   {unlockNotices[0] && dismissUnlock && <UnlockPopup key={`unlock-${unlockNotices[0].id}`} notice={unlockNotices[0]} feedback={feedback} combo={combo} dismiss={dismissUnlock}/>}
  </div>, document.body)
  : null;
}
function popupHold(category?: ActionFeedback['category']) { return category === 'unlock' ? 2250 : category === 'progression' ? 3000 : category === 'trade' || category === 'walkout' ? 1750 : 1250; }
function UnlockPopup({ notice, feedback, combo, dismiss }: { notice: UnlockNotice; feedback: ActionFeedback | null; combo: ContractCombo | null; dismiss: (id: number) => void }) {
 const [readyFor, setReadyFor] = useState<string | null>(null);
 const [started, setStarted] = useState(false);
 const feedbackId = feedback?.id; const category = feedback?.category;
 const comboId = combo?.id; const blocker = `${feedbackId ?? -1}:${comboId ?? -1}`;
 const visible = readyFor === blocker;
 useEffect(() => {
  const delay = Math.max(feedbackId === undefined ? 0 : popupHold(category) + 500, comboId === undefined ? 0 : popupHold('progression') + 500);
  const timer = setTimeout(() => { setReadyFor(blocker); setStarted(true); }, delay);
  return () => clearTimeout(timer);
 }, [feedbackId, category, blocker, comboId]);
 useEffect(() => {
  if (!visible) return;
  const timer = setTimeout(() => dismiss(notice.id), popupHold('unlock') + 500);
  return () => clearTimeout(timer);
 }, [visible, notice.id, dismiss]);
 return <>{started && <ScreenEffect trigger={{ id:notice.id,effect:'blue-vignette' }}/>}
  {visible && <PopupMessage message={notice.message} detail="New opportunities await in your city ledger." category="unlock"/>}</>;
}

function PopupMessage({ message, quote, detail, category, multiplier = 1 }: Pick<ActionFeedback, 'message' | 'quote' | 'detail' | 'category'> & { multiplier?: number }) {
 const [phase, setPhase] = useState<'visible' | 'fading' | 'hidden'>('visible');
 useEffect(() => {
  const hold = popupHold(category);
  const fade = window.setTimeout(() => setPhase('fading'), hold);
  const remove = window.setTimeout(() => setPhase('hidden'), hold + 500);
  return () => { window.clearTimeout(fade); window.clearTimeout(remove); };
 }, [category]);
 if (phase === 'hidden') return null;
 return <div role="status" aria-live="polite" aria-atomic="true" data-phase={phase} className={`action-popup shrink-0 ${category === 'progression' || category === 'unlock' ? 'progression-popup' : ''} panel w-full max-w-lg p-2 text-center shadow-xl transition-opacity duration-500 ease-out motion-reduce:transition-none ${phase === 'fading' ? 'opacity-0' : 'opacity-100'}`}>
   <div className="rounded-md border border-brass/60 bg-iron-deep/90 px-5 py-7 sm:px-8">
    <Cog aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-copper"/>
    <p className="font-display text-2xl font-black tracking-wide text-brass sm:text-3xl">{message}{multiplier > 1 && <> <span className="combo-multiplier whitespace-nowrap" data-color={multiplier >= 4 ? 'red' : multiplier === 3 ? 'yellow' : 'green'}>{multiplier}x</span></>}</p>
    {detail && <p className="mt-3 text-sm text-foreground sm:text-base">{detail}</p>}
    {quote && <p className="mt-3 text-sm italic text-foreground sm:text-base">"{quote}"</p>}
   </div>
  </div>;
}
