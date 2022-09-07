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

		// instantiate entries in set
		this.entries = [];
		for (var i = 0; i < E; i++)
			this.entries[i] = new TLBSetEntry(p, t, PPNWidth);
		
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
	 * @param {*} tag 
	 * @return PPN if there's a valid matching tag or -1 otherwise
	 */
	checkTagWrite(tag) {
		for(let entry of this.entries) {
			if(entry.containTagWrite(tag)) {
				return entry.getPPN();
			}
		}
		return -1;
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