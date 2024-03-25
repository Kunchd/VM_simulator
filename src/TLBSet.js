import { TLBSetEntry } from './TLBSetEntry.js';
import { scaleC } from './Constants.js';
import { colorC, lightEmphasis } from "./App.js";
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

    /**
     * emphasis highlight this set to show it's currently being considered
     */
    setActive() { this.active = 1; }

    /**
     * clear emphasis highlight
     */
    clearActive() { this.active = 0; }

    /**
     * clear all entries' emphasis highlight and clears this set's highlight
     */
    clearHighlight() {
        for (var i = 0; i < this.E; i++) this.entries[i].clearHighlight();
        this.clearActive();
    }

    /**
     * Checks the current set for tag match.
     * @param {*} tag 
     * @return PPN if there's a valid matching tag or -1 otherwise
     */
    getPPN(tag) {
        for (let i = 0; i < this.entries.length; i++) {
            if (this.entries[i].checkTag(tag) && this.entries[i].checkValid()) {
                // update used
                updateUsed(this.used, i);

                // emphasize entry found
                this.entries[i].highlightAll();

                return this.entries[i].getPPN();
            } else {
                // not the page we are looking for
                // clear all emphasis higlight for checking V and tag
                this.entries[i].clearHighlight();
            }
        }

        return -1;
    }

    /**
     * check if this set contains an entry with the given tag
     * (emphasize tag bit if found)
     * @param {*} tag tag to match
     * @returns index of the entry with matching tag, -1 otherwise
     */
    checkTag(tag) {
        for(let i = 0; i < this.entries.length; i++) {
            // clear highlight for previous emphasis
            this.entries[i].clearHighlight();
            if(this.entries[i].checkTag(tag)) {
                return i;
            }
            // clear emphasis highlight if not match.
            this.entries[i].clearHighlight();
        }
        return -1;
    }

    /**
     * check if the tlb entry with the given tag is valid or not
     * (emphasize valid bit if found)
     * @param {*} tag tag associated with the entry to verify
     * @returns true is the associating entry is valid, false if not.
     */
    checkValid(tag) {
        // clear previous highlight
        let i = this.checkTag(tag);
        this.entries[i].clearHighlight();
        return i !== -1 && this.entries[i].checkValid();
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
            } else {
                // not empty, we clear checking V highlight
                this.entries[i].clearHighlight();
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
        for (let i = 0; i < this.entries.length; i++) {
            if (this.entries[i].checkTag(tag) && this.entries[i].checkValid()) {
                this.entries[i].flush();
                this.used[i] = -1;  // mark this entry as unused
                break;
            } else {
                // clear emphasis highlight since it's not the one we want
                this.clearHighlight();
            }
        }
    }

    display(x, y) {
        // draw rectangle set around different entries
        this.p.stroke(colorC);  // orange set outline
        (this.active ? this.p.fill(lightEmphasis) : this.p.noFill());
        this.p.rect(x, y, this.width, 1.5 * scaleC * this.E);

        // draw each entry within the set
        for (var i = 0; i < this.E; i++) {
            this.entries[i].display(x + 0.5 * scaleC, y + scaleC * (1 + 6 * i) / 4);
        }
    }
}