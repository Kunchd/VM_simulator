import { scaleC, PT_PPN_WIDTH } from "./Constants.js";
import { colorC, colorH } from "./App.js";
import { xwidth, toBase } from "./HelperFunctions.js";

// Management bit width
import { MGNT_BIT_WIDTH } from "./Constants.js";
import { EMPHASIS_HIGHLIGHT } from "./Constants.js";

// Note: WH and WM policies settings are removed 

/* Class to represent a TLB entry (tag + PPN + management bits) */
export class PTEntry {
    // undefined for PPN means no value
    constructor(p, PPNWidth) {
        this.p = p;       // p5 object of the current canvas

        this.PPNWidth = PPNWidth;   // PPN width
        this.pageNumber = -1;     // PPN/SSN value

        this.V = 0;       // valid bit value
        this.D = 0;       // Dirty bit value
        this.R = 0;       // read bit value
        this.W = 0;       // write bit value
        this.E = 0;       // execute bit value
        this.addr = -1;   // address of beginning of block (-1 is dummy addr)
        this.isSSN = false;     // check if this entry contain

        // lighting values
        this.lightPPN = 0;  // indicate highlighting for moved/changed data
        this.lightV = 0;
        this.lightD = 0;
        this.lightR = 0;
        this.lightW = 0;
        this.lightE = 0;

        this.width = scaleC * (xwidth(1) * (MGNT_BIT_WIDTH)) + scaleC * xwidth(PT_PPN_WIDTH);
    }

    // highlights the currently focused lines
    highlightData() { this.lightPPN = 1; }

    /**
     * highlight this entry
     */
    highlightAll() {
        this.lightV = 1;
        this.lightD = 1;
        this.lightR = 1;
        this.lightW = 1;
        this.lightE = 1;
        this.highlightData();
    }

    // clears the currently highlighted data
    clearHighlight() {
        this.lightPPN = 0;
        this.lightV = 0;
        this.lightD = 0;
        this.lightR = 0;
        this.lightW = 0;
        this.lightE = 0;
    }

    /**
     * @returns dirty bit of this PTE
     */
    getDirty() {
        return this.D;
    }

    /**
     * get the management bits for this Physical page entry
     * @returns the V, D, R, W, E management bits
     */
    getPermissions() {
        return {
            V: this.V,
            D: this.D,
            R: this.R,
            W: this.W,
            E: this.E
        }
    }

    /**
     * set the current PPN/SSN to the given data
     * @param {*} data the value to set as PPN/SSN
     * @param {*} inIsSSN boolean determining whether this is SSN
     * @param {*} permissions an object with V, D, R, W, E attributes
     */
    setData(data, inIsSSN, permissions) {
        this.pageNumber = data;
        this.isSSN = inIsSSN;
        this.V = permissions.V;
        this.D = permissions.D;
        this.R = permissions.R;
        this.W = permissions.W;
        this.E = permissions.E;
    }

    /**
     * check if this entry is valid and can be written and get the PPN of this entry
     * @returns an array where the first value is the PPN and the second is the dirty bit. 
     *          Return null if this page cannot be accessed.
     */
    getPPN() {
        if(this.V) return [this.pageNumber, this.D];
        return null;
    }

    /**
     * check if this entry contains SSN and can be accessed based on permission and get
     * the SSN of this entry
     * @returns an array where the first value is the SSN and the second is the dirty bit.
     *          Return null if this page cannot be accessed.
     */
    getSSN() {
        if(this.isSSN && !this.V) return [this.pageNumber, this.D];
        return null;
    }

    /**
     * Verify flag instruction has correct permission to access this page
	 * @param {*} flag a boolean flag indicating read/write status. 
	 * 				   true: write
	 * 				   false: read
     * @returns true if the instruction has permission, false otherwise
     */
    checkProtection(flag) {
        return this.V && ((flag && this.W) || (!flag && this.R));
    }

    /**
     * display the PTEntry
     * @param {*} x 
     * @param {*} y 
     */
    display(x, y) {
        this.p.textSize(scaleC);
        // Where the PPN start
        var xPPN = x + scaleC * (xwidth(1) * (MGNT_BIT_WIDTH));
        this.p.stroke(0);

        // render valid bit
        (this.lightV ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(x, y, scaleC * xwidth(1), scaleC);  // valid

        // render dirty bit
        (this.lightD ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1), y, scaleC * xwidth(1), scaleC);  // dirty

        // render read bit
        (this.lightR ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 2, y, scaleC * xwidth(1), scaleC);     // read

        // render write bit
        (this.lightW ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 3, y, scaleC * xwidth(1), scaleC);     // write

        // render exec bit
        (this.lightE ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 4, y, scaleC * xwidth(1), scaleC);     // write

        // for PPN
        (this.lightPPN > 0 ? this.p.fill(EMPHASIS_HIGHLIGHT) : this.p.noFill());
        this.p.rect(xPPN, y, scaleC * xwidth(PT_PPN_WIDTH), scaleC);  // data

        // cache block text
        var ytext = y + 0.85 * scaleC;
        this.p.textAlign(this.p.CENTER);

        // render valid bit text
        this.p.fill(0);
        this.p.text(this.V, x + scaleC * xwidth(1) * 0.5, ytext);  // valid

        // render dirty bits
        this.p.text(this.D, x + scaleC * xwidth(1) * 1.5, ytext);  // dirty

        // render read bits
        this.p.text(this.R, x + scaleC * xwidth(1) * 2.5, ytext);   // read

        // render write bits
        this.p.text(this.W, x + scaleC * xwidth(1) * 3.5, ytext);   // write

        // render exec bits
        this.p.text(this.E, x + scaleC * xwidth(1) * 4.5, ytext);   // exec

        // render PPN bits
        this.p.text(this.V ? toBase(this.pageNumber, 16, this.p.ceil(this.PPNWidth / 4)) : "--"
            , xPPN + scaleC * xwidth(PT_PPN_WIDTH) * (0.5), ytext);  // data

        // // hover text
        // if (this.V && this.p.mouseY > y && this.p.mouseY < y + scaleC && this.p.mouseX > xPPN && this.p.mouseX < xPPN + scaleC * xwidth(2) * K) {
        //     var idx = int((mouseX - xPPN) / xwidth(2) / scaleC);
        //     this.p.textSize(hoverSize);
        //     this.p.fill(colorH);
        //     this.p.noStroke();
        //     this.p.text("0x" + (this.addr + idx).toString(16), mouseX, mouseY);
        // }
    }
}