import { scaleC, MGNT_BIT_WIDTH, TLBDisplayHeight } from "./Constants.js";
import { xwidth, bounded, setScrollBarToDesiredPos } from "./HelperFunctions.js";
import { bg, colorC, colorB } from "./App.js";
import { TLBSet } from "./TLBSet.js";

/* Class to represent a TLB. */
export class TLB {
	/**
	 * Construct a new isntance of TLB
	 * @param {*} p the p5 object assigned to current canvas
	 * @param {*} scrollBar the scroll bar to attatch the TLB to
	 * @param {*} TLBSize the size in entries of the TLB
	 * @param {*} E the assciativity of the TLB
	 * @param {*} addrWidth the bit width of the virtual address
	 * @param {*} PPNWidth the bit width of the PPN
	 */
	constructor(p, scrollBar, TLBSize, E, addrWidth, PPNWidth) {
		this.p = p;     // p5 object of current canvas

		this.S = TLBSize / E;     // number of TLB sets, aka index
		this.E = E;     // TLB associatibity
		this.addrWidth = addrWidth;     // address width
		this.PPNWidth = PPNWidth;       // PPN width
		this.t = addrWidth - PPNWidth - (this.p.log(this.S / E) / this.p.log(2));    // tag width

		this.TLBtop = scaleC * 2;  // initial y of top of TLB
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

	/**
	 * checks and gets the PPN from the TLB given the VPN
	 * @param {*} VPN VPN
	 * @return -1 if TLB miss, and the PPN if TLB hit
	 */
	getPPN(VPN) {
		let Sbit = this.p.ceil(this.p.log(this.S) / this.p.log(2));	// bits to represent number of set
		let index = VPN % this.S;	// index of given VPN
		let tag = VPN >> Sbit;		// tag of give VPN

		setScrollBarToDesiredPos((this.TLBtop * 2 + TLBDisplayHeight - this.sets[0].height - 20) / 2,
			this.TLBtop + 1.5 * this.E * scaleC * index,
			this.TLBheight - (TLBDisplayHeight - this.sets[0].height),
			this.vbarTLB);

		// cleaer highlight so the emphasis is prominent
		this.clearHighlight();

		// asks TLB set to check if tag exists
		return this.sets[index].checkTag(tag);
	}

	/**
	 * set a new entry with given PPN at the given VPN within tlb
	 * @param {*} VPN VPN indicating the location of the new entry within the tlb
	 * @param {*} permissions an object containing permission to V, D, R, W, E bits
	 * @param {*} PPN physical page number to be stored within the tlb
	 */
	setEntry(VPN, permissions, PPN) {
		let Sbit = this.p.ceil(this.p.log(this.S) / this.p.log(2));	// bits to represent number of set
		let index = VPN % this.S;
		let tag = VPN >> Sbit;

		setScrollBarToDesiredPos((this.TLBtop * 2 + TLBDisplayHeight - this.sets[0].height - 20) / 2,
			this.TLBtop + 1.5 * this.E * scaleC * index,
			this.TLBheight - (TLBDisplayHeight - this.sets[0].height),
			this.vbarTLB);

		// cleaer highlight so the emphasis is prominent
		this.clearHighlight();

		this.sets[index].setEntry(permissions, tag, PPN);
	} 

	display() {
		var x = this.x;
		var offset = 0;

		// enable scroll bar to change the TLB position
		if (this.vbarTLBEnable) {
			offset = -(this.TLBheight - (TLBDisplayHeight - this.sets[0].height)) * this.vbarTLB.getPos();
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			let curY = this.TLBtop + offset + 1.5 * this.E * scaleC * i;
			if (bounded(curY, this.TLBtop, this.TLBtop + TLBDisplayHeight - this.sets[0].height - 20, this.sets[0].height)) {
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

		this.p.textAlign(this.p.CENTER);
		this.p.fill(colorB);
		this.p.stroke(colorB);
		this.p.textSize(scaleC);

		// label title
		let ytitle = 0.85 * scaleC;
		this.p.text("TLB", x + this.Cwidth / 2, ytitle);

		this.p.fill(colorC);
		this.p.stroke(colorC);
		this.p.textSize(scaleC * 0.8);

		// label the management bits within each entry
		var ytext = 1.85 * scaleC;
		this.p.text("V", x + scaleC * (0.5 + xwidth(1) * 0.5), ytext);  // valid
		this.p.text("D", x + scaleC * (0.5 + xwidth(1) * 1.5), ytext);  // dirty
		this.p.text("R", x + scaleC * (0.5 + xwidth(1) * 2.5), ytext);  // read
		this.p.text("W", x + scaleC * (0.5 + xwidth(1) * 3.5), ytext);  // write
		this.p.text("E", x + scaleC * (0.5 + xwidth(1) * 4.5), ytext);  // exec

		// label the tag
		var xt = x + scaleC * (0.5 + xwidth(1) * MGNT_BIT_WIDTH);
		this.p.text("T", xt + scaleC * xwidth(this.p.ceil(this.t / 4)) * 0.5, ytext);  // tag

		// label PPN
		var xPPN = x + scaleC * (xwidth(1) * MGNT_BIT_WIDTH + xwidth(this.p.ceil(this.t / 4))) - 5;
		this.p.textAlign(this.p.LEFT);
		this.p.text("PPN", xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * 0.5, ytext);  // data

		// block off bottom of TLB with background rect for better scrolling
		this.p.noStroke();
		this.p.fill(bg);
		var yCutOff = this.TLBtop + TLBDisplayHeight - scaleC;
		this.p.rect(x - 50, yCutOff, this.Cwidth + 60, 300);
	}
}