import { TLBSetEntry } from './TLBSetEntry.js';
import { scaleC } from './Constants.js';
import { colorC } from "./App.js";
import { MGNT_BIT_WIDTH } from './Constants.js';
import { updateUsed, findLRU } from './HelperFunctions.js';

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
		for (var i = 0; i < this.E; i++) {
			this.entries[i] = new TLBSetEntry(p, t, PPNWidth);
			this.used[i] = -1;	// prepopulated all used as unused
		}


		// width for drawing
		this.width = this.entries[0].width + scaleC;
		// height of this set
		this.height = 1.5 * scaleC * this.E;
		// is this the set of interest for this access? (affects display)
		this.active = 0;
	}

    /**
     * reset each entry within this set to starting position
     */
	flush() {
		for (var i = 0; i < this.E; i++) {
			this.entries[i].flush();    // reset entry data
            this.used[i] = -1;          // reset used array
		}
	}

	setActive() { this.active = 1; }
	clearActive() { this.active = 0; }
	clearHighlight() { for (var i = 0; i < this.E; i++) this.entries[i].clearHighlight(); }

	/**
	 * Checks the current set for tag match.
	 * @param {*} tag 
	 * @return PPN if there's a valid matching tag or -1 otherwise
	 */
	checkTag(tag) {
		for (let i = 0; i < this.entries.length; i++) {
			if (this.entries[i].containTag(tag)) {
				// update used
				updateUsed(this.used, i);

				// emphasize entry found
				this.entries[i].highlightAll();

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
        // find first invalid entry
		for (let i = 0; i < this.entries.length; i++) {
			if (!this.entries[i].checkValid()) {
				this.entries[i].setPPN(permissions, tag, PPN);
				// update used
				updateUsed(this.used, i);

				// emphasize entry found
				this.entries[i].highlightAll();

				return;
			}
		}

		// if all entries are used, find LRU entry
		let maxIndex = findLRU(this.used);

		// emphasize entry found
		this.entries[maxIndex].highlightAll();

		// update used
		updateUsed(this.used, maxIndex);
		this.entries[maxIndex].setPPN(permissions, tag, PPN);
	}

    /**
     * invalidate entry assciated with given tag.
     * nothing is changed if no match exists between given 
     * tag and all entry tags
     * @param {*} tag 
     */
    invalidateEntry(tag) {
        for(let i = 0; i < this.entries.length; i++) {
            if(this.entries[i].containTag(tag)) {
                this.entries[i].flush();
                this.used[i] = -1;  // mark this entry as unused
                break;
            }
        }
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
}