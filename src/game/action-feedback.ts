import { CITY_EVENTS, cityEvent, DESTINATIONS, ENGINE_STEPS, type BuildingKind } from './city-config';
import { reconcileContent } from './city';
import type { CityAction, CityState } from './city';

export interface ActionFeedback { id: number; message: string; quote?: string; detail?: string; category?: 'trade' | 'walkout' | 'progression' | 'unlock'; effect?: 'red-vignette' | 'green-vignette' | 'blue-vignette' }

const BUILDING_MESSAGES: Record<BuildingKind, string> = {
 oilrig: 'OIL RIG ONLINE!',
 steamrig: 'STEAM RIG ONLINE!',
 refinery: 'REFINERY ONLINE!',
 workshop: 'WORKSHOP BUILT!',
 boiler: 'BOILER ONLINE!',
 bakery: 'BAKERY OPEN!',
 factory: 'FACTORY ONLINE!',
 laboratory: 'LAB ONLINE!',
 dock: 'DOCK ESTABLISHED!',
};
const EXPEDITION_MESSAGES: Record<typeof DESTINATIONS[number]['id'], { launch: string; encounter: readonly [string, string]; collect: readonly [string, string] }> = {
 observatory: { launch: 'OBSERVATORY BOUND!', encounter: ['STAR CHAMBER OPENED!', 'INSTRUMENTS SALVAGED!'], collect: ['LENS BLUEPRINT SECURED!', 'INSTRUMENTS RECOVERED!'] },
 ironwood: { launch: 'IRONWOOD BOUND!', encounter: ['BRIDGE CROSSED!', 'SAFE SALVAGE!'], collect: ['HULL BLUEPRINT SECURED!', 'CARGO SALVAGED!'] },
 foundry: { launch: 'FOUNDRY BOUND!', encounter: ['CORE VAULT BREACHED!', 'OUTER SALVAGE!'], collect: ['ANCIENT CORE RECOVERED!', 'FOUNDRY SALVAGED!'] },
};
const ENGINE_MESSAGES = ['CHASSIS REBUILT!', 'LENS CALIBRATED!', 'ENGINE IGNITED!'] as const;
const EVENT_MESSAGES: Record<typeof CITY_EVENTS[number]['title'], readonly string[]> = {
 'Boiler malfunction': ['BOILER REPAIRED!', 'PRESSURE RELEASED!'],
 'Travelling brass merchant': ['CRYSTALS ACQUIRED!', 'GEARS TRADED!'],
 'Supply Shortage': ['SUPPLIES SECURED!', 'TEMPORARY FIX!', 'PROBLEMS MAY WORSEN...'],
 'Machinery discovery': ['KNOWLEDGE GAINED!', 'SCRAP SOLD!'],
 'Guild overtime': ['OVERTIME PAID!', 'STEADY SHIFT!'],
 'Equipment breakdown': ['MACHINE RESTORED!', 'BUILDING SCRAPPED!'],
 'WORKERS DEMAND FAIR WAGES': ['WORKERS PAID!', 'WAGES WITHHELD!'],
};

function actionMessage(before: CityState, action: CityAction): string | undefined {
 switch (action.type) {
 case 'construct': return BUILDING_MESSAGES[action.kind];
 case 'upgrade': return 'UPGRADE COMPLETE!';
 case 'demolish': return 'BUILDING DISMANTLED!';
 case 'technology': return 'RESEARCH COMPLETE!';
 case 'launch': { const destination = DESTINATIONS[action.index]; return destination && EXPEDITION_MESSAGES[destination.id].launch; }
 case 'expeditionChoice':
 case 'collect': {
  const expedition = before.expedition;
  const destination = expedition && DESTINATIONS[expedition.destination];
  if (!expedition || !destination) return undefined;
  const messages = EXPEDITION_MESSAGES[destination.id];
  return action.type === 'expeditionChoice' ? messages.encounter[action.index] : messages.collect[expedition.choice === 0 ? 0 : 1];
 }
 case 'engine': return ENGINE_MESSAGES[before.engineStep];
 case 'event': {
  const event = cityEvent(before.eventIndex);
  const option = event?.options[action.index];
  if (option && 'risk' in option) return action.randomRoll !== undefined && action.randomRoll < option.risk.probability ? option.risk.successPopup : option.risk.failurePopup;
  if (option && 'popup' in option) return option.popup;
  return event && EVENT_MESSAGES[event.title][action.index];
 }
 case 'reset': return 'CITY RESET!';
 case 'demo': return 'DEMO LOADED!';
 default: return undefined;
 }
}

// Call only after validation and the corresponding state transition succeed.
export function withActionFeedback(before: CityState, next: CityState, action: CityAction): CityState {
 next = reconcileContent(next, action.type !== 'reset' && action.type !== 'demo');
 if (action.type === 'contract') return { ...next, lastProduction: null };
 const repaired = action.type === 'event' && action.index === 0 && cityEvent(before.eventIndex)?.title === 'Equipment breakdown';
 if (repaired) return { ...next, lastProduction: null };
 const message = actionMessage(before, action);
 if (!message) throw new Error(`Missing action popup message for ${action.type}`);
 const option = action.type === 'event' ? cityEvent(before.eventIndex)?.options[action.index] : undefined;
 const quote = option && 'risk' in option
  ? action.type === 'event' && action.randomRoll !== undefined && action.randomRoll < option.risk.probability ? option.risk.successQuote : option.risk.failureQuote
  : option && 'popupQuote' in option ? option.popupQuote : undefined;
 const trade = option && 'character' in option;
 const failedTrade = option && 'risk' in option && action.type === 'event' && action.randomRoll !== undefined && action.randomRoll >= option.risk.probability;
 const event = action.type === 'event' ? cityEvent(before.eventIndex) : undefined;
 const scrappedMachine = event && 'id' in event && event.id === 'equipment-breakdown' && action.type === 'event' && action.index === 1;
 let detail: string | undefined;
 if (action.type === 'engine') detail = before.engineStep === 2 ? 'The Great Engine awakens. Brasshaven rises again!' : ENGINE_STEPS[before.engineStep]?.name;
 return withFeedback(before, { ...next, lastProduction: null }, { message, ...(quote ? { quote } : {}), ...(detail ? { detail, category: 'progression' as const } : {}), ...(trade ? { category: 'trade' as const } : {}), ...(action.type === 'technology' ? { category: 'progression' as const, effect: 'green-vignette' as const } : failedTrade || scrappedMachine ? { effect: 'red-vignette' as const } : {}) });
}

export function withFeedback(before: CityState, next: CityState, feedback: Omit<ActionFeedback, 'id'>): CityState {
 return { ...next, actionFeedback: { id: (before.actionFeedback?.id ?? 0) + 1, ...feedback } };
}
