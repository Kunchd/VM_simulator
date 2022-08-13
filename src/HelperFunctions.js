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