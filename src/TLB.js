import { scaleC, MGNT_BIT_WIDTH, TLBDisplayHeight } from "./Constants.js";
import { xwidth, bounded } from "./HelperFunctions.js";
import { bg, colorC } from "./App.js";
import { TLBSet } from "./TLBSet.js";

/* Class to represent a TLB. */
export class TLB {
	/**
	 * Construct a new isntance of TLB
	 * @param {*} p the p5 object assigned to current canvas
	 * @param {*} scrollBar the scroll bar to attatch the TLB to
	 * @param {*} TLBSize the size in bytes of the TLB
	 * @param {*} E the assciativity of the TLB
	 * @param {*} addrWidth the bit width of the virtual address
	 * @param {*} PPNWidth the bit width of the PPN
	 */
	constructor(p, scrollBar, TLBSize, E, addrWidth, PPNWidth) {
		this.p = p;     // p5 object of current canvas

		this.S = TLBSize / E;     // number of TLB sets
		this.E = E;     // TLB associatibity
		this.addrWidth = addrWidth;     // address width
		this.PPNWidth = PPNWidth;       // PPN width
		this.t = addrWidth - PPNWidth - (this.p.log(this.S / E) / this.p.log(2));    // tag width

		this.TLBtop = scaleC;  // initial y of top of TLB
		this.TLBheight = this.S * 1.5 * this.E * scaleC;  // full height of TLB
		this.sets = [];  // sets in the TLB
		for (var i = 0; i < this.S; i++)
			this.sets[i] = new TLBSet(this.p, this.E, this.t, this.PPNWidth);
		this.Cwidth = this.sets[0].width + 2;  // width of TLB when drawn out

		// initialize TLB with scrollBar
		this.vbarTLBEnable = (this.TLBtop + this.TLBheight > TLBDisplayHeight);
		this.vbarTLB = scrollBar;
		this.x = scrollBar.xpos - 10 - this.Cwidth;
	}

	flush() {
		for (var i = 0; i < this.S; i++)
			this.sets[i].flush();
	}

	clearHighlight() { for (var i = 0; i < this.S; i++) this.sets[i].clearHighlight(); }

	display() {
		var x = this.x;
		var offset = 0;

		// enable scroll bar to change the TLB position
		if (this.vbarTLBEnable) {
			offset = -(this.TLBheight - (TLBDisplayHeight - 40)) * this.vbarTLB.getPos();
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			let curY = this.TLBtop + offset + 1.5 * this.E * scaleC * i;
			if(bounded(curY, this.TLBtop, this.TLBtop + TLBDisplayHeight - this.sets[0].height - 20, this.sets[0].height)) {
				this.p.textSize(scaleC * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorC);
				this.p.text("Set " + i, x - 2, curY + scaleC * (0.75 * this.E + 0.35));
				this.sets[i].display(x, curY);
			}
		}

		this.p.noStroke();
		this.p.fill(bg);
		this.p.rect(x, 0, this.Cwidth, this.TLBtop);  // background for header
		this.p.rect(x, 0, -scaleC * 3.0, this.TLBtop);  // cover set numbers
		this.p.fill(colorC);
		this.p.stroke(colorC);
		this.p.textSize(scaleC);
		this.p.textAlign(this.p.CENTER);

		// label the management bits within each entry
		var ytext = 0.85 * scaleC;
		this.p.text("V", x + scaleC * (0.5 + xwidth(1) * 0.5), ytext);  // valid
		this.p.text("D", x + scaleC * (0.5 + xwidth(1) * 1.5), ytext);  // dirty
		this.p.text("R", x + scaleC * (0.5 + xwidth(1) * 2.5), ytext);  // read
		this.p.text("W", x + scaleC * (0.5 + xwidth(1) * 3.5), ytext);  // write
		this.p.text("E", x + scaleC * (0.5 + xwidth(1) * 4.5), ytext);  // exec

		// label the tag
		var xt = x + scaleC * (0.5 + xwidth(1) * MGNT_BIT_WIDTH);
		this.p.text("T", xt + scaleC * xwidth(this.p.ceil(this.t / 4)) * 0.5, ytext);  // tag

		// label PPN
		var xPPN = x + scaleC * (xwidth(1) * MGNT_BIT_WIDTH + xwidth(this.p.ceil(this.t / 4)));
		this.p.textAlign(this.p.LEFT);
		this.p.text("PPN", xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * 0.5, ytext);  // data

		// block off bottom of TLB with background rect for better scrolling
		this.p.noStroke();
		this.p.fill(bg);
		var yCutOff = this.TLBtop + TLBDisplayHeight;
		this.p.rect(x - 50, yCutOff, this.Cwidth + 50, 300);
	}
}