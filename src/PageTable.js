import { scaleC, MGNT_BIT_WIDTH, PTDisplayHeight } from "./Constants.js";
import { xwidth, bounded, toBase } from "./HelperFunctions.js";
import { bg, colorC, colorB } from "./App.js";
import { PTEntry } from "./PTEntry.js";

/* Class to represent a PT. */
export class PT {
	/**
	 * Construct a new isntance of PT
	 * @param {*} p p5 object assigned to current canvas
	 * @param {*} scrollBar scroll bar to attatch the PT to
	 * @param {*} addrWidth bit width of the virtual address
	 * @param {*} PPNWidth bit width of the PPN
	 * @param {*} POWidth bit width of PO
	 */
	constructor(p, scrollBar, addrWidth, PPNWidth, POWidth) {
		this.p = p;     // p5 object of current canvas
		this.S = p.pow(2, addrWidth - POWidth);

		this.addrWidth = addrWidth;     // address width
		this.PPNWidth = PPNWidth;       // PPN width
		this.POWidth = POWidth;

		this.PTtop = scrollBar.ypos;  // initial y of top of PT
		this.PTheight = this.S * 1.5 * scaleC;  // full height of PT
		this.entries = [];  // collection of entries representing the PT
		for (var i = 0; i < this.S; i++)
			this.entries[i] = new PTEntry(p, PPNWidth);
		this.PTwidth = this.entries[0].width + 2;  // width of PT when drawn out

		// initialize PT with scrollBar
		this.vbarPTEnable = (this.PTtop + this.PTheight > (this.p.height / 2));
		this.vbarPT = scrollBar;
		this.x = scrollBar.xpos - 10 - this.PTwidth;
	}

	flush() {
		for (var i = 0; i < this.S; i++)
			this.entries[i].flush();
	}

	clearHighlight() { for (var i = 0; i < this.S; i++) this.entries[i].clearHighlight(); }

	/**
	 * Get PPN for the corresponding VPN
	 * @param {*} VPN VPN used to get the PPN
     * @returns an array where the first value is the data and the second is a conditional
     *          determining whether the data is SSN or PPN. Return null if this page cannot
     *          be accessed.
	 */
	getPPNWrite(VPN) {
		let res = this.entries[VPN].getPPNW();

		if(res == null) {
			alert("page fault");
		}

		return res;
		
	}

	/**
	 * set the PT entry for the VPN to the given PPN with given permissions
	 * @param {*} VPN VPN to set the PPN for
	 * @param {*} data the PPN/SSN to write to the entry
	 * @param {*} isSSN determine whether the given PPN is a PPN or SSN
	 * @param {*} permissions permissions given this page
	 */
	setPPN(VPN, data, isSSN, permissions) {
		this.entries[VPN].setData(data, isSSN, permissions);
	}

	display() {
		// the x value where the table will be displayed, 
		// 10 is subtracted for distancing from scroll bar
		var x = this.x - 10;
		var offset = 0;

		// enable scroll bar to change the TLB position
		if (this.vbarPTEnable) {
			// subtract 100 to decrease how far we scroll down
			offset = -(this.PTheight - 100) * this.vbarPT.getPos();
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			let curY = this.PTtop + offset + 1.5 * scaleC * i + 1.8 *scaleC;
			if (bounded(curY, this.PTtop, this.PTtop + PTDisplayHeight, 10)) {
				this.p.textSize(scaleC * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorC);
				// 0.75 is hard coded so that the value is next to the box
				this.p.text("0x" + toBase(i, 16, this.p.ceil((this.addrWidth - this.POWidth) / 4)), x - 2, curY + scaleC * (0.75));
				this.entries[i].display(x, curY);
			}
		}

		this.p.noStroke();
		this.p.fill(bg);
		// box shifted to the left by 60 to cover VPN
		this.p.rect(x - 60, this.PTtop - 20, this.PTwidth + 60, 45);  // background for header

		// label title
		let ytitle = this.PTtop;
		this.p.fill(colorB);
		this.p.stroke(colorB);
		this.p.textSize(scaleC);
		this.p.textAlign(this.p.CENTER);

		this.p.text("Page Table", x + this.PTwidth / 2, ytitle);

		this.p.fill(colorC);
		this.p.stroke(colorC);
		this.p.textSize(scaleC * 0.8);

		// label the management bits within each entry
		var ytext = this.PTtop + scaleC;
		this.p.text("V", x + scaleC * (xwidth(1) * 0.5), ytext);  // valid
		this.p.text("D", x + scaleC * (xwidth(1) * 1.5), ytext);  // dirty
		this.p.text("R", x + scaleC * (xwidth(1) * 2.5), ytext);  // read
		this.p.text("W", x + scaleC * (xwidth(1) * 3.5), ytext);  // write
		this.p.text("E", x + scaleC * (xwidth(1) * 4.5), ytext);  // exec

		// label PPN & SSN
		var xPPN = x + scaleC * (xwidth(1) * 4.2);
		this.p.textAlign(this.p.LEFT);
		this.p.text("PPN/SSN", xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * 0.5, ytext);
	}
}