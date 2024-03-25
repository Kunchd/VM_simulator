import { scrollSize, hoverSize, scaleM, PMDisplayHeight, scaleC } from "./Constants.js";
import { PHYS_MEM_HIGHLIGHT } from "./Constants.js";
import { bg, colorC, colorB, colorM, lightEmphasis } from "./App.js";
import { bounded, findLRU, findUnused, updateUsed } from "./HelperFunctions.js";
import { xwidth, toBase, setScrollBarToDesiredPos } from "./HelperFunctions.js";
import { Page } from "./Page.js";

/**
 * class to represent physical memory
 */
// TODO: math probably needs modifcation to fit our needs
export class PhysicalMemory {

    /**
     * constructs a new instance of memory
     * @param {*} p the p5 object associated with the canvas which this memory
     *              representation will be placed in
     * @param {*} PMSize the total size of physical memory
     * @param {*} PgSize the size of a single page
     * @param {*} scrollBar the scroll bar associated with this table
     */
    constructor(p, PMSize, PgSize, scrollBar) {
        // calculate input bits
        this.p = p;
        this.PMSize = PMSize;
        this.PgSize = PgSize;
        this.PPNbits = this.p.log(this.PMSize / this.PgSize) / this.p.log(2);
        this.pages = [];	// contained pages
        this.used = [];		// time since usage for each page (for LRU)

        /*
         * 0 stands for unused
         * 1 stands for emphasis highlight
         * 2 stands for identification highlight
         */
        this.light = [];  // indicate highlighting for moved/changed data

        // initialize data
        for (var i = 0; i < PMSize / PgSize; i++) {
            this.light[i] = 0;                 	// nothing starts highlighted
            this.pages[i] = new Page(this.p, this.PgSize);
            this.used[i] = -1;		            // initialize all page to unused
        }

        // calculate dimensions of this table
        this.Mtop = scaleM + 5;  // initial y of top of memory
        this.Mheight = (PMSize / PgSize) * ((this.pages[0].height + 5) + scaleC);  // height of memory when drawn out
        this.Mwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
        this.x = scrollBar.xpos - this.Mwidth - 10; // x coordinate of this table

        this.vbarMem = scrollBar;   // the scroll bar created for the memory
        this.vbarMemEnable = (this.Mtop + this.Mheight > this.p.height);
    }

    /**
     * flush all recorded data from PM
     */
    flush() {
        // revert to initial state
        this.pages = [];	// contained pages
        this.used = [];		// time since usage for each page (for LRU)
        // -1 if currently unused

        /*
         * 0 stands for unused
         * 2 stands for identification highlight
         */
        this.light = [];  // indicate highlighting for moved/changed data

        // initialize data
        for (var i = 0; i < this.PMSize / this.PgSize; i++) {
            this.light[i] = 0;                 	// nothing starts highlighted
            this.pages[i] = new Page(this.p, this.PgSize);
            this.used[i] = -1;		// initialize all page to unused
        }
    }

    // helper methods for hightlighting
    /**
     * clear all emphasis highlight
     */
    clearHighlight() {
        for (var i = 0; i < this.light.length; i++) {
            if(this.light[i] !== 0) {
                this.light[i] = 2;
            }
            this.pages[i].clearHighlight();
        }
    }

    /**
     * Read byte PO from page at PPN
     * (handles highlighting)
     * @param {*} PPN number of physical page to read from
     * @param {*} PO byte offset to read
     */
    readFromPage(PPN, PO) {
        // update used for LRU
        updateUsed(this.used, PPN);

        // clear pervious emphasis
        this.clearHighlight();
        // higlight page being read
        this.light[PPN] = 1;
        // highlight byte being read
        this.pages[PPN].highlight(PO);

        // center scroll bar on byte read
        setScrollBarToDesiredPos((this.Mtop * 2 + PMDisplayHeight) / 2,
            this.Mtop + ((this.pages[0].height + 5) + scaleC) * PPN,
            this.Mheight - (PMDisplayHeight - this.pages[0].height),
            this.vbarMem);
    }

    /**
     * Write the given data to the page corresponding to the PPN at the PO
     * (handles highlighting)
     * @param {*} PPN physical page number
     * @param {*} PO page offset
     * @param {*} data data to be written
     */
    writeToPage(PPN, PO, data) {
        this.pages[PPN].write(PO, data);
        updateUsed(this.used, PPN);                    // reset usage for this page

        // emphasize byte written
        this.clearHighlight();
        // highlight page being writeen
        this.light[PPN] = 1;
        // higlight byte being wrote
        this.pages[PPN].highlight(PO);

        // center scroll bar on byte read
        setScrollBarToDesiredPos((this.Mtop * 2 + PMDisplayHeight) / 2,
            this.Mtop + ((this.pages[0].height + 5) + scaleC) * PPN,
            this.Mheight - (PMDisplayHeight - this.pages[0].height),
            this.vbarMem);
    }

    /**
     * get page at the given PPN
     * @param {*} PPN the page number to get the page of
     * @returns the page located at the given PPN
     */
    getPage(PPN) {
        setScrollBarToDesiredPos((this.Mtop * 2 + PMDisplayHeight) / 2,
            this.Mtop + ((this.pages[0].height + 5) + scaleC) * PPN,
            this.Mheight - (PMDisplayHeight - this.pages[0].height),
            this.vbarMem);

        // emphasis highlight this page
        this.clearHighlight();
        this.light[PPN] = 1;

        return this.pages[PPN];
    }

    /**
     * get the associating VPN for the page located at the given PPN
     * @param {*} PPN page number of the page to retrieve the VPN for
     * @returns VPN of the page at given PPN or -1 if no association exists
     */
    getAssociatingVPN(PPN) {
        return this.pages[PPN].getAssociatingVPN();
    }

    /**
     * set the page at PPN in PhysMem to the given page
     * @param {*} PPN the page number for the page to set
     * @param {*} VPN virtual page number mapping to this page
     * @param {*} page the page to replace previous page
     */
    setPage(PPN, VPN, page) {
        setScrollBarToDesiredPos((this.Mtop * 2 + PMDisplayHeight) / 2,
            this.Mtop + ((this.pages[0].height + 5) + scaleC) * PPN,
            this.Mheight - (PMDisplayHeight - this.pages[0].height),
            this.vbarMem);

        this.pages[PPN] = page;
        this.pages[PPN].setAssociatingVPN(VPN);
        this.pages[PPN].setAssociatingPPN(PPN);

        // emphasis highlight this page
        this.clearHighlight();
        this.light[PPN] = 1;

        updateUsed(this.used, PPN);
    }

    /**
     * allocate the page at the given PPN for the current process
     * @param {*} PPN physical page number of the page to allocate
     * @param {*} VPN virtual page number mapping to this page
     */
    allocatePage(PPN, VPN) {
        setScrollBarToDesiredPos((this.Mtop * 2 + PMDisplayHeight) / 2,
            this.Mtop + ((this.pages[0].height + 5) + scaleC) * PPN,
            this.Mheight - (PMDisplayHeight - this.pages[0].height),
            this.vbarMem);

        this.light[PPN] = 2;
        this.pages[PPN].setAssociatingVPN(VPN);
        this.pages[PPN].setAssociatingPPN(PPN);
        updateUsed(this.used, PPN);
    }

    /**
     * identify victim to evict from PM
     * If all pages are taken, the PPN of the Least Recently used page is returned
     * @returns PPN of the page to be replaced
     */
    findVictim() {
        let victimPPN = findLRU(this.used);

        // emphasis highlight this page
        this.clearHighlight();
        this.light[victimPPN] = 1;

        return victimPPN;
    }

    /**
     * @returns index of first unused page or -1 if all entries used
     */
    findUnusedPage() {
        return findUnused(this.used);
    }

    /**
     * Displays the memory table
     */
    display() {
        var x = this.x;
        var offset = 0;
        if (this.vbarMemEnable) {
            offset = -(this.Mheight - (PMDisplayHeight - this.pages[0].height)) * this.vbarMem.getPos();
        }

        for (var i = 0; i < this.PMSize / this.PgSize; i++) {
            var y = offset + this.Mtop + ((this.pages[0].height + 5) + scaleC) * i;
            if (bounded(y, this.Mtop, this.Mtop + PMDisplayHeight, this.pages[0].height + 5)) {

                // draw rectangle set around different entries
                this.p.stroke(colorC);  // orange set outline
                // this.p.strokeWeight(5);
                if (this.light[i] === 2) {
                    this.p.fill(PHYS_MEM_HIGHLIGHT);
                }
                else if (this.light[i] === 1) {
                    this.p.fill(lightEmphasis);
                }
                else {
                    this.p.noFill();
                }
                this.p.rect(x, y, this.pages[0].width + 5, this.pages[0].height + 5);

                // +5 hardcoded to align text with box
                var ytext = y + (this.pages[0].height + 5) / 2 + 5;
                // label word/row
                this.p.textSize(scaleM * 0.8);
                this.p.textAlign(this.p.RIGHT);
                this.p.noStroke();
                this.p.fill(colorC);
                this.p.text("0x" + toBase(i, 16, this.p.ceil(this.PPNbits / 4)), x - 2, ytext);

                this.pages[i].display(x + 2, y + 2.5);
            }
        }
        this.p.noStroke();
        this.p.fill(bg);
        // added 5 for margin
        this.p.rect(x, 0, this.Mwidth + 5, this.Mtop);  // background for header
        this.p.rect(x, 0, -scaleM * 5, this.Mtop);  // cover row address

        // display title
        this.p.fill(colorB);
        this.p.stroke(colorB);
        this.p.textSize(scaleM);
        this.p.textAlign(this.p.CENTER);
        this.p.text("Physical Memory", x + this.Mwidth / 2, 0.85 * scaleM);  // mem label

        // display PPN label
        this.p.textSize(scaleM * 0.8);
        this.p.textAlign(this.p.RIGHT);
        this.p.noStroke();
        this.p.fill(colorM);
        this.p.text("PPN", x, scaleM * 0.8);
    }
}