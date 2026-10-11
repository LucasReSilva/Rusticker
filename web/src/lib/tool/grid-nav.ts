export function nextIndex(
	current: number,
	key: string,
	count: number,
	columns: number,
	rtl = false
): number {
	if (count === 0) return -1;
	const horizontal = rtl ? -1 : 1;
	const offsets: Record<string, number> = {
		ArrowLeft: -horizontal,
		ArrowRight: horizontal,
		ArrowUp: -Math.max(1, columns),
		ArrowDown: Math.max(1, columns)
	};
	if (key === 'Home') return 0;
	if (key === 'End') return count - 1;
	return Math.max(0, Math.min(count - 1, current + (offsets[key] ?? 0)));
}
