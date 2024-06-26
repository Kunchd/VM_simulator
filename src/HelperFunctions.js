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
 * @param {*} LRUArr array indicating how many access 
 *                   its been since the element was last used.
 *                   Entry assumed to be -1 if unused.
 * @returns index of the LRU or unused element.
 */
export function findLRU(LRUArr) {
    // verify if there's any unused element
    let LRU = findUnused(LRUArr);
    if(LRU !== -1) return LRU;

    // find least recently used
    let max = -Number.MAX_VALUE;
    for(let i = 0; i < LRUArr.length; i++) {
        // although -1 case should never be reached. 
        // this is for safety check
        if(LRUArr[i] !== -1 && LRUArr[i] > max) {
            LRU = i;
            max = LRUArr[i];
        }
    }
    return LRU;
}

/**
 * find first unused entry within given array
 * @param {*} LRUArr array indicating how many access 
 *                   its been since the element was last used.
 *                   Entry assumed to be -1 if unused.
 * @returns index of first unused entry, or -1 if all entries used
 */
export function findUnused(LRUArr) {
    // naively search for first unused entry
    for(let i = 0; i < LRUArr.length; i++) {
        if(LRUArr[i] === -1) {
            return i;
        }
    }
    
    // page unused not found case
    return -1;
}

/**
 * update LRUArr considering that given updated Index is the 
 * index currently accessed. The number of access since used for
 * the current updated Index will be set to 0, while all other 
 * currently used indecies will be incremented.
 * @param {*} LRUArr array tracking number of access since last used for 
 *                   each individual index.
 */
export function updateUsed(LRUArr, updatedIndex) {
    for(let i = 0; i < LRUArr.length; i++) {
        if(i === updatedIndex) {
            LRUArr[i] = 0;
        }
        else if(LRUArr[i] >= 0) {
            LRUArr[i]++;
        }
    }
}

/* Helper function to read all parameters from URL.
 * https://html-online.com/articles/get-url-parameters-javascript/ 
 */
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

/* Helper function to get a specific parameter from URL.
 * Returns default value if not found.
 * https://html-online.com/articles/get-url-parameters-javascript/ 
 */
export function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlparameter = getUrlVars()[parameter];
    }
    return urlparameter;
}