/* Helper function for determining width of boxes for cache and mem. */
export function xwidth(w) { return 0.2 + 0.7 * w; }


/**
 * Helper function that prints d in base b, padded out to padding digits.
 * @param {*} d value to convert
 * @param {*} b base
 * @param {*} padding padding out to set amount of digits. null for no padding
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
 * @param {*} scrollBar the scroll bar to set the position for
 */
export function setScrollBarToDesiredPos(desiredY, sheerY, percentageScaler, scrollBar) {
	let percentage = -(desiredY - sheerY) / percentageScaler;

	if(percentage < 0) {
		percentage = 0;
	}
	else if(percentage > 1) {
		percentage = 1;
	}
	
	scrollBar.setPos(percentage);
}

/**
 * Find the least recently used index from given arrays. 
 * Unused elements will first be returned.
 * Given arrays are expected to have same dimension
 * @param {*} curUsedArr array indicating whether an entry is being used.
 *                       0 indicates unused, non 0 indicates used.
 * @param {*} LRUArr array indicating how many access 
 *                   its been since the element was last used.
 * @returns index of the LRU or unused element.
 */
export function findLRU(curUsedArr, LRUArr) {
    // verify if there's any unused element
    let LRU = findUnused(curUsedArr);
    if(LRU != -1) return LRU;

    // find least recently used
    let max = -Number.MAX_VALUE;
    for(let i = 0; i < LRUArr.length; i++) {
        if(LRUArr[i] > max) {
            LRU = i;
            max = LRUArr[i];
        }
    }
    return LRU;
}

/**
 * find first unused entry within given array
 * @param {*} curUsedArr array indicating whether an entry is used.
 *                       0 indicates unused, non 0 indicates used.
 * @returns index of first unused entry, or -1 if all entries used
 */
export function findUnused(curUsedArr) {
    // naively search for first unused entry
    for(let i = 0; i < curUsedArr.length; i++) {
        if(curUsedArr[i] == 0) {
            return i;
        }
    }
    
    // page unused not found case
    return -1;
}