# Brasshaven strategic upgrade

## Mechanics implemented
- Five resources: Brass Coins, Gears, Steam Components, Aether Crystals and Research; the existing two-coin crank remains available.
- Twelve map plots, unlocked in batches of four by district permits; six buildings, three upgrade levels, confirmed demolition and partial base-cost refunds.
- Producer/consumer chains, capped steam storage and adjacent-boiler synergies; machines pause rather than producing negative balances.
- Five delivery contracts with actual inventory requirements, rewards, permanent completion and district permits.
- Three linked research technologies and three progression stages.
- Three deterministic expeditions with distinct costs, durations, encounters, smaller safe rewards, full-cargo blueprints and the Ancient Core artifact.
- Three sequential Great Engine project steps culminating in permanent victory.
- Five optional city events, each with two distinct choices.
- Clearly labeled, confirmed late-game demo replacement and confirmed reset.
- Validated version-two browser saves, legacy coin/building migration, capped offline production and persisted expedition timers. Cargo is collected through one state transition and cannot be claimed twice.

## Files added or changed
- `src/game/city-config.ts`: central economy and content configuration.
- `src/game/city.ts`: reusable pure city rules, production, transactions and progression.
- `src/game/city-save.ts`: validation, save envelope and legacy migration.
- `src/hooks/useCity.ts`: committed reducer state, clock and persistence.
- `src/components/CityManagement.tsx`: interactive map and building management.
- `src/components/CityPanels.tsx`: contracts, technology, expeditions, events and Great Engine.
- `src/routes/index.tsx`: active game dashboard and page metadata.
- `src/styles.css`: existing steampunk styling extended for plots, meters and reduced motion.
- `src/test/city.test.ts`: strategic rule tests and a fresh-save-to-victory simulation.
- `AGENTS.md` and `roadmap.md`: architecture rules and completion checklist.

The original economy modules, hook and panels remain compatible and available; the active dashboard uses the extended city model, rather than duplicating active game state across both implementations.

## Verification
- All 17 automated tests passed across city rules, original economy and routing.
- A browser playthrough started with a genuinely fresh save, constructed buildings, upgraded them, delivered all five contracts, researched all three technologies, completed five expeditions, and finished all three engine steps. Only the clock was accelerated, not starting resources or progression rewards.
- Victory survived a page reload. Reset cancellation preserved victory; confirmed reset restored an empty city.
- Separate browser checks verified initial construction, saved buildings, expedition launch and in-progress restoration.
- Desktop and phone-sized screenshots were inspected. The phone layout had no horizontal overflow. No browser runtime errors were observed; the latest automatic compile check succeeded.

## Boundaries
- Persistence remains local to this browser, as in the existing game; no accounts or cross-device synchronization were added.
- Offline expedition timers finish, but encounters must be resolved and cargo collected on return. No unchosen risky outcome is silently applied.
- Expeditions use deterministic encounters and fixed reward pools, not random loot.
- Steam rewards respect storage capacity; surplus steam is discarded.
- Long-term balance has a tunable configuration and a verified multi-stage path, but has not received a human multi-session balance study.