import { scrollSize, hoverSize, scaleM, VMDisplayHeight } from "./Constants.js";
import { VIR_MEM_HIGHLIGHT, EMPHASIS_HIGHLIGHT } from "./Constants.js";
import { bg, colorC, colorH, colorM } from "./App.js";
import { getControlAccess, releaseControlAccess } from "./App.js";
import { xwidth, toBase, bounded, setScrollBarToDesiredPos } from "./HelperFunctions.js";

/**
 * class to represent physical memory
 */
// TODO: math probably needs modifcation to fit our needs
export class VirtualMemory {

	/**
	 * constructs a new instance of memory
	 * @param {*} p the p5 object associated with the canvas which this memory
	 *              representation will be placed in
	 * @param {*} m the address width
	 * @param {*} PO page offset width
	 * @param {*} scrollBar the scroll bar associated with this table
	 */
	constructor(p, m, PO, scrollBar) {
		this.vbarMem = scrollBar;   // the scroll bar created for the memory
		this.p = p;
		this.m = m;
		this.PO = PO;

		this.Mtop = scaleM;  // initial y of top of memory
		this.Mheight = 1.5 * p.pow(2, this.m - this.PO) * scaleM;  // height of memory when drawn out
		this.Mwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
		this.x = scrollBar.xpos - this.Mwidth - 10; // x coordinate of this table
		this.data = [];  // data stored in memory

		// component id for accessing user input
		this.componentId = "VM";
		// controlAccess of current component
		// number indicate which page has control
		this.controlAccess = -1;

		/*
		 * 0 stands for unused
		 * 1 stands for emphasis highlight
		 * 2 stands for identification highlight
		 */
		this.light = [];  // indicate highlighting for moved/changed data

		this.vbarMemEnable = (this.Mtop + this.Mheight > this.p.height);

		for (var i = 0; i < p.pow(2, this.m - this.PO); i++) {
			this.data[i] = 0;	// initialize memory to empty for now
			this.light[i] = 0;
		}
	}

	/**
	 * clear emphsis highlight
	 */
	clearHighlight() {
		for (let i = 0; i < this.light.length; i++) {
			if (this.light[i] === 1) this.light[i] = 2;
		}
	}

	/**
	 * allocate page for the given VPN
	 * @param {*} VPN the page number to allocate
	 */
	allocatePage(VPN) {
		this.data[VPN] = 1;

		// emphasize change
		this.clearHighlight();
		this.light[VPN] = 1;
	}

	/**
	 * Checks for user input and Displays the memory table
	 * @param {*} handleAllocate callback function to handle case when user allocate 
	 * 							 a new virtual page. The given function should take the 
	 * 							 VPN as an input
	 */
	updateAndDisplay(handleVPAllocation) {
		var x = this.x;
		var offset = 0;
		if (this.vbarMemEnable) {
			offset = -(this.Mheight - (VMDisplayHeight - scaleM)) * this.vbarMem.getPos();
		}

		for (var i = 0; i < this.p.pow(2, this.m - this.PO); i++) {
			var y = offset + scaleM * (1 + 6 * i) / 4 + this.Mtop;
			// only render the portion visible on screen
			if (bounded(y, this.Mtop, this.Mtop + VMDisplayHeight, 20)) {
				var ytext = y + 0.85 * scaleM;
				// label word/row
				this.p.textSize(scaleM * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorM);
				this.p.text("0x" + toBase(i, 16, this.p.ceil((this.m - this.PO) / 4)), x - 2, ytext);

				// check on hover for current page
				if (bounded(this.p.mouseX, x, x + this.Mwidth)
					&& bounded(this.p.mouseY, y, y + scaleM)) {
					if (this.p.mouseIsPressed
						&& this.controlAccess === -1
						&& getControlAccess(this.componentId)) {
						this.controlAccess = i;
					}

					// if has control and is pressed, allocate page
					if (this.p.mouseIsPressed && this.controlAccess === i) {
						this.data[i] = 1;
						handleVPAllocation(i);
					}
				}

				// release control access when isn't used
				if (!this.p.mouseIsPressed) {
					releaseControlAccess(this.componentId);
					this.controlAccess = -1;
				}

				this.p.textSize(scaleM);
				// memory boxes
				this.p.stroke(0);
				if (this.light[i] === 2) {
					this.p.fill(VIR_MEM_HIGHLIGHT);
				}
				else if (this.light[i] === 1) {
					this.p.fill(EMPHASIS_HIGHLIGHT);
				} else {
					this.p.noFill();
				}
				this.p.rect(x, y, this.Mwidth, scaleM);

				// memory text
				this.p.fill(0);
				this.p.textAlign(this.p.CENTER);
				this.p.text(this.data[i] ? "Allocated" : "Unallocated", x + this.Mwidth / 2, ytext);

				// // hover text
				// if (this.p.mouseY > y && this.p.mouseY < y + scaleM && this.p.mouseX > x && this.p.mouseX < x + scaleM * xwidth(2) * 8) {
				// 	var idx = this.p.int((this.p.mouseX - x) / xwidth(2) / scaleM);
				// 	this.p.textSize(hoverSize);
				// 	this.p.fill(colorH);
				// 	this.p.noStroke();
				// 	this.p.text("0x" + (8 * i + idx).toString(16), this.p.mouseX, this.p.mouseY);
				// }
			}
		}
	}
}