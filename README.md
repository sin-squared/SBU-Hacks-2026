# Screenshot Match

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3cfe97a4-03f6-4243-bffd-6163dd44103b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Oil-first economy

New cities start with exactly **135 Brass Coins**, 12 gears, 8 steam, and zero
oil, crystals or research. Construct the 135-coin Oil Rig first: its card has a
brass glow and "YOUR INDUSTRIAL EMPIRE STARTS HERE" guidance. Other construction
and other coin-spending actions are blocked until that purchase. The milestone
is saved and does not reset if the rig is later lost. The glow becomes static
under reduced motion. Both the active and dormant legacy coin-crank actions
have been removed; ordinary buttons still work.

Level-one rates below are per game second, before research/adjacency bonuses.
C = coins, G = gears, S = steam, O = oil, X = crystals, R = research.

| Building | Purchase cost | Inputs/s | Outputs/s | District |
| --- | --- | --- | --- | --- |
| Oil Rig | 135 C | None | 2.5 C +0.8 O | Foundry Row |
| Clockwork Workshop | 75 C | None | 0.3 C +0.45 G | Foundry Row |
| Steam Rig | 90 C +8 G | 0.4 O | 0.9 S | Foundry Row |
| Boiler House | 165 C +10 G | None | 0.25 S | Foundry Row |
| Steam Bakery | 270 C +12 G +10 S | 0.2 S | 2.5 C | Foundry Row |
| Inventor's Laboratory | 225 C +15 G | 0.12 G | 0.3 R | Foundry Row |
| Gear Factory | 600 C +40 G +20 S +30 O | 0.6 S | 1.5 G +1 C | Industrial Quarter |
| Airship Dock | 1050 C +70 G +40 S +4 X +40 O | 0.15 S | 5 C | Aetherport |
| Aether Refinery | 1200 C +80 G +40 S +4 X +40 O | 0.2 O +0.3 S | 0.05 X | Aetherport |

Levels produce **1.0 / 1.2 / 1.4 times level-one output**, not cumulative
multipliers. Upgrading leaves inputs fixed; Whirr Faster, Think Later separately
increases both inputs and outputs by 5%. Each component of a level 1->2 upgrade costs
15% of base purchase cost rounded upward; level 2->3 costs 20% rounded upward.
Boiler Houses and Steam Rigs add 45 steam capacity per level on top of the base
30. Efficient Boilers boosts both steam suppliers by 50%. Existing boiler
adjacency, automation and shortage modifiers still apply.

The production clock runs suppliers before consumers independently of plot
placement; same-resource consumers use fixed building-kind priority, then plot
order. A machine pays all inputs or pauses without an output. The resource bar
shows signed net change per second using the simulator's next-second retained
output minus paid inputs, excluding steam overflow. It updates from current
supplies and damage immediately. Cards are ordered Coins, Oil, Gears, Steam,
Research, Crystals. Building cards show larger signed output and input rates,
including current level, research and adjacency modifiers.

Without event exchanges or upgrades, the workshop is affordable around 0:30.
A fresh city has two plots: research Plot 3 at about 0:47, then buy the Steam
Rig around 1:19. These times include the land price and assume immediate
purchases. Next are Tinkers' Guild, Industrial Charter, Plot 4, laboratory,
Plot 5/bakery, then Plot 6/factory. Permits no longer grant bulk land.
The five original delivery contracts and Engine requirements are unchanged;
expedition fees and ordinary cargo have been rebalanced below. Crystals from
Precision Assembly still make Aetherport achievable without the refinery.

Saves keep the existing `brasshaven-save-v2` key and version-2 envelope, adding
`economyRevision: 1` and `progressionRevision: 1`. Pre-economy saves retain balances, building identities and
levels, damage, pending walkouts and progression, default oil to zero, and bypass
new-city onboarding. They receive a one-time economy-change notice; subsequent
saves do not repeat migration. The previous six-event and legacy coin-save
migrations remain supported. No new starter-coin grant is applied to old saves.
Feedback and measured rate samples are transient, not saved.
The writer constructs an explicit durable-state payload, including contract
milestones, discoveries/viewed cards, event targets/timers and pending walkouts.
Action feedback, contract combos, production samples, unlock popups and their
notification IDs, and presentation notices are omitted entirely. Victory is
reconstructed from Engine progress. Reloading new saves starts with empty
runtime notifications without losing gameplay progress; older save validation
and migrations remain supported.

Demolition continues to refund 50% of **current** base price, not historical
purchase price, including migrated buildings; upgrade spending is not refunded.
Existing scrapping and worker property loss remain unchanged. Losing the final
income producer can strand a city: there is no bailout income or new protection.

To verify in a disposable browser city, reset through Settings, check 135 coins
and the highlighted Oil Rig, and try another construction card. Construct the
rig, verify zero coins and passive oil/income, then purchase the workshop and
research Plot 3 and buy the Steam Rig. Check net resource rates, upgrade, and reload to verify
oil and the completed onboarding milestone survive. Use the demo city for
late-game construction checks without overwriting a city you want to retain.

`npm test` includes exact opening thresholds, all building upgrade rates/costs,
supply ordering, scarcity/caps, migration and full fresh-to-victory routes with
actively resolved emergencies and a separate isolated no-event economy route. Run
`npx tsc --noEmit` and `npm run build` before release.

## Sequential land and industrial research

New cities start with **exactly two** unlocked plots out of twelve. Each further
plot is a separate research purchase using the normal action validator, payment,
technology save state and shared outcome popup. A single advancing **Unlock Plot N**
card in the Research land office appears after the first Oil Rig and shows only
the next unlock, never the future list.
The map points players to Research rather than duplicating the purchase control. Missing
resources are explained, and construction on locked plots is rejected. After each
purchase the same card advances its title, description and price; at twelve plots
it is replaced by **All plots unlocked!** The saved individual research IDs remain
compatible; this is a presentation change, not a change to land costs or sequencing.

| Plot | Research | Cost |
| --- | --- | --- |
| 3 | A Little More Elbow Room | 45 C +12 O |
| 4 | Plot Twist! | 90 C +25 O |
| 5 | The Yard Expander-inator | 180 C +50 O |
| 6 | Land Ho, More Land! | 300 C +80 O +25 G |
| 7 | Acre-onomics | 450 C +120 O +40 G |
| 8 | The Steam-Powered Fence Negotiator | 650 C +160 O +60 G +30 S |
| 9 | The Great Dirtquisition | 900 C +220 O +90 G +50 S +25 R |
| 10 | The Lawn of Unintended Consequences | 1200 C +280 O +120 G +70 S +40 R |
| 11 | Aether Acres and a Mule Automaton | 1800 C +360 O +160 G +100 S +60 R +8 X |
| 12 | The Final Front Yard | 2500 C +450 O +220 G +140 S +90 R +15 X |

Each requires the preceding plot. Plots 3-5 require no gears, and Plots 3-8
require no Research resource or laboratory, avoiding the two-plot startup loop.
District permits still gate advanced buildings and technologies but never grant
land. Existing version-2 cities retain their previous 4/8/12 plot access from
permits, or any larger occupied/researched extent. Corresponding land topics are
grandfathered without payment. Newly saved cities use their explicit unlocked
count rather than permit-derived expansion. Existing technology IDs are retained.

The original three technologies keep their costs and prerequisites. New
industrial topics (not counted as land research) are:

| Topic | Cost | Prerequisite | Effect |
| --- | --- | --- | --- |
| The Fine-Print Shredder | 300 C +25 G +35 R | Efficient Boilers, Industrial | Trader costs -20% on every paid resource, rounded up, minimum 1 |
| The Bargain Goblin's Blessing | 450 C +60 O +50 R | Efficient Boilers, Industrial | Successful trader rewards +25%, rounded down |
| Whirr Faster, Think Later | 350 C +35 G +50 O +40 R | Efficient Boilers, Industrial | All machines run 5% faster, including input consumption |
| The Bottomless Boiler Teacup | 250 C +40 O +35 R | Efficient Boilers, Industrial | +90 permanent steam storage |
| The Un-Unionizer 9000 | 4000 C +400 G +180 S +600 O +30 X +250 R | Improved Airships, Aetherport | Permanently prevents union events and cancels unresolved demands/pending walkouts |

Trader research is applied through one shared calculation for the reducer,
affordability checks and displayed trades. Both bonuses combine independently.
Silas's odds remain 50/50; with both topics, the upfront price is 48 coins and
the success payout is 200 (net +152), with nothing paid on a loss. His offer
quote and risk disclosure show the adjusted figures. The successful-outcome
bonus never rewards a failed deal. One transaction ends a visit, so profitable
exchanges cannot be repeated via stale/duplicate clicks. Other events and
contract/building costs receive neither trader bonus.

Union prevention retains affected buildings, but grants no refund, emergency
resolution credit, or property replacement. Its effect is explained before
purchase. A walkout already processed before purchase cannot be reversed.
Research cancels pending state rather than hiding a popup; the existing hook
removes the obsolete deadline wake. Saved researched cities are also reconciled
before offline catch-up. Other event definitions and outcomes are unchanged;
the two-slot scheduler below lets a second alert arrive while one is unanswered.

The integrated tests develop an extra Oil Rig and laboratory for late land and
research spending. They reach victory within one simulated hour, and can afford
all land and industrial research within two, without crank/demo grants or lucky
black-market wins. These are tested routes, not promises that every spending
choice has the same pace. Existing loss of the final income producer remains
a real failure state.

## Expanded guild commissions

The original six contracts are preserved. Eight additional one-time commissions
appear at appropriate districts. Deliveries consume the listed accumulated stock;
milestone objectives check saved gameplay state without an additional delivery.
Except The Crude Awakening and the beginner milestones below, new commissions
also require Tinkers' Guild.

| Contract | District | Objective | Reward |
| --- | --- | --- | --- |
| The Crude Awakening | Foundry Row, first Oil Rig | Deliver 60 O | 100 C +8 G |
| Gear Me Up, Scotty | Industrial | Deliver 120 G | 400 C +20 R |
| A Steamy Situation | Industrial | Deliver 60 S | 220 C +40 O |
| Three Deals and a Teacup | Industrial | Complete 3 trader transactions | 250 C +20 R |
| Please Mind the Gap | Industrial | Unlock 6 plots | 250 C +25 G |
| Tourist Trap, but Make It Airships | Aetherport | Collect 1 expedition | 350 C +25 R |
| Aether? I Hardly Know Her | Aetherport | Deliver 20 X | 500 C +40 G |
| Research and Mildly Questionable Development | Industrial | Complete 5 industrial research topics (not land) | 300 C +5 X |

Trader transactions increment only after a validated paid exchange, including
a paid risky loss; panel dismissal, rejection and repeated decisions do not
count. Older saves start this new counter at zero rather than guessing from an
event index. Expedition progress uses actual collected cargo, and research and
land progress derive from their saved state. Milestones can accrue before the
contract's district is available. Claims are saved and cannot pay twice.

### Beginner milestones

Three additional one-time contracts are visible from the start, without a
Tinkers' Guild or district prerequisite. There are now **17 contracts** total.

| Contract | Objective | Reward |
| --- | --- | --- |
| So Long, Suckers! I'm Going Exploring! | Collect cargo from the first completed expedition | 100 C +15 G +10 S +20 O |
| Look Ma, I'm a Scientist! | Purchase the first research topic, including land expansion | 40 C +6 G +5 S +10 O |
| A Thousand Bucks? Practically Royalty! | Reach a balance of 1000 C once | 75 C +12 G +8 S +20 O |

The expedition milestone counts full recovery and safe salvage after actual cargo
collection, never launch, encounter choice or premature collection. Expedition
prerequisites and special-item conditions are unchanged. These bundles help fund
an early building or land upgrade, contain no rare crystals, and still respect
steam storage. Claiming is manual and pays exactly once.

`firstResearch` records a successful research purchase, not a menu visit or failed
attempt. `peakCoins` records the highest actual balance reached by production,
trades, refunds or rewards; lifetime earnings do not qualify. Spending below
1000 afterward does not revoke the milestone. Saved `completedContracts` latch
first completion separately from claimed IDs in `contracts`. Delivery contracts
still require and consume their stock when claiming, even if stock falls after
the objective was first completed. Their UI explains "Delivery required" then.

Older saves initialize these milestones from known existing purchased topics,
collected-expedition count and current coin balance, and retain claimed contracts.
Land topics inserted solely by migration do not count as a purchase. A past
1000-coin balance cannot be reconstructed from lifetime earnings in an old save;
if it is not recorded and the current balance is lower, reaching 1000 again earns
the new milestone. Loading or migrating an already-complete objective is silent;
new offline production milestones can trigger completion normally.

## Expedition investment

Ordinary cargo is exactly five times the earlier amount. Fees are paid at launch
and increase by tier; other launch resources, encounter payments, durations,
airship-speed research, blueprint conditions and unique artifacts are unchanged.

| Destination | Launch cost | Full ordinary cargo | Special full-encounter recovery |
| --- | --- | --- | --- |
| Abandoned Observatory | 800 C +20 S | 30 X +75 R | Lens blueprint |
| Ironwood Frontier | 1200 C +20 G +25 S | 350 G +20 X | Hull blueprint |
| The Sunken Foundry | 1800 C +35 G +35 S +2 X | 225 S +40 X | Engine blueprint + Ancient Core |

Safe salvage returns half ordinary cargo, rounded down, and no new blueprint or
core. Steam rewards still respect storage: increase capacity and leave space
before collecting; overflow is not stored. The storage research plus a level-3
Steam Rig provides 255 capacity, enough for 225 steam from empty storage.
Previously launched voyages keep their saved destination/deadline/choice and
receive the updated cargo on collection; no additional fee is charged retroactively.

At a baseline Oil Rig + workshop + bakery + factory + dock income of 11.3 C/s,
the launch fees represent about 71/107/160 seconds of gross income, before
research, bonuses or emergency spending. Cargo supplies multiple advanced
deliveries while blueprints and the core remain encounter-gated. Repeat voyages
still cost money and time; invalid launches and duplicate collection never pay
or consume resources.

Run `npm test -- src/test/city-progression.test.tsx src/test/city-economy.test.tsx`
for sequential research, migration, researched trades, union-prevention
deadlines, fivefold cargo and complete-economy regressions.

## Ledger presentation and purchase feedback

Research prices and genuine contract delivery requirements use slightly larger
resource text with icons: each resource is **green when sufficient** and **red
when short**, independently, using the same tolerance as payment validation.
The colors update on every state change and no longer depend on production.
Great Engine costs and research benefits remain red; all contract rewards,
including their icons and permit/blueprint text, are **yellow**. Existing
voyage time-remaining text is yellow. Contracts have no timed expiry mechanic,
so no new contract timers are introduced. Descriptions state one short effect or
objective; essential delivery costs, milestone progress, prerequisites and
rewards remain separate. Emergency-count details are available under "What counts?"
Permit requirements consistently use **Industrial Permit Required** or
**Aetherport Permit Required**; creative contract names and district names remain.

Purchased research and claimed contracts are hidden entirely. Contracts whose
objectives are complete but rewards remain unclaimed stay visible with gray
styling and a completion label/checkmark. Contracts that can actually be claimed
sort first, in definition order; a latched objective with an unaffordable delivery
does not displace a ready claim.
Their claim button remains usable when any required delivery is affordable.
Yellow reward text remains distinct even on ready contracts. Resource
collection milestones display progress, never a fabricated payment cost.
Research, contract and expedition names are bold, including ready contracts
and underway destinations. Research uses the actual purchase validator to group
affordable topics first, then unlocked but unaffordable topics. Within each group,
the most recently discovered topics take priority using the saved discovery order.
This includes the single next-land card; unaffordable land no longer displaces
purchasable industrial research. Ordering updates on every resource/state change;
keyed cards retain their identity and per-item NEW badges when moved.
completed land stages do not reappear as separate cards.

Successful research purchases (including land expansion) trigger a green version
of the shared screen-edge vignette alongside **RESEARCH COMPLETE!**. Newly completed
contracts show **CONTRACT COMPLETE!** once at their objective transition,
independently of action popups. Later claims and menu visits never replay that contract's effect;
a claim reward can legitimately complete a different contract. Multiple
completions in one update count individually toward the visual combo below.
Simultaneous green research and contract feedback share one green overlay.
Completion IDs and combos are transient, while completion history is saved.
Green and existing
red effects use the same 1250ms animation/lifecycle and can finish independently
when actions occur close together. The center remains clear and the overlays
never intercept clicks. Reduced motion disables entrance/vignette movement.
Failed purchases, repeated one-shot claims, normal renders and reloads create no
new success feedback.

Browser check: open Research in a disposable city and buy Plot 3; only Plot 4
should replace it, with 90 coins +25 oil shown. Reload to confirm persistence.
Compare a multi-resource research price with mixed stock balances: only short
resources should be red. Check yellow rewards in Contracts and red costs in
Great Engine. Complete an objective, confirm its green glow and move to the
top when claimable, then claim and verify it disappears without a repeated
completion popup or glow. Research a technology to see the green edge glow
and its card disappear;
existing failed trader deals still use red.

## Progressive discovery and two interactive alert slots

Contract and research visibility share the same prerequisite checks as purchases.
Unmet permits, preceding technologies, required blueprints and buildings hide
their cards entirely; affordability alone does not hide eligible content.
First-voyage contracts require an actual Dock, or a previously collected voyage
so losing a Dock never revokes earned expedition progress. The advancing land
card still reveals only the next plot. Purchased research and claimed contracts
remain saved and cannot be purchased/claimed again.

Successful progression compares available content against saved known IDs.
One action that reveals content creates one **NEW CONTRACTS UNLOCKED!**,
**NEW RESEARCH UNLOCKED!**, or **NEW RESEARCH AND CONTRACTS UNLOCKED!** popup.
There is at most one informational unlock announcement: additional discoveries
coalesce into it, combining categories rather than accumulating a hidden list.
Legacy saved announcement lists still validate and coalesce on load, but new
saves omit announcements and their runtime IDs, so they do not replay on reload.
During play, each announcement acknowledges by its own ID; stale timers cannot
clear its replacement. It waits behind the triggering action popup; newer actions temporarily take
precedence rather than overlapping or dismissing the wrong announcement.
Unlocks hold for **2250ms** (standard 1250ms +1000ms), then fade for the existing
500ms. Their blue edge effect reuses the red/green system, lasts 1250ms, leaves
the center clear, ignores clicks and respects reduced motion. Other popup
durations and existing red/green effects are unchanged.

Each newly available incomplete card has its own brass **NEW** badge. A card is
marked viewed only after at least half is inside the viewport for 500ms while
the document is visible. Scrolling away, leaving the menu or hiding the tab
cancels that dwell timer; opening a menu does not acknowledge offscreen cards.
Viewed IDs persist independently of popup acknowledgement. Old saves baseline
already available content silently, rather than replaying historic unlock popups.

The Expeditions navigation button is gray and labeled Locked until a Dock is
built on an unlocked plot. It remains clickable to explain **AIRSHIP DOCK
REQUIRED!** / "You need to unlock the Airship Dock on a plot first." Permissions,
research and sufficient money alone never enable it. Removing the last Dock
locks navigation again; a damaged Dock still exists, but the existing operating
Dock requirement prevents launch until repaired.

Interactive alerts now retain individual stable event IDs and targets.
There is one primary alert and one optional second visible alert, not a queue.
When both slots are occupied, random-event generation is paused before choosing
an event or target. It neither advances the event cursor nor creates hidden data,
damage or missed-arrival debt, including during offline catch-up. A response can only
target one of the two visible IDs. Closing a panel never answers it.
The existing event cycle and 15-second interval remain. Freeing a full slot
starts a fresh 15-second interval; resolving the last alert also waits 15 seconds.
There is no immediate catch-up burst or countdown UI. Stable IDs and scheduled
arrival times prevent duplicate insertion on repeated clock updates.
Malfunctions damage and reserve their targets only when their alert appears; union targets are reserved
and keep producing until their original decision and five-second walkout delay.
No visible alert is overwritten, and targets cannot be demolished out from
under active emergencies. Production and already-armed five-second walkouts
continue independently of the capacity pause.

New saves store only the optional second visible alert (`secondEvent`), never
an event backlog. When migrating older backlog saves, the two previously visible
alerts and their damage/targets are retained. Unseen surplus entries are cancelled
without costs, rewards or emergency credit, and their pre-applied machine damage
is cleared. An explicit migration notice explains this; no building, balance,
claimed reward or already-armed walkout is removed by the migration.

Every merchant visit now offers **Leave It Be**. It resolves just that visit
without resource costs/rewards, transaction credit, emergency credit or trader
bonuses. The other visible alert remains intact; no new merchant appears immediately.

Browser checks: start a disposable city, click the locked Expeditions tab, then
build the Oil Rig. Wait for its combined unlock popup and blue glow; open Research,
view the next-land card, scroll away and reload to check per-card badges. Research
a topic and claim a contract to confirm each disappears only after its purchase/
claim. Leave a merchant unanswered for several minutes: exactly two cards
should remain, with no queued count or hidden alerts. Answer the second card
first, verify the merchant remains unchanged, and wait 15 seconds for a new
second alert. Declining the merchant resolves only its visit.
Build/demolish a Dock to verify navigation follows
actual buildings. `src/test/city-availability.test.tsx` covers these rules, save
migration, viewport dwell, exact timing and independent screen effects.

## Equipment breakdowns

City events cycle in their existing order, with the 15-second interval and
two-slot scheduling described above. Equipment breakdown is the sixth event. It randomly damages one
existing production building; an empty city skips that event without a reward.
The corner alert names the building and plot. Click it to repair for 7 gears or
scrap for 10 coins. Closing the panel (including Escape) leaves the emergency
active, and damage persists across saves and offline catch-up.
The damaged building's panel also offers Repair Building at the bottom, with
the same validated 7-gear cost and emergency credit. Repairing removes only
that breakdown alert and restores operation without a repair confirmation popup.
Successful breakdown scrapping shows "BUILDING SCRAPPED!" alongside the existing
1250ms red edge vignette. Repairs and ordinary demolition do not trigger it.

Damaged machines neither produce nor consume resources and cannot be upgraded
or normally demolished until resolved. Damaged boilers lose their adjacency
bonus but retain storage capacity until scrapped; scrapping clamps stored steam
to the remaining capacity.

To verify in the browser, run `npm run dev`, construct an Oil Rig and workshop, and resolve the
first five city alerts as they appear. When Equipment breakdown appears, check
that the named plot shows "Damaged", its rates stop, and closing/reopening the
panel or reloading does not restore it. Repair should retain the building and
level and charge 7 gears once. On another breakdown, scrap should award 10 coins
once and free the plot for construction. Other healthy buildings continue
working, so compare resource changes with their displayed rates.

Run `npm test -- src/test/city.test.ts src/test/city-breakdown.test.tsx` for
city and breakdown regression tests, and `npm run build` for a production build.

The two existing repair actions now cost 10 gears for a boiler valve (was 8,
+25%) and 7 gears for an equipment repair (was 5; the approved whole-number
rounding of 6.5). Safe venting, scrapping and delivery costs are unchanged by
the economy redesign. There is no oil-leak repair in the current rules.

## Supply Shortage

Supply Shortage remains the third city event, with the existing event timing.
Its alert explains that the city is running low on resources. The panel shows
three choices and their costs/rewards before selection:

| Choice | Cost | Immediate reward |
| --- | --- | --- |
| Buy Emergency Supplies | 35 Brass Coins | 18 Gears |
| Salvage Materials | 5 Steam Components | 6 Gears |
| Wait for Production | Nothing | None |

Unaffordable choices are disabled and explain the missing resources. Waiting
resolves the alert without a resource exchange; normal building production
continues, but all output from Gear-producing buildings (including their coin
output) is halved for 60 seconds of game time. Their inputs are unchanged; other
buildings are unaffected. The city displays the remaining penalty duration.
The countdown uses the existing production tick and offline catch-up, splits
steps at expiry, and saves its remaining seconds. Closing the panel does not
resolve the event. Pending and resolved events persist through auto-save.

Each successful shortage choice confirms with "SUPPLIES SECURED!",
"TEMPORARY FIX!", or "PROBLEMS MAY WORSEN..." respectively. The reusable
`ActionPopup` component accepts `{ id, message, quote?, category?, effect? }` feedback with a new ID for each
notification. It is centered, pointer-transparent, holds for 1.25 seconds and fades
for 500ms before removal. Replacement/unmount clears old timers. Reduced-motion
users get the same reading time without a transition. Feedback is generated only
after action validation and is not restored from saves.

To test locally, run `npm run dev`, resolve the boiler and merchant alerts, and
open the next Supply Shortage alert. Check the three exchanges, close/reopen the
panel, and reload while it is pending. Choose an option and verify the resource
change happens once and the alert stays resolved after reload. Account for
normal production when comparing balances. With fewer than 35 coins or 5 steam,
the corresponding paid choice should be unavailable. Waiting costs nothing but
applies the displayed penalty. Check that workshop/factory output halves, other
buildings remain unchanged, and output returns to normal after the countdown.
Reload during the countdown to verify it continues rather than resetting.

Run `npm test -- src/test/city-shortage.test.tsx src/test/action-popup.test.tsx`
for the shortage and popup regression tests.

## Shared action feedback

The dashboard mounts one `ActionPopup` for the shared `useCity` state. It renders
through a body portal so dashboard spacing and panels cannot shift its center.
Successful
`cityAction` transitions generate a new sequential feedback ID and use the
central message mapping in `src/game/action-feedback.ts`. Messages cover all
nine buildings, upgrades/demolition, eighteen technologies (including ten land topics), three
expedition destinations and both encounter/cargo outcomes, three Great Engine
steps, all seven city events, and confirmed reset/demo. There is no coin crank.
Blueprint/core collection messages are generated only when cargo is awarded,
not when an expedition is launched or an encounter is resolved. Final ignition
feedback accompanies the actual victory state.

Rejections retain the existing detailed ledger notice and disabled-button
explanations without generating a new success popup. Ticks, panel/plot/tab
selection, and closing unresolved events do not generate feedback. The exception
is a scheduled worker walkout: processing its deadline generates its follow-up.
One-shot
claims remain guarded by existing gameplay validation; repeatable actions such
as successive affordable upgrades still work normally.

Feedback is transient and excluded from saves. Reset and demo also advance the
feedback ID, so their messages replace an active popup rather than reusing its
timer. Ordinary popups hold for 1.25 seconds; trader and worker-departure popups hold for 1.75 seconds.
Research, contract-objective and Engine-stage popups hold for 3 seconds with a short
entrance animation. Research always says **RESEARCH COMPLETE!**, without the topic
name. Contract objectives always say **CONTRACT COMPLETE!**, without the contract
name or reward details. The menus retain all names, requirements and rewards.
Engine popups retain their actual stage/victory detail. Claiming a contract pays
the existing one-time reward without creating another completion popup.
Both fade for 500ms and retain reduced-motion support and pointer-transparent
styling. Oil and Steam Rigs share this feedback system; there is no oil-leak event.

Contract completions use a **rolling 2-second combo window**. Every newly completed
objective counts, including multiple objectives satisfied by the same action or
production update. Another completion less than 2000ms after the previous one
extends the combo; at exactly 2000ms or later, the next completion starts at one.
The single contract popup updates to **CONTRACT COMPLETE! 2x**, **3x**, **4x**, etc.
Only the multiplier changes color: 2x green, 3x yellow, 4x+ red. The first completion
uses green. One replaceable combo edge-effect channel changes to the matching
color and restarts the existing 1250ms animation; older combo timers cannot hide
the latest popup or overlay. Research, negative-event and unlock effects remain
independent. Reduced motion and click-through behavior are retained.

The accumulation window expires after two seconds of inactivity; the current
announcement still finishes its existing 3-second hold and 500ms fade. Combos
never grant or consume resources. Rewards remain individually claimable, and a
reward that genuinely satisfies a different contract can produce a new completion.
Research and expedition actions count only the separate contract objectives they
actually satisfy, not the actions themselves. The combo is excluded from saved
state; loading already completed objectives is silent.

Research/trader/emergency action feedback and the contract-completion card share
one centered, vertically stacked popup layout, so they do not cover each other.
Unlock announcements wait for the latest completion/action display to finish
and remain coalesced rather than becoming a backlog. Interactive alerts are
untouched. `src/test/contract-combo.test.tsx` verifies colors, simultaneous counts,
window boundaries, stale timers, claims, save/load and notification coexistence.

For browser checks, run `npm run dev` and construct an Oil Rig. Once an upgrade
is affordable, upgrade while another popup is visible: only the newest message
should remain. Open Settings
and cancel reset/demo to verify no popup appears; confirm either only in a
disposable city to verify its message. Use demo resources to check upgrades,
research, construction, and expeditions; wait for actual cargo collection before
expecting blueprint/core messages. Reloading should not replay the last popup.
Run `npm test` for all regression tests, including the message/outcome matrix,
shared-state/StrictMode integration, and popup lifecycle tests.

## City Maintenance Initiative

The five original delivery contracts retain their costs, rewards and progression.
City Maintenance Initiative adds an Industrial Quarter contract: successfully
resolve two city emergencies, then claim 100 Brass Coins and 20 Research.
Progress accumulates even before the district unlock; claiming requires the
Industrial Quarter but no additional delivery or lifetime-coin requirement.

Both Boiler Malfunction choices, Supply Shortage buy/salvage, and Equipment
Breakdown repair/scrap and union wage payments count.
Waiting for production, refusing union wages, merchants, discoveries,
overtime, expedition encounters, panel dismissal and skipped breakdowns do not.
Only validated emergency resolution actions increment the saved counter;
duplicate/stale clicks cannot count an event twice. Older saves start at zero
because their event index cannot reliably reconstruct successful emergency
resolutions. Reset/demo start a new counter.

Eligible, unclaimed contract cards remain visible with objectives, rewards,
progress and In progress / Completed (ready to claim) status. Locked and claimed
cards are hidden. Completing an objective shows **CONTRACT COMPLETE!** and enables
the existing manual claim flow; claiming pays once without replaying completion.

To test, resolve a boiler malfunction and buy/salvage a shortage, checking 0/2,
1/2 and 2/2 in Contracts. Close a pending alert and reload to confirm neither
action grants progress. Obtain the Industrial Permit (or use a
disposable demo city), verify the popup at the 2/2 transition, then claim
maintenance and verify +100 coins, +20 research and its card hidden after reload.
Other production may
continue changing balances. Run `npm test` for all contract/event regressions.

## Character-driven merchant visits

The existing second city event now introduces each offer with the trader's name,
role, distinctive quote, industrial icon and accent color, followed by the exact
exchange and its button. One trade ends the visit; closing the panel leaves it
pending. Vane and Marnie appear on every visit. Trades use player-approved bulk
quantities: Vane sells rare crystals at a premium, Marnie offers a predictable
gear sale, Mara's guaranteed gear bargain beats emergency-supply pricing, and
Silas gambles with a meaningful entry cost. Bulk trades take longer to afford in
a new city; construction, contract and technology requirements are unchanged.

| Trader | You pay | You receive |
| --- | --- | --- |
| Director Vane, Industrial Magnate | 600 Brass Coins | 30 Aether Crystals |
| Marnie Cogwell, Neighborhood Mechanic | 30 Gears | 120 Brass Coins |
| Captain Mara "Brasshook", Airship Pirate | 60 Brass Coins | 40 Gears |
| Silas Sprocket, Undercity Broker | 60 Brass Coins upfront | 50%: 160 coins; 50%: nothing |
| Quartermaster Holt, Industrial Guild Supply Officer | 40 Gears | 160 Brass Coins |

Only one guest appears alongside Vane/Marnie: Mara on the first visit, Silas on
the second, Holt on the third, then repeat. The saved event index determines the
guest, so ticking, dismissing, or reloading cannot reroll offers or dialogue.
Holt's delivery is a merchant trade, not a duplicate Supply Shortage emergency.

Silas's panel discloses both probabilities and net +100/-60 coin outcomes. The
hook supplies one random roll to the validated reducer action; the reducer never
draws randomness during rendering or replay. Both results charge the upfront
cost, resolve once and show the shared outcome popup only after processing.
The popup says "DEAL PAID OFF!" or "BAD DEAL!" according to the actual outcome.
Every trade popup includes a 3-6 word quote from its trader, beneath the bold
message in smaller italic text. Quotes and dismissal timers are replaced together.
Trader feedback holds fully visible for 1750ms, then fades for 500ms (2250ms
total); ordinary unrelated popups retain their 1250ms hold and 500ms fade
(research, contract claims and Engine stages use a 3000ms hold). Trade costs are
larger red text and rewards larger green text. Risky rewards are explicitly
potential, with the entry loss separately disclosed. Choices with no reward
omit the reward field entirely, including shortage waiting and union choices.

Only an actually processed failed risky trade, delayed worker departure or equipment-breakdown scrap carries the red-vignette effect
flag. The reusable `ScreenEffect` overlay fades a deep-red shadow around the
viewport edges over 1250ms, leaving the center clear. It is pointer-transparent,
sits below the centered message, and finishes independently if a different
popup replaces that message. Repeated failures replace its timer cleanly;
rejected trades, ordinary trades and failure-like message text cannot trigger
it. Reduced-motion users see a static tint for the same duration. Like popup
feedback, it is not saved or replayed on reload.
Auto-save preserves
balances and the resolved visit; transient popups are not replayed on reload.
Merchant trades do not count toward emergency-maintenance progress.

To verify, run `npm run dev`, resolve the first boiler alert, and open the
merchant alert. Inspect Vane, Marnie and Mara, then close/reopen or reload to
confirm stable dialogue. Choose one affordable trade and check the exact
exchange and popup. On subsequent cycles, inspect Silas's disclosed odds and
Holt's industrial delivery. All unaffordable buttons remain disabled with a
missing-resource explanation. Use `npm test -- src/test/city-merchant.test.tsx`
for deterministic probability-boundary, trade, UI, persistence and popup tests.

## Worker Union emergency

WORKERS DEMAND FAIR WAGES is the seventh city event, following Equipment
Breakdown. It uses the existing corner alert and event scheduler (still 15
seconds between resolved events). Activation selects a random existing,
operating production building; damaged and already-disputed buildings
are excluded. If none qualify, the event is skipped without rewards or progress.
The alert names the building and plot; it remains operational while you decide.
Closing the panel does not resolve it.

- **Pay the Union:** exactly 200 Brass Coins, "WORKERS PAID!" with
  "Fair wages keep engines turning." The building remains intact and operational.
  The choice card shows only the action and cost, with no consequence description
  or nonexistent reward field.
- **Refuse Their Demands:** no immediate cost, "WAGES WITHHELD!" with
  "You cannot silence the workers." The five-second game-time delay runs internally;
  no countdown, progress meter or delay announcement is shown.
- **At the five-second deadline:** "WORKERS HAVE WALKED!" with
  "No wages, no work." This specific popup holds both lines for 1750ms, then fades
  for 500ms. It also triggers the existing 1250ms red edge vignette, with the same
  click-through and reduced-motion behavior as a failed risky trade. Neither
  effect triggers on the initial refusal. The original building is removed without any construction
  or upgrade refund. Its damage tracking is cleared, and the underlying plot
  becomes available for rebuilding. Boiler loss removes its storage capacity and
  clamps stored steam; dock loss prevents new launches without another dock.
  There is no staffing or rehire mechanic. Upgrades/demolition cannot replace
  the targeted building during a pending dispute or delay; other plots remain
  usable.

The saved pending consequence records the original event, plot and deadline in
city elapsed time. The production clock synchronizes at actions and wakes at
the deadline, splitting production exactly there. It is independent of the
popup lifecycle; unrelated actions never reset the deadline.
Offline catch-up processes the same deadline. Reloading during the delay
preserves remaining time, and an overdue walkout shows its follow-up on return.
Once processed, the saved pending entry is cleared, so it cannot fire again;
the emptied plot persists. Save timestamps correspond to committed
simulation time so saving between ticks does not extend the countdown.
Previously unstaffed buildings from older saves are removed without refunds on
load, as approved; other buildings and balances are preserved (except steam
capacity clamping). This migration is not replayed after rebuilding.
Older six-event saves migrate their event index without changing the pending
event, targeted breakdown or merchant guest. New saves record the cycle length.

To verify, construct a workshop and resolve the first six alerts. For the union
alert, check the named workplace and simple payment card. Pay to test
the 200-coin deduction, or refuse to see the immediate popup and building loss
five seconds later, without any visible countdown. Trigger an ordinary action during the delay:
the departure popup must replace it when due. Reload during the delay and check
that it neither restarts nor disappears. Rebuild on the emptied plot and confirm
that the old walkout never removes the replacement. Account for healthy
buildings still producing when comparing balances.

Run `npm test` for all regressions, `npx tsc --noEmit` for types, and
`npm run build` for production. Union-specific coverage is in
`src/test/city-union.test.tsx`.
