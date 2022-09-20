/* Helper function for determining width of boxes for cache and mem. */
export function xwidth(w) { return 0.2 + 0.7 * w; }


/**
 * Helper function that prints d in base b, padded out to padding digits.
 * @param {*} d value to convert
 * @param {*} b base
 * @param {*} padding padding out to set amount of digits
 * @returns 
 */
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
 * @param {*} flex the flexibility of the bounds to accept values slightly greater than it.
 * 				   defaults to 0
 * @returns a boolean indicating whether the given value is within bound
 */
export let bounded = (value, minHeight, maxHeight, flex = 0) => {
	return minHeight - flex <= value && value <= maxHeight + flex;
}

/**
 * get the vbar percentage necessary to display any entry of a table at the
 * desired Y value given the necessary parameters
 * @param {*} desiredY desired Y value to display the entry
 * @param {*} sheerY sheer Y value of the entry without any offsets
 * @param {*} percentageScaler the scalar scalling the percentage to the correct offset
 * @returns percentage needed to display an entry at the desired Y. Rounded to 1 if the 
 * 			percentage is greater than 1, and 0 if the percentage is less than 0.
 */
export function getVbarPercentage(desiredY, sheerY, percentageScaler) {
	let percentage = -(desiredY - sheerY) / percentageScaler;

	if(percentage < 0) {
		return 0;
	}
	if(percentage > 1) {
		return 1;
	}
	return percentage;
}