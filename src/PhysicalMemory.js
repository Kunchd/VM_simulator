import { scrollSize, hoverSize, scaleM, PMDisplayHeight } from "./Constants.js";
import { bg, colorC, colorH, colorM } from "./App.js";
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
		this.Mtop = scaleM;  // initial y of top of memory
		this.Mheight = 1.5 * (PMSize / PgSize) * scaleM;  // height of memory when drawn out
		this.Mwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
		this.x = p.width - this.Mwidth - scrollSize - 10; // x coordinate of this table
		this.pages = [];	// contained pages
		this.light = [];  // indicate highlighting for moved/changed data
		this.vbarMem = scrollBar;   // the scroll bar created for the memory
		this.p = p;
		this.PMSize = PMSize;
		this.PgSize = PgSize;
		this.PPNbits = this.p.log(this.PMSize / this.PgSize) / this.p.log(2);


		this.vbarMemEnable = (this.Mtop + this.Mheight > this.p.height);

		for (var i = 0; i < PMSize / PgSize; i++) {
			this.light[i] = 0;                 // nothing starts highlighted
			this.pages[i] = new Page(this.p, this.PgSize);
		}
	}

	// helper methods for hightlighting
	// highlighting:  0 - no highlight, 1 - background, 2 - background + text
	highlight(addr, light) { this.light[addr] = light; }
	clearHighlight() { for (var i = 0; i < this.light.length; i++) this.light[i] = 0; }

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
			var y = offset + this.Mtop + ((this.pages[0].height + 2)) * (i + 0.5);
			if (bounded(y, this.Mtop, this.Mtop + PMDisplayHeight, 20)) {

				// draw rectangle set around different entries
				this.p.stroke(colorC);  // orange set outline
				// this.p.strokeWeight(5);
				this.p.noFill();
				this.p.rect(x, y - 1, this.pages[0].width + 5, this.pages[0].height - 5);


				var ytext = y + (this.pages[0].height + 2) / 2;
				// label word/row
				this.p.textSize(scaleM * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorC);
				this.p.text("0x" + toBase(8 * i, 16, this.p.ceil(this.PPNbits / 4)), x - 2, ytext);

				this.pages[i].display(x + 2, y);
			}
		}
		this.p.noStroke();
		this.p.fill(bg);
		this.p.rect(x, 0, this.Mwidth, this.Mtop);  // background for header
		this.p.rect(x, 0, -scaleM * 2.6, this.Mtop);  // cover row address

		// display title
		this.p.fill(colorM);
		this.p.stroke(colorM);
		this.p.textSize(scaleM);
		this.p.textAlign(this.p.CENTER);
		this.p.text("Physical Memory", x + this.Mwidth / 2, 0.85 * scaleM);  // mem label
	}
}