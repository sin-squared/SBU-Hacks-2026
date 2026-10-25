import { CircleDollarSign, Cog, Wind, Gem, FlaskConical, Droplets } from "lucide-react";
import { RESOURCE_NAMES, type Cost, type Resource, type Stock } from "@/game/city-config";

const ICONS = {
  coins: CircleDollarSign,
  gears: Cog,
  steam: Wind,
  crystals: Gem,
  research: FlaskConical,
  oil: Droplets,
};

export function ResourceAmounts({
  amounts,
  active,
  stock,
  available,
  completed = false,
}: {
  amounts: Cost;
  active?: Stock;
  stock?: Stock;
  available?: Stock;
  completed?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {Object.entries(amounts).map(([key, amount], index) => {
        const resource = key as Resource;
        const Icon = ICONS[resource];
        const affordable = available !== undefined && available[resource] + 1e-8 >= amount;
        const muted =
          completed || (available === undefined && active !== undefined && active[resource] <= 0);
        return (
          <span key={resource} className="inline-flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">{" · "}</span>}
            <span
              data-resource={resource}
              data-muted={muted}
              data-affordable={available === undefined ? undefined : affordable}
              className={`inline-flex items-center gap-1 ${completed ? "text-muted-foreground" : available !== undefined ? (affordable ? "text-trade-reward" : "text-trade-cost") : muted ? "resource-requirement-muted" : ""}`}
              title={
                completed
                  ? undefined
                  : available !== undefined
                    ? affordable
                      ? "Enough resources"
                      : "Insufficient resources"
                    : muted
                      ? "No active production; stored resources can still be spent."
                      : undefined
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {stock ? `${Math.floor(stock[resource])}/${amount}` : amount}{" "}
              {RESOURCE_NAMES[resource]}
            </span>
          </span>
        );
      })}
    </span>
  );
}
