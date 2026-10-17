import { describe, expect, it } from 'vitest';
import {
	DRAG_PX,
	REVEAL_PX,
	advanceGesture,
	crossSlideState,
	releaseOutcome,
	startGesture,
	toggleSelection,
} from '../src/lib/interaction';

const origin = { x: 100, y: 100 };
const gestureAt = (x: number, y: number) => advanceGesture(startGesture(origin), { x, y });

describe('cross-slide classification', () => {
	it('keeps a short movement a tap so activation still works', () => {
		expect(crossSlideState(startGesture(origin), { x: 100, y: 100 + REVEAL_PX - 1 })).toBe('idle');
		expect(releaseOutcome(gestureAt(100, 100 + REVEAL_PX - 1))).toBe('open');
	});

	it('arms the self-revealing check between the two thresholds', () => {
		expect(crossSlideState(startGesture(origin), { x: 100, y: 100 + REVEAL_PX })).toBe('armed');
		expect(releaseOutcome(gestureAt(100, 100 + DRAG_PX - 1))).toBe('select');
	});

	it('picks the tile up past the drag threshold instead of selecting', () => {
		expect(releaseOutcome(gestureAt(100, 100 + DRAG_PX))).toBe('ignore');
		expect(gestureAt(100, 100 + DRAG_PX).state).toBe('dragging');
	});

	it('leaves horizontal movement to the canvas pan', () => {
		expect(crossSlideState(startGesture(origin), { x: 100 + REVEAL_PX, y: 101 })).toBe('panning');
		expect(releaseOutcome(gestureAt(100 + 40, 104))).toBe('ignore');
	});

	it('does not turn a pan into a select once the canvas has taken over', () => {
		const panned = gestureAt(100 + 30, 102);
		expect(panned.state).toBe('panning');
		expect(advanceGesture(panned, { x: 100, y: 100 + DRAG_PX - 2 }).state).toBe('panning');
	});

	it('drops back to a tap when the finger returns inside the threshold', () => {
		const armed = gestureAt(100, 100 + REVEAL_PX + 4);
		expect(armed.state).toBe('armed');
		expect(advanceGesture(armed, { x: 100, y: 100 + 2 }).state).toBe('idle');
	});
});

describe('selection', () => {
	it('selects, then cancels when the same tile is picked again', () => {
		expect(toggleSelection(null, 'figma')).toBe('figma');
		expect(toggleSelection('figma', 'figma')).toBeNull();
	});

	it('replaces the previous selection without a selection basket', () => {
		expect(toggleSelection('figma', 'github')).toBe('github');
	});
});
