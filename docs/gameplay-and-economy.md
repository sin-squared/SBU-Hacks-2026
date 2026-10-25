# Brasshaven: Gameplay and Economy

This document describes Brasshaven's gameplay systems, resource economy, building progression, and city-management mechanics.

> **Documentation note:** Specific building costs, production rates, research costs, event probabilities, and reward amounts should match the current implementation. Retain the exact values from the existing game documentation or source code rather than introducing unverified numbers.

## Table of Contents

- [Core Gameplay Loop](#core-gameplay-loop)
- [Resources](#resources)
- [Buildings and Production](#buildings-and-production)
- [Upgrades and Efficiency](#upgrades-and-efficiency)
- [Research and Technology](#research-and-technology)
- [Land Expansion](#land-expansion)
- [Contracts and Milestones](#contracts-and-milestones)
- [Expeditions](#expeditions)
- [City Events and Emergencies](#city-events-and-emergencies)
- [Workers and Labor](#workers-and-labor)
- [The Great Engine](#the-great-engine)
- [Saving and Persistence](#saving-and-persistence)
- [Economy Design](#economy-design)

## Core Gameplay Loop

Brasshaven is a steampunk city-building tycoon game centered on industrial growth and resource management.

The core gameplay loop is:

1. Construct buildings to establish production.
2. Generate and collect resources.
3. Spend resources on construction, upgrades, research, and expansion.
4. Unlock advanced buildings and technologies.
5. Complete contracts and milestones to earn rewards.
6. Send expeditions and respond to city events.
7. Expand the industrial network toward the Great Engine.

Each decision affects the resources available for future development. Players must balance immediate economic gains with the long-term costs of expanding their city.

## Resources

Brasshaven uses six primary resources.

| Resource | General purpose |
|---|---|
| Brass Coins | Primary currency for economic transactions and development. |
| Gears | Industrial components used by manufacturing and construction systems. |
| Steam | Power resource supporting steam-driven industry. |
| Oil | Fuel and an input for industrial production. |
| Research | Progress toward technological advancements and unlocks. |
| Aether Crystals | Rare resource associated with advanced technology and late-game progression. |

The exact sources, costs, production rates, storage rules, and spending requirements for each resource are defined by the implemented game systems.

### Resource Management

Players should consider the following when managing their economy:

- Which resources are generated passively.
- Which resources are consumed by other production systems.
- Which buildings depend on sufficient steam or fuel.
- Which resources are needed for the next research or land unlock.
- How much currency should be reserved for emergencies and future construction.

Resource shortages can delay expansion and prevent players from maintaining their desired production strategy.

## Buildings and Production

Buildings are the foundation of Brasshaven's economy. Each building should be understood in terms of its construction requirements, production behavior, resource consumption, upgrades, and progression requirements.

The following building types are part of the game's design.

| Building | General role |
|---|---|
| Oil Rig | Produces oil for fuel and industrial use. |
| Clockwork Workshop | Supports gear production and mechanical industry. |
| Steam Rig | Supports the production or supply of steam. |
| Boiler House | Provides boiler-related steam capacity or support. |
| Steam Bakery | Represents a steam-powered commercial production building. |
| Inventor's Laboratory | Supports research and technological development. |
| Gear Factory | Manufactures gears for construction and industry. |
| Airship Dock | Supports airship expeditions and exploration. |
| Aether Refinery | Processes or supports the use of Aether Crystals. |

These descriptions summarize the intended roles. For exact input/output relationships, building costs, rates, and unlock conditions, consult the current implementation and the detailed building data in the project.

### Construction

Constructing a building generally requires available resources and an eligible plot.

Before building, players should consider:

- The upfront construction cost.
- The building's ongoing production or consumption.
- Its contribution to the city's current resource bottlenecks.
- Any research or plot requirements.
- Potential synergies with existing buildings.

### Production Chains

Production chains connect resource generation to the materials required for further development.

A building may produce a resource directly, consume resources from the wider economy, or support another part of the industrial network. Players should evaluate the complete chain rather than judging a building only by its individual output.

The exact production formulas and dependencies should be documented from the game's current building definitions.

## Upgrades and Efficiency

Building upgrades improve or modify a building's contribution to the city.

Depending on the implemented building, an upgrade may affect production, efficiency, capacity, or other gameplay properties.

When evaluating an upgrade, consider:

- The upgrade cost.
- The change in output or operating requirements.
- Whether the relevant resource is currently a bottleneck.
- How long the improved output takes to recover the investment.
- Whether the upgrade unlocks additional progression opportunities.

The precise effects and upgrade levels should match the current game data.

## Research and Technology

Research represents the technological advancement of Brasshaven's industrial society.

Research progression can unlock new buildings, upgrades, plots, and advanced systems. Research therefore competes with other potential uses of resources and should be planned around the player's current goals.

### Research Planning

A useful research decision accounts for:

1. The cost of the technology.
2. Its prerequisites.
3. The buildings or systems it unlocks.
4. Its immediate economic impact.
5. Its contribution to long-term progression.

Research requirements and unlock order should be kept consistent with the implemented technology tree.

## Land Expansion

Land expansion allows players to increase the space available for construction.

Additional plots can provide room for new production chains, specialized buildings, and more advanced industrial districts.

Expansion decisions should account for:

- The cost of unlocking a plot.
- Any research prerequisites.
- The resources required to use the new land effectively.
- Whether the current city can support additional production.
- The strategic value of the buildings planned for the plot.

A new plot is most valuable when the player's economy can make productive use of it.

## Contracts and Milestones

Contracts and milestones provide structured objectives beyond routine production.

### Contracts

Contracts give players specific goals to complete in exchange for rewards. Their requirements may involve resources, production, construction, or other game systems.

Players should assess the resources needed to fulfill a contract and whether completing it interferes with construction, research, or expansion plans.

### Milestones

Milestones recognize progress through particular achievements or development goals.

They can give players a reason to pursue new production targets, unlock additional systems, or develop their city in a specific direction.

The actual contract requirements, milestone conditions, and reward values should match the game's current configuration.

## Expeditions

Airship expeditions extend gameplay beyond the immediate city.

Expeditions can require resources or other commitments in exchange for potential rewards. These rewards may support further construction, research, or industrial progression.

Before launching an expedition, players should consider:

- Its upfront cost.
- Its duration, if applicable.
- The potential rewards.
- The opportunity cost of spending the required resources elsewhere.
- Any risks or outcome conditions implemented by the game.

Expedition outcomes and rewards should be documented from the current expedition system rather than assumed.

## City Events and Emergencies

City events introduce decisions that can interrupt routine economic planning.

Events may represent equipment failures, supply shortages, merchant offers, worker disputes, or other industrial challenges.

### Decision-Making

When an event appears, players should evaluate:

- The immediate resource cost of each available response.
- Potential short-term production losses.
- Possible long-term consequences.
- Whether the response protects critical production systems.
- The opportunity cost of spending resources that could otherwise fund expansion.

### Emergency Management

Emergencies encourage players to maintain enough economic flexibility to handle unexpected situations.

A city that spends every available resource on immediate growth may have fewer options when an emergency occurs. Maintaining reserves can help players respond without derailing their progression.

The exact event triggers, choices, costs, and consequences should be verified against the implemented event definitions.

## Workers and Labor

Worker-related systems represent the labor needs and social pressures of an expanding industrial city.

Where implemented, worker events and labor decisions can require players to weigh production needs against the costs and consequences of their response.

Documentation should reflect the actual labor mechanics in the game, including any implemented worker requirements, union events, decision options, costs, and lasting effects.

## The Great Engine

The Great Engine is the central long-term progression objective of Brasshaven.

Players develop their industrial economy, research advanced technologies, and acquire the resources needed to progress toward completing it.

The exact requirements for completion should be documented from the current victory-condition implementation.

## Saving and Persistence

Brasshaven includes save/load functionality for preserving game progress.

Persistent data may include the player's city, resources, buildings, upgrades, research progress, contracts, and other implemented progression systems.

### Save Compatibility and Migrations

When the game's saved-data structure changes, migrations may be required to keep older saves compatible with newer versions.

Changes to persistence should be handled carefully to avoid losing player progress or creating invalid game states.

The exact storage mechanism, saved fields, and migration behavior should be verified against the current persistence implementation.

## Economy Design

The game's economy revolves around balancing growth, production, and long-term progression.

### Economic Trade-offs

Players regularly face trade-offs between:

- Constructing new buildings and upgrading existing ones.
- Producing resources now and investing in future technologies.
- Expanding territory and strengthening the existing economy.
- Completing contracts and retaining resources for other objectives.
- Launching expeditions and preserving resources for city development.
- Spending resources on immediate opportunities and maintaining emergency reserves.

### Production Efficiency

A useful way to evaluate a production investment is to compare its cost with the additional resources it generates over time.

For a building or upgrade with a known upfront cost and a measurable net production increase, a simple payback estimate is:

**Payback time = Upfront cost ÷ Additional net production per unit of time**

This estimate is meaningful only when the cost and production increase are measured in compatible terms and the production increase is positive. For costs involving multiple resource types, evaluate each resource separately or use an explicitly defined valuation system.

### Balancing Considerations

When balancing the game, consider:

- Whether early progression introduces the core systems at a manageable pace.
- Whether players have meaningful choices about how to spend scarce resources.
- Whether production bottlenecks encourage strategy rather than unnecessary waiting.
- Whether upgrades offer useful benefits relative to their costs.
- Whether research and land expansion progress at an appropriate pace.
- Whether events create interesting decisions without making progress feel arbitrary.
- Whether late-game requirements provide a clear path toward the Great Engine.

## Keeping This Document Accurate

Update this document whenever significant gameplay or economy behavior changes.

For numerical details, use the current source of truth in the codebase, including building definitions, production formulas, research requirements, plot data, contracts, milestones, expeditions, events, and save schemas.

Avoid duplicating values in documentation unless necessary. When exact values are included, keep them consistent with the implementation.
