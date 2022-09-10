import { scrollSize, hoverSize, scaleM, PMDisplayHeight, scaleC } from "./Constants.js";
import { PHYS_MEM_HIGHLIGHT } from "./Constants.js";
import { bg, colorC, colorB, colorM } from "./App.js";
import { bounded } from "./HelperFunctions.js";
import { xwidth, toBase } from "./HelperFunctions.js";
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

		/*
		 * 0 stands for unused
		 * 1 stands for used by current process
		 * 2 stands for highlighted for change
		 */
		this.light = [];  // indicate highlighting for moved/changed data

		// initialize data
		for (var i = 0; i < PMSize / PgSize; i++) {
			this.light[i] = 0;                 // nothing starts highlighted
			this.pages[i] = new Page(this.p, this.PgSize);
		}

		// calculate dimensions of this table
		this.Mtop = scaleM + 5;  // initial y of top of memory
		this.Mheight = (PMSize / PgSize) * ((this.pages[0].height + 5) + scaleC);  // height of memory when drawn out
		this.Mwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
		this.x = scrollBar.xpos - this.Mwidth - 10; // x coordinate of this table

		this.vbarMem = scrollBar;   // the scroll bar created for the memory
		this.vbarMemEnable = (this.Mtop + this.Mheight > this.p.height);
	}

	// helper methods for hightlighting
	// highlighting:  0 - no highlight, 1 - background, 2 - background + text
	highlight(addr, light) { this.light[addr] = light; }
	clearHighlight() { for (var i = 0; i < this.light.length; i++) this.light[i] = 0; }

	/**
	 * Write the given data to the page corresponding to the PPN at the PO
	 * @param {*} PPN physical page number
	 * @param {*} PO page offset
	 * @param {*} data data to be written
	 */
	writeToPage(PPN, PO, data) {
		this.pages[PPN].write(PO, data);
	}

	/**
	 * get page at the given PPN
	 * @param {*} PPN the page number to get the page of
	 * @returns the page located at the given PPN
	 */
	getPage(PPN) {
		return this.pages[PPN];
	}

	/**
	 * set the page at PPN in PhysMem to the given page
	 * @param {*} PPN the page number for the page to set
	 * @param {*} page the page to replace previous page
	 */
	setPage(PPN, page) {
		this.pages[PPN] = page;
	}

	/**
	 * naively finds first available, unused page.
	 * If all pages are taken, the PPN of the Least Recently used page is returned
	 * @returns PPN of the page to be replaced
	 */
	findPage() {
		for(let i = 0; i < this.light.length; i++) {
			if(this.light[i] === 0) {
				// update status to used page
				this.light[i] = 1;
				return i;
			}
		}

		// implement LRU
	}

	/**
	 * Displays the memory table
	 */
	display() {
		var x = this.x;
		var offset = 0;
		if (this.vbarMemEnable) {
			offset = -(this.Mheight - 200) * this.vbarMem.getPos();
		}

		for (var i = 0; i < this.PMSize / this.PgSize; i++) {
			var y = offset + this.Mtop + ((this.pages[0].height + 5) + scaleC) * i;
			if (bounded(y, this.Mtop, this.Mtop + PMDisplayHeight, this.pages[0].height + 5)) {

				// draw rectangle set around different entries
				this.p.stroke(colorC);  // orange set outline
				// this.p.strokeWeight(5);
				if(this.light[i]) {
					this.p.fill(PHYS_MEM_HIGHLIGHT);
				} else {
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
				this.p.text("0x" + toBase(8 * i, 16, this.p.ceil(this.PPNbits / 4)), x - 2, ytext);

				this.pages[i].display(x + 2, y + 2.5);
			}
		}
		this.p.noStroke();
		this.p.fill(bg);
		// added 5 for margin
		this.p.rect(x, 0, this.Mwidth + 5, this.Mtop);  // background for header
		this.p.rect(x, 0, -scaleM * 3, this.Mtop);  // cover row address

		// display title
		this.p.fill(colorB);
		this.p.stroke(colorB);
		this.p.textSize(scaleM);
		this.p.textAlign(this.p.CENTER);
		this.p.text("Physical Memory", x + this.Mwidth / 2, 0.85 * scaleM);  // mem label
	}
}