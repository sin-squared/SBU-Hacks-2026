import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPopup } from '@/components/ActionPopup';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('ActionPopup', () => {
 it('centers a non-interactive announcement, holds for 1250ms, fades for 500ms, and removes it', () => {
  vi.useFakeTimers();
  render(<ActionPopup feedback={{ id: 1, message: 'SUPPLIES SECURED!', quote: 'Take it before I reconsider.' }}/>);
  const popup = screen.getByRole('status');
  expect(popup.parentElement).toHaveClass('fixed', 'inset-0', 'items-center', 'justify-center', 'pointer-events-none');
  expect(popup).toHaveClass('duration-500', 'transition-opacity', 'motion-reduce:transition-none');
  expect(popup).toHaveAttribute('aria-atomic', 'true');
  expect(popup).toHaveAttribute('data-phase', 'visible');
  expect(screen.getByText('"Take it before I reconsider."')).toHaveClass('italic', 'text-sm');
  expect(popup.querySelectorAll('p')[0]).toHaveTextContent('SUPPLIES SECURED!');
  act(() => vi.advanceTimersByTime(1249));
  expect(popup).toHaveClass('opacity-100');
  act(() => vi.advanceTimersByTime(1));
  expect(popup).toHaveClass('opacity-0');
  expect(popup).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(499));
  expect(popup).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
 });
 it('replaces a fading message cleanly and cleans up old timers without resetting on normal renders', () => {
  vi.useFakeTimers();
  const { rerender, unmount } = render(<ActionPopup feedback={{ id: 1, message: 'FIRST', quote: 'First character speaks here.' }}/>);
  act(() => vi.advanceTimersByTime(1350));
  rerender(<ActionPopup feedback={{ id: 2, message: 'SECOND', quote: 'Second character speaks here.' }}/>);
  expect(screen.queryByText('FIRST')).not.toBeInTheDocument();
  expect(screen.queryByText('"First character speaks here."')).not.toBeInTheDocument();
  expect(screen.getByText('"Second character speaks here."')).toBeInTheDocument();
  expect(screen.getAllByRole('status')).toHaveLength(1);
  act(() => vi.advanceTimersByTime(400));
  expect(screen.getByRole('status')).toHaveTextContent('SECOND');
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  rerender(<ActionPopup feedback={{ id: 2, message: 'SECOND' }}/>);
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  rerender(<ActionPopup feedback={{ id: 3, message: 'THIRD' }}/>);
  expect(screen.getByRole('status')).toHaveTextContent('THIRD');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
 });
 it('clears timers when feedback is removed', () => {
  vi.useFakeTimers();
  const { rerender } = render(<ActionPopup feedback={{ id: 1, message: 'FIRST' }}/>);
  rerender(<ActionPopup feedback={null}/>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
 });

 it('gives only trader popups a 1750ms hold followed by a 500ms fade', () => {
  vi.useFakeTimers();
  render(<ActionPopup feedback={{ id: 1, message: 'GEARS TRADED!', quote: 'Every gear keeps us going.', category: 'trade' }}/>);
  act(() => vi.advanceTimersByTime(1749));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(499));
  expect(screen.getByRole('status')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
 });

 it('does not infer a vignette from failure text or quotes', () => {
  render(<ActionPopup feedback={{ id: 1, message: 'BAD DEAL!', quote: 'Nothing ventured, nothing gained.' }}/>);
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
 });

 it('keeps the non-interactive vignette for 1250ms independently of replacement popups', () => {
  vi.useFakeTimers();
  const ui = render(<ActionPopup feedback={{ id: 1, message: 'BAD DEAL!', quote: 'Nothing ventured, nothing gained.', category: 'trade', effect: 'red-vignette' }}/>);
  const overlay = document.querySelector('.failure-vignette')!;
  expect(overlay).toHaveClass('pointer-events-none', 'fixed', 'inset-0', 'z-[55]');
  expect(overlay).toHaveAttribute('aria-hidden', 'true');
  act(() => vi.advanceTimersByTime(500));
  ui.rerender(<ActionPopup feedback={{ id: 2, message: 'WORKSHOP BUILT!' }}/>);
  expect(overlay).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('WORKSHOP BUILT!');
  expect(screen.queryByText('"Nothing ventured, nothing gained."')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(749));
  expect(overlay).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(overlay).not.toBeInTheDocument();
  ui.rerender(<ActionPopup feedback={{ id: 2, message: 'WORKSHOP BUILT!' }}/>);
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  ui.unmount();
  expect(vi.getTimerCount()).toBe(0);
 });

 it('replaces a trader popup and its quote without stale timers, including another failure effect', () => {
  vi.useFakeTimers();
  const ui = render(<ActionPopup feedback={{ id: 1, message: 'CRYSTALS ACQUIRED!', quote: 'Profit waits for no one.', category: 'trade' }}/>);
  act(() => vi.advanceTimersByTime(1500));
  ui.rerender(<ActionPopup feedback={{ id: 2, message: 'BAD DEAL!', quote: 'Nothing ventured, nothing gained.', category: 'trade', effect: 'red-vignette' }}/>);
  expect(screen.queryByText('"Profit waits for no one."')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('"Nothing ventured, nothing gained."');
  act(() => vi.advanceTimersByTime(1000));
  ui.rerender(<ActionPopup feedback={{ id: 3, message: 'BAD DEAL!', quote: 'Nothing ventured, nothing gained.', category: 'trade', effect: 'red-vignette' }}/>);
  act(() => vi.advanceTimersByTime(250));
  expect(document.querySelectorAll('.failure-vignette')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'visible');
  act(() => vi.advanceTimersByTime(1000));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
 });
});
