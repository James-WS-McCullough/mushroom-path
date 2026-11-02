import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { usePanZoom } from "./usePanZoom";

function setup(content = { width: 400, height: 400 }) {
	const viewport = ref({ width: 432, height: 532 });
	const view = usePanZoom({
		viewport,
		content: () => content,
		bottomInset: 100,
		fitMax: 1.6,
	});
	return { view, viewport };
}

describe("pan and zoom", () => {
	it("starts fitted to the viewport and centred, which is as far out as it goes", () => {
		const { view } = setup();
		expect(view.scale.value).toBeCloseTo(1);
		expect(view.offset.value).toEqual({ x: 16, y: 16 });
		expect(view.isZoomed.value).toBe(false);
		view.zoomOut();
		expect(view.scale.value).toBeCloseTo(1);
	});

	it("zooms in and back out to the fitted view", () => {
		const { view } = setup();
		view.zoomIn();
		expect(view.scale.value).toBeCloseTo(1.5);
		expect(view.isZoomed.value).toBe(true);
		// Zooming on the middle keeps the middle still
		expect(view.offset.value.x).toBeCloseTo(216 - 200 * 1.5);
		view.resetZoom();
		expect(view.scale.value).toBeCloseTo(1);
		expect(view.offset.value).toEqual({ x: 16, y: 16 });
	});

	it("stops zooming in at the maximum", () => {
		const { view } = setup();
		for (let i = 0; i < 10; i++) view.zoomIn();
		expect(view.scale.value).toBeCloseTo(2.6);
		expect(view.canZoomIn.value).toBe(false);
	});

	it("never fits a small farm bigger than the cap", () => {
		const { view } = setup({ width: 100, height: 100 });
		expect(view.scale.value).toBeCloseTo(1.6);
	});
});
