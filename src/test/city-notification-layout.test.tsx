import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionPopup } from '@/components/ActionPopup';
import { CityEvent } from '@/components/CityPanels';
import { CITY_EVENTS } from '@/game/city-config';
import { freshCity } from '@/game/city';
import type { CityGame } from '@/hooks/useCity';

function gameFor(eventActive = false): CityGame {
  const state = freshCity(0);
  state.plots[0] = { kind: 'oilrig', level: 1 };
  state.hasBuiltOilRig = true;
  state.shortageSeconds = 30;
  state.notice = 'Oil Rig on plot 1: workers demand fair wages. Production continues while you decide.';
  if (eventActive) {
    state.eventIndex = CITY_EVENTS.findIndex(event => event.title === 'WORKERS DEMAND FAIR WAGES');
    state.eventActive = true;
    state.eventPlot = 0;
  }
  return { state, loaded: true, now: 0, saveError: false, act: vi.fn(), reset: vi.fn() };
}

describe('notification placement regions', () => {
  it('keeps gameplay notices and interactive decisions separate from bottom-right city alerts', () => {
    render(<CityEvent game={gameFor(true)} shortages={['Gears demand exceeds production']} />);

    const gameplay = screen.getByRole('region', { name: 'Gameplay messages' });
    const alerts = screen.getByRole('region', { name: 'City alerts' });
    expect(gameplay).toHaveClass('city-gameplay-notifications');
    expect(alerts).toHaveClass('city-alert-stack');
    expect(gameplay).toHaveTextContent('Supply shortage: Gear-producing buildings run at 50% output for 30s.');
    expect(alerts).toHaveTextContent('City Alert');

    fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
    const dialog = screen.getByRole('dialog');
    expect(gameplay).not.toContainElement(dialog);
    expect(dialog).toHaveClass('fixed', 'left-[50%]', 'top-[50%]', 'max-w-lg');
    expect(dialog.querySelector('.lucide-users-round')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay the Union' })).toBeInTheDocument();
  });

  it('keeps action and achievement feedback in its large centered overlay', () => {
    render(<ActionPopup feedback={{ id: 1, message: 'ACHIEVEMENT UNLOCKED!', category: 'unlock' }} />);

    const popup = screen.getByRole('status');
    expect(popup).toHaveClass('max-w-lg', 'text-center');
    expect(popup.parentElement).toHaveClass('fixed', 'inset-0', 'items-center', 'justify-center');
  });

  it('uses the supply icon for the supply-shortage event', () => {
    const game = gameFor(true);
    game.state.eventIndex = CITY_EVENTS.findIndex(event => event.title === 'Supply Shortage');
    game.state.eventPlot = null;
    render(<CityEvent game={game} />);

    fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
    expect(screen.getByRole('dialog').querySelector('.lucide-package')).toBeInTheDocument();
  });
});
