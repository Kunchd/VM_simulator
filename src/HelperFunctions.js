/* Helper function for determining width of boxes for cache and mem. */
export function xwidth(w) { return 0.2 + 0.7 * w; }


/* Helper function that prints d in base b, padded out to padding digits. */
export function toBase(d, b, padding) {
	var out = Number(d).toString(b);
	padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
	while (out.length < padding)
		out = "0" + out;
	return out;
}

/**
 * helper function to determin whether the current value is within the bound of the 
 * given bounds, inclusive
 * @param {*} value the current value to check the bounds for
 * @param {*} minHeight the minimum value the given value can occupy
 * @param {*} maxHeight the maximum value the given value can occupy
 * @returns a boolean indicating whether the given value is within bound
 */
export let bounded = (value, minHeight, maxHeight) => {
	return minHeight <= value && value <= maxHeight;
}