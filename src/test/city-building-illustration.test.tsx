import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CityBuildingIllustration } from '@/components/CityBuildingIllustration';
import { CityManagement } from '@/components/CityManagement';
import { freshCity } from '@/game/city';
import type { BuildingKind } from '@/game/city-config';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import type { CityGame } from '@/hooks/useCity';

const buildingKinds: BuildingKind[] = [
  'oilrig',
  'steamrig',
  'refinery',
  'workshop',
  'boiler',
  'factory',
  'laboratory',
  'bakery',
  'dock',
];

function cityGame(state = freshCity(1000)): CityGame {
  return {
    state,
    loaded: true,
    now: 1000,
    saveError: false,
    act: vi.fn(),
    reset: vi.fn(),
  };
}

describe('city building illustrations', () => {
  it('renders a distinct type-specific silhouette for every supported building at all three tiers', () => {
    const { container } = render(
      <>
        {buildingKinds.flatMap(kind =>
          [1, 2, 3].map(level => (
            <CityBuildingIllustration
              key={`${kind}-${level}`}
              kind={kind}
              level={level}
            />
          )),
        )}
      </>,
    );

    const illustrations = Array.from(
      container.querySelectorAll<SVGSVGElement>('[data-building-kind]'),
    );
    expect(illustrations).toHaveLength(buildingKinds.length * 3);

    for (const kind of buildingKinds) {
      const tiers = illustrations.filter(
        illustration => illustration.dataset.buildingKind === kind,
      );
      expect(tiers.map(illustration => illustration.dataset.buildingTier)).toEqual([
        '1',
        '2',
        '3',
      ]);
      expect(new Set(tiers.map(illustration => illustration.innerHTML)).size).toBe(3);
    }

    expect(
      new Set(
        illustrations
          .filter(illustration => illustration.dataset.buildingTier === '1')
          .map(illustration => illustration.innerHTML),
      ).size,
    ).toBe(buildingKinds.length);
  });

  it('updates the plot illustration immediately on upgrade and restores its saved tier after loading', () => {
    const state = freshCity(1000);
    state.plots[0] = { kind: 'factory', level: 1 };
    const onSelectPlot = vi.fn();
    const view = render(
      <CityManagement
        game={cityGame(state)}
        selectedPlot={0}
        onSelectPlot={onSelectPlot}
      />,
    );

    const plot = screen.getByRole('button', { name: 'Plot 1: Gear Factory' });
    expect(plot.querySelector('[data-building-tier]')).toHaveAttribute(
      'data-building-tier',
      '1',
    );

    state.plots[0] = { kind: 'factory', level: 2 };
    view.rerender(
      <CityManagement
        game={cityGame(state)}
        selectedPlot={0}
        onSelectPlot={onSelectPlot}
      />,
    );
    expect(plot.querySelector('[data-building-tier]')).toHaveAttribute(
      'data-building-tier',
      '2',
    );

    writeCity(state, 1000);
    const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 1000)!;
    view.rerender(
      <CityManagement
        game={cityGame(restored)}
        selectedPlot={0}
        onSelectPlot={onSelectPlot}
      />,
    );
    expect(plot.querySelector('[data-building-tier]')).toHaveAttribute(
      'data-building-tier',
      '2',
    );
  });

  it('clamps levels above the advanced tier to the advanced illustration', () => {
    const { container } = render(
      <CityBuildingIllustration kind="boiler" level={4} />,
    );
    expect(container.querySelector('svg')).toHaveAttribute(
      'data-building-tier',
      '3',
    );
  });
});
