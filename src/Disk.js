import { scrollSize, hoverSize, scaleM, DiskDisplayHeight } from "./Constants.js";
import { DISK_HIGHLIGHT } from "./Constants.js";
import { bg, colorC, colorH, colorM } from "./App.js";
import { xwidth, toBase, bounded, setScrollBarToDesiredPos } from "./HelperFunctions.js";
import { Page } from "./Page.js";

/**
 * class to represent physical memory
 */
// TODO: math probably needs modifcation to fit our needs
export class Disk {

	/**
	 * constructs a new instance of memory
	 * @param {*} p p5 object associated with the canvas which this memory
	 *              representation will be placed in
	 * @param {*} m address width
	 * @param {*} pgSize page offset bits
	 * @param {*} scrollBar scroll bar associated with this table
	 */
	constructor(p, m, pgSize, scrollBar) {
		this.p = p;
		this.pgSize = pgSize;
		this.PO = this.p.ceil(this.p.log(pgSize) / this.p.log(2));
		this.m = m;
		this.Dtop = scaleM;  // initial y of top of memory
		this.Dheight = 1.5 * p.pow(2, m - this.PO) * scaleM;  // height of memory when drawn out
		this.Dwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
		this.x = scrollBar.xpos - this.Dwidth - 10; // x coordinate of this table
		this.data = [];  // array of pages representing data in disk
		this.vbarDisk = scrollBar;   // the scroll bar created for the memory

		this.vbarDiskEnable = (this.Dtop + this.Dheight > this.p.height);

		for (var i = 0; i < p.pow(2, this.m - this.PO); i++) {
			this.data[i] = null;	// initialize memory to empty for now
		}
	}

	/**
	 * allocate an unallocated page within disk to contain data for current process
	 * @returns the SSN associated with the newly allocated page
	 */
	allocatePage() {
		/**
		 * @todo this random allocation might step on something allocated
		 */
		let SSN = this.p.floor(Math.random() * this.p.pow(2, this.m - this.PO));
		this.data[SSN] = new Page(this.p, this.pgSize);

		setScrollBarToDesiredPos((2 * this.Dtop + DiskDisplayHeight) / 2,
			scaleM * (1 + 6 * SSN) / 4 + this.Dtop,
			this.Dheight - (DiskDisplayHeight - scaleM),
			this.vbarDisk);

		return SSN;
	}

	/**
	 * return the page at the given SSN
	 * @param {*} SSN swap space number to retrieve the page
	 * @returns the desired page at the swap space, or null if no valid page is there
	 */
	getPage(SSN) {

		setScrollBarToDesiredPos((2 * this.Dtop + DiskDisplayHeight) / 2,
			scaleM * (1 + 6 * SSN) / 4 + this.Dtop,
			this.Dheight - (DiskDisplayHeight - scaleM),
			this.vbarDisk);

		return this.data[SSN];
	}

	/**
	 * set the page at given SSN to given page
	 * @param {*} SSN swap space number to set the new page
	 * @param {*} page the new page to set
	 */
	setPage(SSN, page) {
		setScrollBarToDesiredPos((2 * this.Dtop + DiskDisplayHeight) / 2,
			scaleM * (1 + 6 * SSN) / 4 + this.Dtop,
			this.Dheight - (DiskDisplayHeight - scaleM),
			this.vbarDisk);
			
		this.data[SSN] = page;
	}

	/**
	 * Displays the memory table
	 */
	display() {
		var x = this.x;
		var offset = 0;
		if (this.vbarDiskEnable) {
			offset = -(this.Dheight - (DiskDisplayHeight - scaleM)) * this.vbarDisk.getPos();
		}

		for (var i = 0; i < this.p.pow(2, this.m - this.PO); i++) {
			var y = offset + scaleM * (1 + 6 * i) / 4 + this.Dtop;
			// only render the portion visible on screen
			if (bounded(y, this.Dtop, this.Dtop + DiskDisplayHeight, 20)) {
				var ytext = y + 0.85 * scaleM;
				// label word/row
				this.p.textSize(scaleM * 0.8);
				this.p.textAlign(this.p.RIGHT);
				this.p.noStroke();
				this.p.fill(colorM);
				this.p.text("0x" + toBase(i, 16, this.p.ceil((this.m - this.PO) / 4)), x - 2, ytext);

				this.p.textSize(scaleM);
				// memory boxes
				this.p.stroke(0);
				if (this.data[i]) {
					this.p.fill(DISK_HIGHLIGHT);
				} else {
					this.p.noFill();
				}
				this.p.rect(x, y, this.Dwidth, scaleM);

				// memory text
				this.p.fill(0);
				this.p.textAlign(this.p.CENTER);
				this.p.text(this.data[i] ? "Allocated" : "Unallocated", x + this.Dwidth / 2, ytext);

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