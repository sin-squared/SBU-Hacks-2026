
import { useState } from 'react';
import {
    Cog,
    Flame,
    FlaskConical,
    Factory,
    Croissant,
    Ship,
    Plus,
    ArrowUp,
    Trash2,
    Lock,
    ChevronUp,
    Droplets,
    Gauge,
    Gem,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    BUILDINGS,
    LEVEL_OUTPUT,
    RESOURCE_NAMES,
    type BuildingKind,
    type Resource,
    type Stock,
} from '@/game/city-config';

import {
    actionReason,
    buildingRates,
    costText,
    eventState,
    eventTerms,
    interactiveEvents,
    isBreakdown,
    nextPlotTechnology,
    plotLimit,
    stage,
    upgradeCost,
} from '@/game/city';

import type { CityGame } from '@/hooks/useCity';

export const BUILDING_ICONS = {
    oilrig: Droplets,
    steamrig: Gauge,
    refinery: Gem,
    workshop: Cog,
    boiler: Flame,
    laboratory: FlaskConical,
    factory: Factory,
    bakery: Croissant,
    dock: Ship,
};

function ProductionSummary({
    output,
    input,
}: {
    output: Stock;
    input: Stock;
}) {
    const signed = (rates: Stock, sign: string) =>
        Object.entries(rates)
            .filter(([, amount]) => amount > 0)
            .map(
                ([key, value]) =>
                    `${sign}${Number(value.toFixed(4))} ${RESOURCE_NAMES[key as Resource]}`,
            );

    const parts = [...signed(output, '+'), ...signed(input, '−')];

    return (
        <p className="break-words text-base font-semibold text-steam">
            {parts.join(' · ') || '0.0'}
            {' '}
            <span className="text-xs font-normal text-muted-foreground">
                per second
            </span>
        </p>
    );
}

export function CityManagement({
    game,
    selectedPlot,
    onSelectPlot,
}: {
    game: CityGame;
    selectedPlot: number;
    onSelectPlot: (plot: number) => void;
}) {
    const [foundryOpen, setFoundryOpen] = useState(false);
    const s = game.state;
    const land = nextPlotTechnology(s);

    return (
        <section className="space-y-4">
            <div className="city-title-hud flex items-center justify-between">
                <h2 className="text-xl text-brass">City of Brasshaven</h2>
                <span className="text-sm text-muted-foreground">
                    {s.plots.filter(Boolean).length}/{plotLimit(s)} plots occupied
                </span>
            </div>

            <div className="city-foundry-menu">
                <Button
                    type="button"
                    className="btn-brass flex items-center gap-2"
                    aria-expanded={foundryOpen}
                    aria-controls="city-foundry-panel"
                    onClick={() => setFoundryOpen(!foundryOpen)}
                >
                    <Cog className="h-4 w-4" aria-hidden="true" />
                    Foundry Row
                    <ChevronUp
                        className={`h-4 w-4 transition-transform ${foundryOpen ? 'rotate-180' : ''
                            }`}
                        aria-hidden="true"
                    />
                </Button>

                <div
                    id="city-foundry-panel"
                    className="city-foundry-popover rounded-md border border-copper bg-iron-deep p-4"
                    hidden={!foundryOpen}
                >
                    <div className="mb-4 flex items-end justify-between border-b border-copper/60 pb-3">
                        <div>
                            <p className="font-display text-lg text-brass">
                                {['Foundry Row', 'Industrial Quarter', 'Aetherport'][
                                    Math.min(stage(s), 2)
                                ]}
                            </p>
                            <p className="text-xs text-steam">
                                {s.victory
                                    ? 'The Great Engine lives'
                                    : 'Rise of the Clockwork City'}
                            </p>
                        </div>

                        <Cog
                            className={`h-12 w-12 text-brass ${s.victory ? 'animate-spin-slow' : ''
                                }`}
                        />
                    </div>

                    <p className="mt-3 text-xs text-steam">
                        Adjacent boilers boost factories and bakeries by 25%.
                        Each boiler level adds 45 steam capacity.
                    </p>
                </div>
            </div>

            <div className="city-plot-scene">
                <div className="city-plot-grid">
                    {s.plots.map((plot, index) => {
                        const locked = index >= plotLimit(s);
                        const Icon = plot
                            ? BUILDING_ICONS[plot.kind]
                            : locked
                                ? Lock
                                : Plus;

                        return (
                            <Button
                                key={index}
                                variant="ghost"
                                aria-label={`Plot ${index + 1}${plot
                                    ? ': ' + BUILDINGS[plot.kind].name
                                    : locked
                                        ? ': locked'
                                        : ': empty'
                                    }`}
                                aria-pressed={selectedPlot === index}
                                onClick={() => onSelectPlot(index)}
                                disabled={locked}
                                className={`city-plot h-auto min-w-0 flex-col whitespace-normal border p-1 sm:p-2 ${selectedPlot === index
                                    ? 'border-brass bg-brass/15'
                                    : 'border-copper/50 bg-iron-deep/50'
                                    }`}
                            >
                                {plot ? (
                                    <svg
                                        viewBox="0 0 100 88"
                                        className="w-full max-w-24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M12 38 L50 14 L88 38 V82 H12Z"
                                            className="fill-secondary stroke-copper"
                                            strokeWidth="2"
                                        />
                                        <rect
                                            x="70"
                                            y="4"
                                            width="10"
                                            height="30"
                                            className="fill-copper"
                                        />
                                        {plot.kind === 'boiler' && (
                                            <circle
                                                cx="75"
                                                cy="4"
                                                r="7"
                                                className="fill-steam animate-steam"
                                            />
                                        )}
                                        <rect
                                            x="24"
                                            y="47"
                                            width="13"
                                            height="15"
                                            className="fill-brass"
                                        />
                                        <rect
                                            x="62"
                                            y="47"
                                            width="13"
                                            height="15"
                                            className="fill-amber"
                                        />
                                        <rect
                                            x="43"
                                            y="63"
                                            width="14"
                                            height="19"
                                            className="fill-iron-deep"
                                        />
                                        {plot.level > 1 && (
                                            <path
                                                d="M23 37 V18 H61 V37"
                                                className="fill-copper stroke-brass"
                                            />
                                        )}
                                        {plot.level > 2 && (
                                            <circle
                                                cx="42"
                                                cy="15"
                                                r="10"
                                                className="fill-brass"
                                            />
                                        )}
                                    </svg>
                                ) : (
                                    <Icon className="my-5 h-8 w-8 text-copper" />
                                )}

                                <span className="text-center text-[10px] leading-tight sm:text-xs">
                                    {plot
                                        ? BUILDINGS[plot.kind].name
                                        : locked
                                            ? `Plot ${index + 1} · Research required`
                                            : `Plot ${index + 1}`}
                                </span>

                                {plot && (
                                    <span className="flex gap-1 text-xs text-brass">
                                        <Icon /> L{plot.level}
                                    </span>
                                )}

                                {plot && s.damagedPlots.includes(index) && (
                                    <span className="text-xs text-destructive">
                                        Damaged · Paused
                                    </span>
                                )}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-steam">
                Operating adjacent boilers boost factories and bakeries by 25%.
                Each Boiler House or Steam Rig level adds 45 steam capacity.
            </p>

            {s.technologies.includes('whirr') && (
                <p className="text-xs text-steam">
                    Whirr Faster, Think Later: every machine runs 5% faster,
                    using and producing 5% more per second.
                </p>
            )}

            {land && (
                <p className="text-sm text-steam">
                    Next expansion: Plot {land.unlockPlot}. Open Research to unlock it.
                </p>
            )}
        </section>
    );
}

export function CityPlotDetails({
    game,
    selectedPlot,
    demolish,
    setDemolish,
}: {
    game: CityGame;
    selectedPlot: number;
    demolish: boolean;
    setDemolish: (value: boolean) => void;
}) {
    const s = game.state;
    const plot = s.plots[selectedPlot];
    const firstRig = !s.hasBuiltOilRig;
    const currentRates = plot
        ? buildingRates(s, plot, selectedPlot)
        : null;
    const upgradedRates =
        plot && plot.level < 3
            ? buildingRates(s, { ...plot, level: plot.level + 1 }, selectedPlot)
            : null;
    const damaged = s.damagedPlots.includes(selectedPlot);

    const breakdown = interactiveEvents(s).find(
        (event) =>
            event.eventPlot === selectedPlot &&
            isBreakdown(eventState(s, event)),
    );

    const repair = breakdown
        ? {
            type: 'event' as const,
            index: 0,
            eventIndex: breakdown.eventIndex,
        }
        : null;

    const repairReason = repair
        ? actionReason(s, repair)
        : 'Repair event unavailable';

    const repairCost = breakdown
        ? eventTerms(eventState(s, breakdown), 0).cost
        : null;

    return (
        <>
            <div className="flex items-center justify-between border-b border-copper pb-2">
                <h3 className="text-brass">
                    Plot {selectedPlot + 1}
                    {plot ? ` · ${BUILDINGS[plot.kind].name}` : ' · Construction'}
                </h3>
            </div>

            {plot ? (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Level {plot.level} · {BUILDINGS[plot.kind].purpose}
                    </p>

                    {currentRates && !damaged && (
                        <ProductionSummary {...currentRates} />
                    )}

                    {damaged && (
                        <p className="text-sm text-destructive">
                            Damaged: production and consumption are paused.
                        </p>
                    )}

                    {upgradedRates && (
                        <>
                            <p className="text-sm">
                                Upgrade: {costText(upgradeCost(plot))}
                            </p>
                            <p className="text-xs text-steam">
                                Next level: {LEVEL_OUTPUT[plot.level]}x base output.
                                Input consumption stays unchanged.
                            </p>
                            <ProductionSummary {...upgradedRates} />

                            {['boiler', 'steamrig'].includes(plot.kind) && (
                                <p className="text-xs">
                                    Upgrade adds 45 {RESOURCE_NAMES.steam} capacity.
                                </p>
                            )}
                        </>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            className="btn-brass"
                            disabled={Boolean(
                                actionReason(s, {
                                    type: 'upgrade',
                                    plot: selectedPlot,
                                }),
                            )}
                            onClick={() =>
                                game.act({ type: 'upgrade', plot: selectedPlot })
                            }
                        >
                            <ArrowUp /> Upgrade
                        </Button>

                        <Button
                            variant="outline"
                            disabled={Boolean(
                                actionReason(s, {
                                    type: 'demolish',
                                    plot: selectedPlot,
                                }),
                            )}
                            onClick={() => setDemolish(!demolish)}
                        >
                            <Trash2 /> Demolish
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {actionReason(s, {
                            type: 'upgrade',
                            plot: selectedPlot,
                        })}
                    </p>

                    {demolish && (
                        <div className="space-y-2 border-l-2 border-destructive pl-3">
                            <p className="text-sm">
                                Demolish this building? Returns 50% of its current base cost;
                                upgrades are not refunded. Losing your last income source
                                can strand the city.
                            </p>

                            <Button
                                variant="destructive"
                                disabled={Boolean(
                                    actionReason(s, {
                                        type: 'demolish',
                                        plot: selectedPlot,
                                    }),
                                )}
                                onClick={() => {
                                    game.act({
                                        type: 'demolish',
                                        plot: selectedPlot,
                                    });
                                    setDemolish(false);
                                }}
                            >
                                Confirm demolition
                            </Button>
                        </div>
                    )}

                    {damaged && (
                        <div className="space-y-2 border-t border-copper/40 pt-3">
                            <Button
                                className="btn-brass"
                                disabled={Boolean(repairReason)}
                                onClick={() => {
                                    if (repair) game.act(repair);
                                }}
                            >
                                Repair Building
                                {repairCost && ` · ${costText(repairCost)}`}
                            </Button>

                            {repairReason && (
                                <p className="text-sm text-trade-cost">
                                    {repairReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.keys(BUILDINGS) as BuildingKind[]).map((kind) => {
                        const building = BUILDINGS[kind];
                        const Icon = BUILDING_ICONS[kind];
                        const action = {
                            type: 'construct' as const,
                            plot: selectedPlot,
                            kind,
                        };
                        const reason = actionReason(s, action);
                        const highlighted = firstRig && kind === 'oilrig';
                        const rates = buildingRates(
                            s,
                            { kind, level: 1 },
                            selectedPlot,
                        );

                        return (
                            <article
                                key={kind}
                                aria-label={building.name}
                                className={`space-y-2 rounded-md border border-copper/60 bg-secondary/30 p-3 ${highlighted ? 'city-first-rig' : ''
                                    }`}
                            >
                                {highlighted && (
                                    <p className="font-display text-sm font-bold text-brass">
                                        YOUR INDUSTRIAL EMPIRE STARTS HERE
                                    </p>
                                )}

                                <h4 className="flex items-center gap-2 text-sm text-brass">
                                    <Icon className="h-4 w-4" />
                                    {building.name}
                                </h4>

                                <p className="text-xs text-muted-foreground">
                                    {building.purpose}
                                </p>

                                {highlighted && (
                                    <p className="text-sm text-steam">
                                        Build this first to fund your city. It generates oil
                                        and passive Brass Coin income without clicking.
                                    </p>
                                )}

                                <p className="text-xs">{costText(building.cost)}</p>

                                <ProductionSummary {...rates} />

                                <Button
                                    size="sm"
                                    className="btn-brass w-full"
                                    disabled={Boolean(reason)}
                                    onClick={() => game.act(action)}
                                >
                                    <Plus /> Construct
                                </Button>

                                {reason && (
                                    <p className="text-xs text-muted-foreground">
                                        {reason}
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </>
    );
}
