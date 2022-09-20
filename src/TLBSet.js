import { TLBSetEntry } from './TLBSetEntry.js';
import { scaleC } from './Constants.js';
import { colorC, colorM, colorH } from "./App.js";
import { xwidth } from './HelperFunctions.js';
import { MGNT_BIT_WIDTH } from './Constants.js';

/* Class to represent a TLB set (E cache lines).
 * This is where most of the cache policies are handled. */
export class TLBSet {
	/**
	 * constructs a TLB set
	 * @param {*} p p5 object of the current canvas
	 * @param {*} E associativty of TLB
	 * @param {*} t tag width
	 * @param {*} PPNWidth PPN width
	 */
	constructor(p, E, t, PPNWidth) {
		this.p = p;   // p5 object for current canvas

		this.E = E;   // associativty
		this.t = t;   // tag width
		this.PPNWidth = PPNWidth;   // PPN width

		this.entries = [];		// instantiate entries in set
		this.used = []; 		// accesses since page last used (for LRU)
		for (var i = 0; i < E; i++) {
			this.entries[i] = new TLBSetEntry(p, t, PPNWidth);
			this.used[i] = E;	// prepopulated all used entry with big number, to show lack of use
		}


		// width for drawing
		this.width = scaleC * (xwidth(1) * (MGNT_BIT_WIDTH)
			+ xwidth(t < 1 ? 0 : this.p.ceil(t / 4)) + xwidth(this.p.ceil(this.PPNWidth / 4)) + 1);
		// height of this set
		this.height = 1.5 * scaleC * this.E;
		// is this the set of interest for this access? (affects display)
		this.active = 0;
	}

	flush() {
		for (var i = 0; i < E; i++) {
			this.entries[i].invalidate();
			// if (replace > 0) this.used[i] = (replace == 1 ? E-i : 0);  // reset replacement policy
		}
	}

	setActive() { this.active = 1; }
	clearActive() { this.active = 0; }
	clearHighlight() { for (var i = 0; i < E; i++) this.entries[i].clearHighlight(); }

	/**
	 * Checks the current set for tag match.
	 * @param {*} flag a boolean flag indicating read/write status. 
	 * 				   true: write
	 * 				   false: read
	 * @param {*} tag 
	 * @return PPN if there's a valid matching tag or -1 otherwise
	 */
	checkTag(flag, tag) {
		for (let i = 0; i < this.entries.length; i++) {
			if (this.entries[i].containTag(flag, tag)) {
				// update used
				this.used[i] = 0;
				this.updateUsed(i);
				return this.entries[i].getPPN();
			}
		}

		return -1;
	}

	/**
	 * set the first available space within this set to the given PPN and tag.
	 * If no space is available, Least Recently Used is repalced
	 * @param {*} permissions an object containing permission to V, D, R, W, E bits
	 * @param {*} tag tag for the newly added PPN
	 * @param {*} PPN PPN to add to this set
	 */
	setEntry(permissions, tag, PPN) {
		for (let i = 0; i < this.entries.length; i++) {
			if (!this.entries[i].checkValid()) {
				this.entries[i].setPPN(permissions, tag, PPN);
				// update used
				this.used[i] = 0;
				this.updateUsed(i);
				return;
			}
		}

		// if all entries are used, find LRU entry
		let max = -Number.MAX_VALUE;
		let maxIndex = -1;
		for (let i = 0; i < this.used.length; i++) {
			if (this.used[i] > max) {
				maxIndex = i;
			}
		}

		// update used
		this.used[i] = 0;
		this.updateUsed(i);
		this.entries[i].setPPN(permissions, tag, PPN);
	}

	display(x, y) {
		// draw rectangle set around different entries
		this.p.stroke(colorC);  // orange set outline
		(this.active ? this.p.fill(255, 0, 0, 50) : this.p.noFill());
		this.p.rect(x, y, this.width, 1.5 * scaleC * this.E);

		// draw each entry within the set
		for (var i = 0; i < this.E; i++) {
			this.entries[i].display(x + 0.5 * scaleC, y + scaleC * (1 + 6 * i) / 4);
		}
	}

	/**
	 * increment time since use of all entries except for the current used entry
	 * @param {*} index the index of the current used entry
	 */
	updateUsed(index) {
		for (let i = 0; i < this.used.length; i++) {
			if (i !== index) {
				this.used[i]++;
			}
		}
	}
}