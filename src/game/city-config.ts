export type Resource = 'coins' | 'gears' | 'steam' | 'crystals' | 'research';
export type Stock = Record<Resource, number>;
export type Cost = Partial<Stock>;
export type BuildingKind = 'workshop' | 'boiler' | 'factory' | 'laboratory' | 'bakery' | 'dock';
export const RESOURCE_NAMES: Record<Resource, string> = { coins: 'Brass Coins', gears: 'Gears', steam: 'Steam Components', crystals: 'Aether Crystals', research: 'Research' };
export const BALANCE = { startingGears: 12, startingSteam: 8, baseSteamCapacity: 30, boilerCapacity: 45, maxLevel: 3, offlineCap: 7200, eventInterval: 150, demolitionRefund: .5 };
export const BUILDINGS: Record<BuildingKind, { name: string; purpose: string; stage: number; cost: Cost; output: Cost; input: Cost }> = {
 workshop: { name: 'Clockwork Workshop', purpose: 'Handcrafted gears & repair income', stage: 0, cost: { coins: 15 }, output: { gears: .35, coins: .6 }, input: {} },
 boiler: { name: 'Boiler House', purpose: 'Steam supply & +45 storage capacity', stage: 0, cost: { coins: 45, gears: 8 }, output: { steam: .65 }, input: {} },
 bakery: { name: 'Steam Bakery', purpose: 'Turns steam into steady coin income', stage: 0, cost: { coins: 65, gears: 10 }, output: { coins: 2 }, input: { steam: .15 } },
 factory: { name: 'Gear Factory', purpose: 'Efficient steam-powered gear production', stage: 1, cost: { coins: 140, gears: 35, steam: 15 }, output: { gears: 1.2, coins: .8 }, input: { steam: .65 } },
 laboratory: { name: "Inventor's Laboratory", purpose: 'Consumes gears to advance research', stage: 0, cost: { coins: 90, gears: 20 }, output: { research: .3 }, input: { gears: .18 } },
 dock: { name: 'Airship Dock', purpose: 'Trade income & expedition launch access', stage: 2, cost: { coins: 300, gears: 65, steam: 40, crystals: 4 }, output: { coins: 4 }, input: { steam: .25 } },
};
export const TECHNOLOGIES = [
 { id: 'boilers', name: 'Efficient Boilers', description: 'Boilers produce 50% more steam.', cost: { research: 20, gears: 15 }, requires: '', stage: 0 },
 { id: 'automation', name: 'Automated Production', description: 'Workshops and factories produce 50% more gears.', cost: { research: 50, gears: 40 }, requires: 'boilers', stage: 1 },
 { id: 'airships', name: 'Improved Airships', description: 'Unlocks Aetherport permit; expeditions are 25% faster.', cost: { research: 90, crystals: 3 }, requires: 'automation', stage: 1 },
] as const;
export const CONTRACTS = [
 { id: 'gears', title: 'The Tinkers’ Guild', description: 'Deliver gears for the city repair crews.', stage: 0, cost: { gears: 30 }, earned: 0, reward: { coins: 100, steam: 10 }, permit: '', blueprint: '' },
 { id: 'steam', title: 'Industrial Charter', description: 'Supply steam and establish a trading record.', stage: 0, cost: { steam: 20, gears: 15 }, earned: 100, reward: { coins: 120 }, permit: 'industrial', blueprint: '' },
 { id: 'assembly', title: 'Precision Assembly', description: 'Supply the new industrial machinery.', stage: 1, cost: { gears: 90, steam: 40 }, earned: 0, reward: { coins: 250, crystals: 12 }, permit: '', blueprint: 'hull' },
 { id: 'sky', title: 'Aetherport Commission', description: 'Research Improved Airships and supply the sky docks.', stage: 1, cost: { coins: 250, gears: 60, crystals: 3 }, earned: 0, reward: { coins: 150 }, permit: 'aetherport', blueprint: '' },
 { id: 'engine', title: 'Engine Restoration Fund', description: 'Deliver a final batch of precision parts.', stage: 2, cost: { gears: 160, steam: 80 }, earned: 0, reward: { coins: 600, crystals: 8 }, permit: '', blueprint: '' },
] as const;
export const DESTINATIONS = [
 { id: 'observatory', name: 'Abandoned Observatory', duration: 120, cost: { coins: 80, steam: 20 }, reward: { crystals: 6, research: 15 }, blueprint: 'lens', artifact: false, event: 'A sealed star chamber', choices: ['Spend 10 gears to open it', 'Take the outer instruments'] },
 { id: 'ironwood', name: 'Ironwood Frontier', duration: 180, cost: { coins: 100, gears: 20, steam: 25 }, reward: { gears: 70, crystals: 4 }, blueprint: 'hull', artifact: false, event: 'A damaged cargo bridge', choices: ['Spend 10 steam to cross', 'Return with nearby supplies'] },
 { id: 'foundry', name: 'The Sunken Foundry', duration: 240, cost: { coins: 160, gears: 35, steam: 35, crystals: 2 }, reward: { steam: 45, crystals: 8 }, blueprint: 'engine', artifact: true, event: 'The ancient core vault', choices: ['Spend 15 gears to retrieve the core', 'Salvage the outer foundry'] },
] as const;
export const ENGINE_STEPS = [
 { name: 'Rebuild the chassis', cost: { coins: 400, gears: 180 }, blueprint: 'hull', artifact: false },
 { name: 'Calibrate the aether lens', cost: { research: 80, crystals: 12, gears: 100 }, blueprint: 'lens', artifact: false },
 { name: 'Ignite the ancient core', cost: { coins: 700, steam: 100, crystals: 15 }, blueprint: 'engine', artifact: true },
] as const;
export const CITY_EVENTS = [
 { title: 'Boiler malfunction', description: 'A pressure valve is sticking.', options: [{ label: 'Fit a new valve', cost: { gears: 8 }, reward: { steam: 20 } }, { label: 'Vent safely', cost: {}, reward: { steam: 3 } }] },
 { title: 'Travelling brass merchant', description: 'A trader offers a limited exchange.', options: [{ label: 'Buy crystal cargo', cost: { coins: 60 }, reward: { crystals: 3 } }, { label: 'Sell spare gears', cost: { gears: 10 }, reward: { coins: 40 } }] },
 { title: 'Supply shortage', description: 'The night shift needs fresh supplies.', options: [{ label: 'Fund a delivery', cost: { coins: 35 }, reward: { gears: 18 } }, { label: 'Organize salvage', cost: {}, reward: { gears: 3 } }] },
 { title: 'Machinery discovery', description: 'An old mechanism lies beneath the streets.', options: [{ label: 'Study the mechanism', cost: { gears: 12 }, reward: { research: 18 } }, { label: 'Sell the scrap', cost: {}, reward: { coins: 20 } }] },
 { title: 'Guild overtime', description: 'Engineers offer an extra production shift.', options: [{ label: 'Pay the crew', cost: { coins: 45, steam: 8 }, reward: { gears: 30 } }, { label: 'Keep a normal shift', cost: {}, reward: { coins: 8 } }] },
] as const;
