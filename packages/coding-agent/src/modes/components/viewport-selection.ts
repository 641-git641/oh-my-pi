import { sliceWithWidth } from "@oh-my-pi/pi-tui";

/** A 0-based terminal-cell coordinate in the current rendered viewport. */
export interface ViewportSelectionPoint {
	readonly row: number;
	readonly col: number;
}

/**
 * Slice the inclusive rectangle between two viewport points into clipboard text.
 * Rows are already the final rows painted by the Composer; ANSI controls are
 * retained while slicing so cell boundaries stay aligned, then removed from the
 * returned text. The right edge includes the cell under the release pointer.
 */
export function sliceViewportSelection(
	lines: readonly string[],
	columns: number,
	anchor: ViewportSelectionPoint,
	focus: ViewportSelectionPoint,
): string {
	const width = Math.max(0, Math.trunc(columns));
	const maxRow = lines.length - 1;
	const first: ViewportSelectionPoint = {
		row: Math.max(0, Math.min(maxRow, Math.trunc(anchor.row))),
		col: Math.max(0, Math.min(Math.max(0, width - 1), Math.trunc(anchor.col))),
	};
	const last: ViewportSelectionPoint = {
		row: Math.max(0, Math.min(maxRow, Math.trunc(focus.row))),
		col: Math.max(0, Math.min(Math.max(0, width - 1), Math.trunc(focus.col))),
	};
	const forward = first.row < last.row || (first.row === last.row && first.col <= last.col);
	const start = forward ? first : last;
	const end = forward ? last : first;
	const selected: string[] = [];

	for (let row = start.row; row <= end.row; row++) {
		const from = row === start.row ? start.col : 0;
		const to = row === end.row ? Math.min(width, end.col + 1) : width;
		const length = Math.max(0, to - from);
		const line = lines[row] ?? "";
		const slice = length > 0 ? sliceWithWidth(line, from, length, true).text : "";
		selected.push(Bun.stripANSI(slice));
	}

	return selected.join("\n").replace(/[\r\n]+$/u, "");
}

/**
 * Add a reverse-video highlight to the inclusive rectangle between two
 * viewport points. The selected span is emitted without its original ANSI
 * styling so the highlight cannot be cleared by an embedded reset sequence.
 */
export function highlightViewportSelection(
	lines: readonly string[],
	columns: number,
	anchor: ViewportSelectionPoint,
	focus: ViewportSelectionPoint,
): string[] {
	const width = Math.max(0, Math.trunc(columns));
	const maxRow = lines.length - 1;
	const first: ViewportSelectionPoint = {
		row: Math.max(0, Math.min(maxRow, Math.trunc(anchor.row))),
		col: Math.max(0, Math.min(Math.max(0, width - 1), Math.trunc(anchor.col))),
	};
	const last: ViewportSelectionPoint = {
		row: Math.max(0, Math.min(maxRow, Math.trunc(focus.row))),
		col: Math.max(0, Math.min(Math.max(0, width - 1), Math.trunc(focus.col))),
	};
	const forward = first.row < last.row || (first.row === last.row && first.col <= last.col);
	const start = forward ? first : last;
	const end = forward ? last : first;
	const highlighted = [...lines];

	for (let row = start.row; row <= end.row; row++) {
		const from = row === start.row ? start.col : 0;
		const to = row === end.row ? Math.min(width, end.col + 1) : width;
		const length = Math.max(0, to - from);
		if (length === 0) continue;
		const line = lines[row] ?? "";
		const prefix = sliceWithWidth(line, 0, from, true).text;
		const selected = sliceWithWidth(line, from, length, true).text;
		const suffix = sliceWithWidth(line, to, Math.max(0, width - to), true).text;
		highlighted[row] = `${prefix}\x1b[7m${Bun.stripANSI(selected)}\x1b[27m${suffix}`;
	}

	return highlighted;
}
