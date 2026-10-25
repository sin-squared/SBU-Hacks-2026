export type Resource = 'coins' | 'gears' | 'steam' | 'crystals' | 'research' | 'oil';
export type Stock = Record<Resource, number>;
export type Cost = Partial<Stock>;
export type BuildingKind = 'oilrig' | 'steamrig' | 'refinery' | 'workshop' | 'boiler' | 'factory' | 'laboratory' | 'bakery' | 'dock';
export const RESOURCE_NAMES: Record<Resource, string> = { coins: 'Brass Coins', gears: 'Gears', steam: 'Steam Components', crystals: 'Aether Crystals', research: 'Research', oil: 'Oil' };
export const BALANCE = { startingCoins: 135, startingGears: 12, startingSteam: 8, baseSteamCapacity: 30, boilerCapacity: 45, maxLevel: 3, offlineCap: 7200, eventInterval: 15, demolitionRefund: .5 };
export const LEVEL_OUTPUT = [1, 1.2, 1.4] as const;
export const UPGRADE_COST = [.15, .20] as const;
// Suppliers precede consumers; consumer priority is independent of plot placement.
export const PRODUCTION_ORDER: readonly BuildingKind[] = ['oilrig', 'workshop', 'boiler', 'steamrig', 'factory', 'bakery', 'laboratory', 'dock', 'refinery'];
export const BUILDINGS: Record<BuildingKind, { name: string; purpose: string; stage: number; cost: Cost; output: Cost; input: Cost }> = {
 oilrig: { name: 'Oil Rig', purpose: 'Generates oil and passive Brass Coin income', stage: 0, cost: { coins: 135 }, output: { oil: .8, coins: 2.5 }, input: {} },
 workshop: { name: 'Clockwork Workshop', purpose: 'Handcrafted gears & repair income', stage: 0, cost: { coins: 75 }, output: { gears: .45, coins: .3 }, input: {} },
 steamrig: { name: 'Steam Rig', purpose: 'Turns oil into steam; +45 storage per level', stage: 0, cost: { coins: 90, gears: 8 }, output: { steam: .9 }, input: { oil: .4 } },
 boiler: { name: 'Boiler House', purpose: 'Backup steam, adjacency bonus & +45 storage per level', stage: 0, cost: { coins: 165, gears: 10 }, output: { steam: .25 }, input: {} },
 bakery: { name: 'Steam Bakery', purpose: 'Turns steam into steady coin income', stage: 0, cost: { coins: 270, gears: 12, steam: 10 }, output: { coins: 2.5 }, input: { steam: .2 } },
 laboratory: { name: "Inventor's Laboratory", purpose: 'Consumes gears to advance research', stage: 0, cost: { coins: 225, gears: 15 }, output: { research: .3 }, input: { gears: .12 } },
 factory: { name: 'Gear Factory', purpose: 'Efficient steam-powered gear production', stage: 1, cost: { coins: 600, gears: 40, steam: 20, oil: 30 }, output: { gears: 1.5, coins: 1 }, input: { steam: .6 } },
 dock: { name: 'Airship Dock', purpose: 'Trade income & expedition launch access', stage: 2, cost: { coins: 1050, gears: 70, steam: 40, crystals: 4, oil: 40 }, output: { coins: 5 }, input: { steam: .15 } },
 refinery: { name: 'Aether Refinery', purpose: 'Refines oil and steam into Aether Crystals', stage: 2, cost: { coins: 1200, gears: 80, steam: 40, crystals: 4, oil: 40 }, output: { crystals: .05 }, input: { oil: .2, steam: .3 } },
};
export const PLOT_TECHNOLOGIES = [
 { id: 'plot3', name: 'A Little More Elbow Room', description: 'Adds one building plot without a laboratory.', unlockPlot: 3, cost: { coins: 45, oil: 12 }, requires: '', stage: 0 },
 { id: 'plot4', name: 'Plot Twist!', description: 'Adds room for another building.', unlockPlot: 4, cost: { coins: 90, oil: 25 }, requires: 'plot3', stage: 0 },
 { id: 'plot5', name: 'The Yard Expander-inator', description: 'Expands your building space.', unlockPlot: 5, cost: { coins: 180, oil: 50 }, requires: 'plot4', stage: 0 },
 { id: 'plot6', name: 'Land Ho, More Land!', description: 'Adds space for your growing industry.', unlockPlot: 6, cost: { coins: 300, oil: 80, gears: 25 }, requires: 'plot5', stage: 0 },
 { id: 'plot7', name: 'Acre-onomics', description: 'Makes room for more production.', unlockPlot: 7, cost: { coins: 450, oil: 120, gears: 40 }, requires: 'plot6', stage: 0 },
 { id: 'plot8', name: 'The Steam-Powered Fence Negotiator', description: 'Expands the industrial yard.', unlockPlot: 8, cost: { coins: 650, oil: 160, gears: 60, steam: 30 }, requires: 'plot7', stage: 0 },
 { id: 'plot9', name: 'The Great Dirtquisition', description: 'Adds another production site.', unlockPlot: 9, cost: { coins: 900, oil: 220, gears: 90, steam: 50, research: 25 }, requires: 'plot8', stage: 0 },
 { id: 'plot10', name: 'The Lawn of Unintended Consequences', description: 'Makes room for advanced machinery.', unlockPlot: 10, cost: { coins: 1200, oil: 280, gears: 120, steam: 70, research: 40 }, requires: 'plot9', stage: 0 },
 { id: 'plot11', name: 'Aether Acres and a Mule Automaton', description: 'Adds space for late-game industry.', unlockPlot: 11, cost: { coins: 1800, oil: 360, gears: 160, steam: 100, research: 60, crystals: 8 }, requires: 'plot10', stage: 0 },
 { id: 'plot12', name: 'The Final Front Yard', description: "Opens the city's final building plot.", unlockPlot: 12, cost: { coins: 2500, oil: 450, gears: 220, steam: 140, research: 90, crystals: 15 }, requires: 'plot11', stage: 0 },
] as const;
export const TECHNOLOGIES = [
 { id: 'boilers', name: 'Efficient Boilers', description: 'Boiler Houses and Steam Rigs produce 50% more steam without extra fuel.', cost: { research: 20, gears: 15 }, requires: '', stage: 0 },
 { id: 'automation', name: 'Automated Production', description: 'Workshops and factories produce 50% more gears.', cost: { research: 50, gears: 40 }, requires: 'boilers', stage: 1 },
 { id: 'airships', name: 'Improved Airships', description: 'Unlocks Aetherport permit; expeditions are 25% faster.', cost: { research: 90, crystals: 3 }, requires: 'automation', stage: 1 },
 { id: 'fineprint', name: 'The Fine-Print Shredder', description: 'Traders charge 20% fewer resources, rounded up (minimum 1).', cost: { coins: 300, gears: 25, research: 35 }, requires: 'boilers', stage: 1 },
 { id: 'bargain', name: "The Bargain Goblin's Blessing", description: 'Successful trades reward 25% more resources, rounded down, with unchanged odds.', cost: { coins: 450, oil: 60, research: 50 }, requires: 'boilers', stage: 1 },
 { id: 'whirr', name: 'Whirr Faster, Think Later', description: 'All buildings produce and consume resources 5% faster.', cost: { coins: 350, gears: 35, oil: 50, research: 40 }, requires: 'boilers', stage: 1 },
 { id: 'reservoir', name: 'The Bottomless Boiler Teacup', description: 'Store 90 more Steam Components.', cost: { coins: 250, oil: 40, research: 35 }, requires: 'boilers', stage: 1 },
 { id: 'ununionizer', name: 'The Un-Unionizer 9000', description: 'Permanently prevents unions and cancels pending walkouts without refunds or emergency credit.', cost: { coins: 4000, gears: 400, steam: 180, oil: 600, crystals: 30, research: 250 }, requires: 'airships', stage: 2 },
 ...PLOT_TECHNOLOGIES,
] as const;
export const CONTRACTS = [
 { id: 'gears', title: 'The Tinkers’ Guild', description: 'Deliver 30 Gears.', stage: 0, cost: { gears: 30 }, earned: 0, reward: { coins: 100, steam: 10 }, permit: '', blueprint: '' },
 { id: 'steam', title: 'Industrial Charter', description: 'Deliver 20 Steam Components and 15 Gears.', stage: 0, cost: { steam: 20, gears: 15 }, earned: 100, reward: { coins: 120 }, permit: 'industrial', blueprint: '' },
 { id: 'assembly', title: 'Precision Assembly', description: 'Deliver 90 Gears and 40 Steam Components.', stage: 1, cost: { gears: 90, steam: 40 }, earned: 0, reward: { coins: 250, crystals: 12 }, permit: '', blueprint: 'hull' },
 { id: 'sky', title: 'Aetherport Commission', description: 'Deliver 250 Brass Coins, 60 Gears and 3 Aether Crystals.', stage: 1, cost: { coins: 250, gears: 60, crystals: 3 }, earned: 0, reward: { coins: 150 }, permit: 'aetherport', blueprint: '' },
 { id: 'engine', title: 'Engine Restoration Fund', description: 'Deliver 160 Gears and 80 Steam Components.', stage: 2, cost: { gears: 160, steam: 80 }, earned: 0, reward: { coins: 600, crystals: 8 }, permit: '', blueprint: '' },
 { id: 'maintenance', title: 'City Maintenance Initiative', description: 'Successfully resolve two city emergencies.', stage: 1, cost: {}, earned: 0, reward: { coins: 100, research: 20 }, permit: '', blueprint: '', requiredEmergencies: 2 },
 { id: 'crude', title: 'The Crude Awakening', description: 'Deliver 60 Oil.', stage: 0, cost: { oil: 60 }, earned: 0, reward: { coins: 100, gears: 8 }, permit: '', blueprint: '' },
 { id: 'gearmeup', title: 'Gear Me Up, Scotty', description: 'Deliver 120 Gears.', stage: 1, cost: { gears: 120 }, earned: 0, reward: { coins: 400, research: 20 }, permit: '', blueprint: '' },
 { id: 'steamy', title: 'A Steamy Situation', description: 'Deliver 60 Steam Components.', stage: 1, cost: { steam: 60 }, earned: 0, reward: { coins: 220, oil: 40 }, permit: '', blueprint: '' },
 { id: 'teacup', title: 'Three Deals and a Teacup', description: 'Complete three paid trades, including risky losses.', stage: 1, cost: {}, earned: 0, reward: { coins: 250, research: 20 }, permit: '', blueprint: '', objective: { kind: 'trades', target: 3 } },
 { id: 'gap', title: 'Please Mind the Gap', description: 'Unlock six building plots.', stage: 1, cost: {}, earned: 0, reward: { coins: 250, gears: 25 }, permit: '', blueprint: '', objective: { kind: 'plots', target: 6 } },
 { id: 'tourist', title: 'Tourist Trap, but Make It Airships', description: 'Collect cargo from one expedition.', stage: 2, cost: {}, earned: 0, reward: { coins: 350, research: 25 }, permit: '', blueprint: '', objective: { kind: 'expeditions', target: 1 } },
 { id: 'aether', title: 'Aether? I Hardly Know Her', description: 'Deliver 20 Aether Crystals.', stage: 2, cost: { crystals: 20 }, earned: 0, reward: { coins: 500, gears: 40 }, permit: '', blueprint: '' },
 { id: 'questionable', title: 'Research and Mildly Questionable Development', description: 'Complete five industrial research topics, excluding land.', stage: 1, cost: {}, earned: 0, reward: { coins: 300, crystals: 5 }, permit: '', blueprint: '', objective: { kind: 'technologies', target: 5 } },
 { id: 'firstvoyage', title: "So Long, Suckers! I'm Going Exploring!", description: 'Collect cargo from your first expedition.', stage: 0, cost: {}, earned: 0, reward: { coins: 100, gears: 15, steam: 10, oil: 20 }, permit: '', blueprint: '', objective: { kind: 'expeditions', target: 1 } },
 { id: 'firstscience', title: "Look Ma, I'm a Scientist!", description: 'Purchase your first research topic, including land expansion.', stage: 0, cost: {}, earned: 0, reward: { coins: 40, gears: 6, steam: 5, oil: 10 }, permit: '', blueprint: '', objective: { kind: 'firstResearch', target: 1 } },
 { id: 'firstthousand', title: 'A Thousand Bucks? Practically Royalty!', description: 'Reach a balance of 1,000 Brass Coins once.', stage: 0, cost: {}, earned: 0, reward: { coins: 75, gears: 12, steam: 8, oil: 20 }, permit: '', blueprint: '', objective: { kind: 'coinBalance', target: 1000 } },
] as const;
export const DESTINATIONS = [
 { id: 'observatory', name: 'Abandoned Observatory', duration: 120, cost: { coins: 800, steam: 20 }, reward: { crystals: 30, research: 75 }, blueprint: 'lens', artifact: false, event: 'A sealed star chamber', choices: ['Spend 10 gears to open it', 'Take the outer instruments'] },
 { id: 'ironwood', name: 'Ironwood Frontier', duration: 180, cost: { coins: 1200, gears: 20, steam: 25 }, reward: { gears: 350, crystals: 20 }, blueprint: 'hull', artifact: false, event: 'A damaged cargo bridge', choices: ['Spend 10 steam to cross', 'Return with nearby supplies'] },
 { id: 'foundry', name: 'The Sunken Foundry', duration: 240, cost: { coins: 1800, gears: 35, steam: 35, crystals: 2 }, reward: { steam: 225, crystals: 40 }, blueprint: 'engine', artifact: true, event: 'The ancient core vault', choices: ['Spend 15 gears to retrieve the core', 'Salvage the outer foundry'] },
] as const;
export const ENGINE_STEPS = [
 { name: 'Rebuild the chassis', cost: { coins: 400, gears: 180 }, blueprint: 'hull', artifact: false },
 { name: 'Calibrate the aether lens', cost: { research: 80, crystals: 12, gears: 100 }, blueprint: 'lens', artifact: false },
 { name: 'Ignite the ancient core', cost: { coins: 700, steam: 100, crystals: 15 }, blueprint: 'engine', artifact: true },
] as const;
export const SHORTAGE_PENALTY = { seconds: 60, outputMultiplier: .5 } as const;
export const UNION = { wages: 200, delay: 5 } as const;
export const MERCHANT_OFFERS = [
 { label: 'Buy crystal cargo', character: { name: 'Director Vane', role: 'Industrial Magnate', quote: 'Time is money, and aether waits for no one. Pay my price today, or watch your competitors buy the future tomorrow.', style: 'border-brass text-brass', icon: 'industry' }, cost: { coins: 600 }, reward: { crystals: 30 }, popup: 'CRYSTALS ACQUIRED!', popupQuote: 'Profit waits for no one.' },
 { label: 'Sell spare gears', character: { name: 'Marnie Cogwell', role: 'Neighborhood Mechanic', quote: "My boiler's coughing smoke, my workshop's freezing, and I'm one broken gear away from disaster. Help me out, and I'll make it worth your while!", style: 'border-copper text-copper', icon: 'wrench' }, cost: { gears: 30 }, reward: { coins: 120 }, popup: 'GEARS TRADED!', popupQuote: 'Every gear keeps us going.' },
 { label: 'Buy salvaged gears', character: { name: 'Captain Mara "Brasshook"', role: 'Airship Pirate', quote: "Arrr, hauled these gears from a royal convoy drifting in the clouds. Don't ask where the ship went. Just tell me how much brass ye've got!", style: 'border-steam text-steam', icon: 'ship' }, cost: { coins: 60 }, reward: { gears: 40 }, popup: 'SUPPLIES SECURED!', popupQuote: 'Take it before I reconsider.' },
 { label: "Take Silas's risky deal", character: { name: 'Silas Sprocket', role: 'Undercity Broker', quote: 'No contracts, no witnesses, no questions. Sixty brass buys a chance at one hundred and sixty. Half the mechanisms work; the rest keep your money.', style: 'border-destructive text-destructive', icon: 'risk' }, cost: { coins: 60 }, reward: {}, risk: { probability: .5, reward: { coins: 160 }, successPopup: 'DEAL PAID OFF!', failurePopup: 'BAD DEAL!', successQuote: 'Luck loves a loose cog.', failureQuote: 'Nothing ventured, nothing gained.' } },
 { label: 'Supply the Industrial Guild', character: { name: 'Quartermaster Holt', role: 'Industrial Guild Supply Officer', quote: 'The foundries are running dry, the workers are getting restless, and the foreman wants those gears before the next whistle. Can you deliver?', style: 'border-brass text-brass', icon: 'industry' }, cost: { gears: 40 }, reward: { coins: 160 }, popup: 'GUILD DELIVERY COMPLETE!', popupQuote: 'Delivered before the next whistle.' },
] as const;
export const CITY_EVENTS = [
 { title: 'Boiler malfunction', description: 'A pressure valve is sticking.', options: [{ label: 'Fit a new valve', cost: { gears: 10 }, reward: { steam: 20 }, resolvesEmergency: true }, { label: 'Vent safely', cost: {}, reward: { steam: 3 }, resolvesEmergency: true }] },
 { title: 'Travelling brass merchant', description: 'Director Vane and Marnie Cogwell trade alongside a visiting dealer. Review each offer; choosing one trade ends this visit.', options: MERCHANT_OFFERS },
 {
  title: 'Supply Shortage',
  description: 'The city is running low on resources, and gear reserves are dwindling. Buy emergency supplies, power a salvage crew with steam, or wait for your buildings to produce more.',
  options: [
   { label: 'Buy Emergency Supplies', cost: { coins: 35 }, reward: { gears: 18 }, consequence: 'Resolve the shortage immediately without a production penalty.', resolvesEmergency: true },
   { label: 'Salvage Materials', cost: { steam: 5 }, reward: { gears: 6 }, consequence: 'Resolve the immediate shortage, but sacrifice steam that could power other machines.', resolvesEmergency: true },
   { label: 'Wait for Production', cost: {}, reward: {}, consequence: `All output from buildings that produce Gears is reduced by 50% for ${SHORTAGE_PENALTY.seconds} seconds of game time. Input consumption is unchanged.`, penaltySeconds: SHORTAGE_PENALTY.seconds },
  ],
 },
 { title: 'Machinery discovery', description: 'An old mechanism lies beneath the streets.', options: [{ label: 'Study the mechanism', cost: { gears: 12 }, reward: { research: 18 } }, { label: 'Sell the scrap', cost: {}, reward: { coins: 20 } }] },
 { title: 'Guild overtime', description: 'Engineers offer an extra production shift.', options: [{ label: 'Pay the crew', cost: { coins: 45, steam: 8 }, reward: { gears: 30 } }, { label: 'Keep a normal shift', cost: {}, reward: { coins: 8 } }] },
 {
  id: 'equipment-breakdown',
  title: 'Equipment breakdown',
  description: 'One of your production buildings has seized up. Repair it or scrap it for parts.',
  options: [
    {
      label: 'Repair the machine',
      resolvesEmergency: true,
      cost: { gears: 7 },
      reward: {},
    },
    {
      label: 'Scrap the machine for 10 coins',
      resolvesEmergency: true,
      cost: {},
      reward: { coins: 10 },
    },
  ],
},
 {
  id: 'worker-union',
  title: 'WORKERS DEMAND FAIR WAGES',
  description: "Workers at one of Brasshaven's industrial sites have organized a union. They are demanding better wages and threatening to walk off the job. Your decision will determine whether production continues.",
  options: [
   { label: 'Pay the Union', cost: { coins: UNION.wages }, reward: {}, resolvesEmergency: true, popup: 'WORKERS PAID!', popupQuote: 'Fair wages keep engines turning.' },
   { label: 'Refuse Their Demands', cost: {}, reward: {}, popup: 'WAGES WITHHELD!', popupQuote: 'You cannot silence the workers.' },
  ],
 },
] as const;
export function cityEvent(eventIndex: number) {
 const event = CITY_EVENTS[eventIndex % CITY_EVENTS.length];
 if (event?.title !== 'Travelling brass merchant') return event;
 const guest = MERCHANT_OFFERS[2 + Math.floor(eventIndex / CITY_EVENTS.length) % 3];
 return { ...event, options: [MERCHANT_OFFERS[0], MERCHANT_OFFERS[1], ...(guest ? [guest] : [])] };
}
