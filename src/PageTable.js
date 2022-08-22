import { scaleC, MGNT_BIT_WIDTH, PTDisplayHeight } from "./Constants.js";
import { xwidth, bounded } from "./HelperFunctions.js";
import { bg, colorC } from "./App.js";
import { PTEntry } from "./PTEntry.js";

/* Class to represent a PT. */
export class PT {
	/**
	 * Construct a new isntance of PT
	 * @param {*} p the p5 object assigned to current canvas
	 * @param {*} scrollBar the scroll bar to attatch the PT to
	 * @param {*} addrWidth the bit width of the virtual address
	 * @param {*} PPNWidth the bit width of the PPN
	 */
	constructor(p, scrollBar, addrWidth, PPNWidth) {
		this.p = p;     // p5 object of current canvas
		this.S = p.pow(2, addrWidth);

		this.addrWidth = addrWidth;     // address width
		this.PPNWidth = PPNWidth;       // PPN width

		this.PTtop = scrollBar.ypos;  // initial y of top of TLB
		this.PTheight = this.S * 1.5 * scaleC;  // full height of TLB
		this.entry = [];  // sets in the TLB
		for (var i = 0; i < this.S; i++)
			this.entry[i] = new PTEntry(p, PPNWidth);
		this.PTwidth = this.entry[0].width + 2;  // width of TLB when drawn out

		// initialize TLB with scrollBar
		this.vbarPTEnable = (this.PTtop + this.PTheight > (this.p.height / 2));
		this.vbarPT = scrollBar;
		this.x = scrollBar.xpos - 10 - this.PTwidth;
	}

	flush() {
		for (var i = 0; i < this.S; i++)
			this.entry[i].flush();
	}

	clearHighlight() { for (var i = 0; i < this.S; i++) this.entry[i].clearHighlight(); }

	display() {
		// the x value where the table will be displayed, 
		// 10 is subtracted for distancing from scroll bar
		var x = this.x - 10;
		var offset = 0;

		// enable scroll bar to change the TLB position
		if (this.vbarPTEnable) {
			offset = -(this.PTheight) * this.vbarPT.getPos();
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			let curY = this.PTtop + offset + 1.5 * scaleC * i + 20;
			if (bounded(curY, this.PTtop, this.PTtop + PTDisplayHeight, 10)) {
				this.p.textSize(scaleC * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorC);
				// 0.75 is hard coded so that the value is next to the box
				this.p.text("0x" + i, x - 2, curY + scaleC * (0.75));
				this.entry[i].display(x, curY);
			}
		}

		this.p.noStroke();
		this.p.fill(bg);
		// box shifted to the left by 60 to cover VPN
		this.p.rect(x - 60, this.PTtop - 20, this.PTwidth + 60, 40);  // background for header
		this.p.fill(colorC);
		this.p.stroke(colorC);
		this.p.textSize(scaleC);
		this.p.textAlign(this.p.CENTER);

		// label the management bits within each entry
		var ytext = this.PTtop + 0.85 * scaleC;
		this.p.text("V", x + scaleC * (xwidth(1) * 0.5), ytext);  // valid
		this.p.text("D", x + scaleC * (xwidth(1) * 1.5), ytext);  // dirty
		this.p.text("R", x + scaleC * (xwidth(1) * 2.5), ytext);  // read
		this.p.text("W", x + scaleC * (xwidth(1) * 3.5), ytext);  // write
		this.p.text("E", x + scaleC * (xwidth(1) * 4.5), ytext);  // exec

		// label PPN
		var xPPN = x + scaleC * (xwidth(1) * 4.2);
		this.p.textAlign(this.p.LEFT);
		this.p.text("PPN", xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * 0.5, ytext);  // data
	}
}