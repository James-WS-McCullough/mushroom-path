import { computed, type Ref, ref } from "vue";

/** How far a press can wander before it counts as a drag instead of a tap */
const DRAG_THRESHOLD = 6;
/** Most zoomed in, as a scale on the board */
const MAX_SCALE = 2.6;
/** Room kept around the board in the fitted view */
const FIT_MARGIN = 16;
/** How far past the board's edge you can pan when zoomed in */
const PAN_MARGIN = 24;

interface Size {
	width: number;
	height: number;
}

interface Point {
	x: number;
	y: number;
}

/**
 * Pinch, scroll-wheel and drag to zoom and pan around a board inside a
 * viewport. The fitted view (the whole board on screen) is the most
 * zoomed out; dragging never turns into a tap.
 */
export function usePanZoom(options: {
	/** The viewport's size */
	viewport: Ref<Size>;
	/** The board's unscaled size */
	content: () => Size;
	/** Space kept clear at the bottom of the viewport */
	bottomInset: number;
	/** The fitted view never scales the board up past this */
	fitMax: number;
}) {
	const zoom = ref(1);
	/** Where the board's top-left corner wants to be, before clamping */
	const pan = ref<Point>({ x: 0, y: 0 });
	/** Ease the board into place (for the buttons, not gestures) */
	const animate = ref(false);

	const available = computed(() => ({
		width: options.viewport.value.width,
		height: Math.max(0, options.viewport.value.height - options.bottomInset),
	}));

	const fitScale = computed(() => {
		const { width, height } = available.value;
		const content = options.content();
		if (!width || !height || !content.width || !content.height) return 1;
		return Math.min(
			options.fitMax,
			(width - FIT_MARGIN * 2) / content.width,
			(height - FIT_MARGIN * 2) / content.height,
		);
	});

	const maxZoom = computed(() => Math.max(1, MAX_SCALE / fitScale.value));
	const scale = computed(
		() => fitScale.value * Math.min(zoom.value, maxZoom.value),
	);

	/** Centre the board along an axis it fits in, otherwise keep it from drifting off */
	function clampAxis(at: number, size: number, room: number): number {
		if (size <= room) return (room - size) / 2;
		return Math.min(PAN_MARGIN, Math.max(room - size - PAN_MARGIN, at));
	}

	const offset = computed((): Point => {
		const content = options.content();
		return {
			x: clampAxis(
				pan.value.x,
				content.width * scale.value,
				available.value.width,
			),
			y: clampAxis(
				pan.value.y,
				content.height * scale.value,
				available.value.height,
			),
		};
	});

	const isZoomed = computed(() => scale.value > fitScale.value + 1e-6);
	const canZoomIn = computed(() => zoom.value < maxZoom.value - 1e-6);

	/** Zoom by `factor`, keeping the board still under `point` */
	function zoomAt(point: Point, factor: number) {
		const before = scale.value;
		const from = offset.value;
		zoom.value = Math.min(maxZoom.value, Math.max(1, zoom.value * factor));
		const ratio = scale.value / before;
		pan.value = {
			x: point.x - (point.x - from.x) * ratio,
			y: point.y - (point.y - from.y) * ratio,
		};
	}

	function panBy(dx: number, dy: number) {
		pan.value = { x: offset.value.x + dx, y: offset.value.y + dy };
	}

	function centre(): Point {
		return { x: available.value.width / 2, y: available.value.height / 2 };
	}

	function zoomIn() {
		animate.value = true;
		zoomAt(centre(), 1.5);
	}

	function zoomOut() {
		animate.value = true;
		zoomAt(centre(), 1 / 1.5);
	}

	function resetZoom() {
		animate.value = true;
		zoom.value = 1;
	}

	// ---------------------------------------------------------------------
	// Gestures
	// ---------------------------------------------------------------------

	const pointers = new Map<number, Point>();
	let pressStart: Point | null = null;
	let dragging = false;
	let swallowClick = false;
	let pinchDistance = 0;
	let pinchMiddle: Point = { x: 0, y: 0 };

	function localPoint(event: PointerEvent | WheelEvent): Point {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	function pinch(): { distance: number; middle: Point } {
		const [a, b] = [...pointers.values()] as [Point, Point];
		return {
			distance: Math.hypot(a.x - b.x, a.y - b.y),
			middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
		};
	}

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType === "mouse" && event.button !== 0) return;
		animate.value = false;
		swallowClick = false;
		pointers.set(event.pointerId, localPoint(event));
		if (pointers.size === 1) {
			pressStart = localPoint(event);
			dragging = false;
		} else if (pointers.size === 2) {
			// A second finger: pinching, never a tap
			dragging = true;
			({ distance: pinchDistance, middle: pinchMiddle } = pinch());
			const target = event.currentTarget as HTMLElement;
			for (const id of pointers.keys()) target.setPointerCapture?.(id);
		}
	}

	function onPointerMove(event: PointerEvent) {
		const previous = pointers.get(event.pointerId);
		if (!previous) return;
		const point = localPoint(event);
		pointers.set(event.pointerId, point);

		if (pointers.size >= 2) {
			const { distance, middle } = pinch();
			panBy(middle.x - pinchMiddle.x, middle.y - pinchMiddle.y);
			if (pinchDistance > 0) zoomAt(middle, distance / pinchDistance);
			pinchDistance = distance;
			pinchMiddle = middle;
			return;
		}

		if (!dragging && pressStart) {
			const moved = Math.hypot(point.x - pressStart.x, point.y - pressStart.y);
			if (moved < DRAG_THRESHOLD) return;
			dragging = true;
			(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		}
		if (dragging) panBy(point.x - previous.x, point.y - previous.y);
	}

	function onPointerUp(event: PointerEvent) {
		if (!pointers.delete(event.pointerId)) return;
		if (dragging) swallowClick = true;
		if (pointers.size === 0) {
			dragging = false;
			pressStart = null;
		} else {
			// Back to one finger after a pinch: carry on dragging with it
			pressStart = [...pointers.values()][0] ?? null;
		}
	}

	/** Swallow the click that ends a drag, so it doesn't tap whatever's underneath */
	function onClickCapture(event: MouseEvent) {
		if (!swallowClick) return;
		swallowClick = false;
		event.stopPropagation();
		event.preventDefault();
	}

	function onWheel(event: WheelEvent) {
		event.preventDefault();
		animate.value = false;
		// Trackpad pinches arrive as wheel events with ctrl held, and are much smaller
		const speed = event.ctrlKey ? 0.01 : 0.0015;
		zoomAt(localPoint(event), Math.exp(-event.deltaY * speed));
	}

	return {
		scale,
		offset,
		animate,
		isZoomed,
		canZoomIn,
		zoomIn,
		zoomOut,
		resetZoom,
		handlers: {
			pointerdown: onPointerDown,
			pointermove: onPointerMove,
			pointerup: onPointerUp,
			pointercancel: onPointerUp,
			wheel: onWheel,
		},
		onClickCapture,
	};
}
