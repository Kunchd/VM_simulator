import { scaleC, MGNT_BIT_WIDTH, PTDisplayHeight, DISK_HIGHLIGHT, PHYS_MEM_HIGHLIGHT } from "./Constants.js";
import { xwidth, bounded, toBase, setScrollBarToDesiredPos } from "./HelperFunctions.js";
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

    /**
     * flush all recorded values within PT
     */
	flush() {
		for (var i = 0; i < this.S; i++)
			this.entries[i].flush();
	}

	/**
	 * clear emphasis highlight for all entries
	 */
	clearHighlight() { for (var i = 0; i < this.S; i++) this.entries[i].clearHighlight(); }

	/**
	 * get dirty bit of PTE at the given VPN
	 * @param {*} VPN number to check dirty bit for
	 * @returns dirty bit
	 */
	getDirty(VPN) {
		setScrollBarToDesiredPos((this.PTtop * 2 + PTDisplayHeight) / 2,
			this.PTtop + 1.5 * scaleC * VPN + 1.8 * scaleC,
			this.PTheight - (PTDisplayHeight - scaleC),
			this.vbarPT);
		
		return this.entries[VPN].getDirty();
	}

	/**
	 * get the management bits of the page assciated with this VPN
	 * @param {*} VPN VPN to get the management bits for
	 * @returns an object with V, D, R, W, E bits
	 */
	getPagePermissions(VPN) {
		setScrollBarToDesiredPos((this.PTtop * 2 + PTDisplayHeight) / 2,
			this.PTtop + 1.5 * scaleC * VPN + 1.8 * scaleC,
			this.PTheight - (PTDisplayHeight - scaleC),
			this.vbarPT);

		return this.entries[VPN].getPermissions();
	}

	/**
	 * Get PPN for the corresponding VPN
	 * @param {*} VPN VPN used to get the PPN
	 * @returns an array where the first value is the data and the second is the dirty bit. 
	 *          Return null if this page cannot be accessed.
	 */
	getPPN(VPN) {
		setScrollBarToDesiredPos((this.PTtop * 2 + PTDisplayHeight) / 2,
			this.PTtop + 1.5 * scaleC * VPN + 1.8 * scaleC,
			this.PTheight - (PTDisplayHeight - scaleC),
			this.vbarPT);

		// emphasize current entry
		this.clearHighlight();
		this.entries[VPN].highlightAll();

		return this.entries[VPN].getPPN();
	}

	/**
	 * Get SSN for the corresponding VPN
	 * @param {*} VPN VPN used to get the SSN
	 * @returns an array where the first value is the data and the second is the dirty bit. 
	 *          Return null if this page cannot be accessed.
	 */
	getSSN(VPN) {
		setScrollBarToDesiredPos((this.PTtop * 2 + PTDisplayHeight) / 2,
			this.PTtop + 1.5 * scaleC * VPN + 1.8 * scaleC,
			this.PTheight - (PTDisplayHeight - scaleC),
			this.vbarPT);
		
		// emphasize current entry
		this.clearHighlight();
		this.entries[VPN].highlightAll();

		return this.entries[VPN].getSSN();
	}

	/**
	 * Verify the flag instruction has correct permission to access the page at VPN
	 * @param {*} VPN Page location to verify access
	 * @param {*} flag a boolean flag indicating read/write status. 
	 * 				   true: write
	 * 				   false: read
	 * @returns empty string if the instruction has permission, 
     *          or message stating which permission were invalidated
	 */
	checkProtection(VPN, flag) {
		return this.entries[VPN].checkProtection(flag);
	}

	/**
	 * set the PT entry for the VPN to the given PPN/SSN with given permissions
	 * @param {*} VPN VPN to set the PPN for
	 * @param {*} data the PPN/SSN to write to the entry
	 * @param {*} isSSN determine whether the given PPN is a PPN or SSN
	 * @param {*} permissions permissions given this page
	 */
	setPTE(VPN, data, isSSN, permissions) {
		setScrollBarToDesiredPos((this.PTtop * 2 + PTDisplayHeight) / 2,
			this.PTtop + 1.5 * scaleC * VPN + 1.8 * scaleC,
			this.PTheight - (PTDisplayHeight - scaleC),
			this.vbarPT);

		// emphasize current entry
		this.clearHighlight();
		this.entries[VPN].highlightAll();

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
			offset = -(this.PTheight - (PTDisplayHeight - scaleC * 2)) * this.vbarPT.getPos();
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			let curY = this.PTtop + offset + 1.5 * scaleC * i + 1.8 * scaleC;
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
        this.p.text("VPN", x - scaleC * (xwidth(1) * 1.2), ytext);  // VPN

		// label PPN & SSN
		var xPPN = x + scaleC * (xwidth(1) * 4.2);
		this.p.textAlign(this.p.LEFT);
		this.p.text("PPN/SSN", xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * 0.5, ytext);

        // label bottom of PT with key
        let ykey = this.PTtop + PTDisplayHeight;
        // background
        this.p.noStroke();
		this.p.fill(bg);
        this.p.rect(x - 60, ykey - scaleC * 0.23, this.PTwidth + 60, scaleC * 2);

        // label key
        this.p.fill(colorB);
        this.p.stroke(colorB);
        this.p.text("KEY", x - 45, ykey + scaleC * 0.75);
        this.p.text("Disk:", x, ykey + scaleC * 0.75);
        this.p.text("Phys Mem:", x + 70, ykey + scaleC * 0.75);

        this.p.stroke(colorB);
        this.p.fill(DISK_HIGHLIGHT);
        this.p.rect(x + 40, ykey + 2.5, scaleC * 0.75, scaleC * 0.75);
        this.p.fill(PHYS_MEM_HIGHLIGHT);
        this.p.rect(x + 155, ykey + 2.5, scaleC * 0.75, scaleC * 0.75);
	}
}