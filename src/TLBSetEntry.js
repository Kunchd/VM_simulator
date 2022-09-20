import { scaleC } from "./Constants.js";
import { colorC, colorH } from "./App.js";
import { xwidth, toBase } from "./HelperFunctions.js";

// Management bit width
import { MGNT_BIT_WIDTH } from "./Constants.js";

// Note: WH and WM policies settings are removed 

/* Class to represent a TLB entry (tag + PPN + management bits) */
export class TLBSetEntry {
    /**
     * Constructs a TLB set entry.
     * Undefined for PPN means no value
     * @param {*} p p5 object for the current canvas
     * @param {*} t tag width
     * @param {*} PPNWidth PPN width
     */
    constructor(p, t, PPNWidth) {
        this.p = p;       // p5 object of the current canvas

        this.t = t;       // tag width
        this.PPNWidth = PPNWidth;   // PPN width
        this.PPN = -1;     // PPN value

        this.V = 0;       // valid bit value
        this.D = 0;       // Dirty bit value
        this.R = 0;       // read bit value
        this.W = 0;       // write bit value
        this.E = 0;       // execute bit value
        this.tag = 0;       // tag value
        this.addr = -1;   // address of beginning of block (-1 is dummy addr)
        this.PPN = undefined;     // PPN value

        // lighting values
        this.lightPPN = 0;  // indicate highlighting for moved/changed data
        this.lightV = 0;
        this.lightD = 0;
        this.lightR = 0;
        this.lightW = 0;
        this.lightE = 0;
        this.lightT = 0;
    }

    // highlights the currently focused lines
    highlightData() { this.lightPPN = 1; }
    highlightAll() {
        this.lightV = 1;
        this.lightD = 1;
        this.lightR = 1;
        this.lightW = 1;
        this.lightE = 1;
        this.lightT = 1;
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
        this.lightT = 0;
    }

    /**
     * check if this entry contain the following valid tag
	 * @param {*} flag a boolean flag indicating read/write status. 
	 * 				   true: write
	 * 				   false: read
     * @param {*} tag tag to match with the tag stored in this entry
     * @retun true if a valid tag exist, false otherwise
     */
    containTag(flag, tag) {
        if(flag) return this.tag === tag && this.V && this.W;
        return this.tag === tag && this.V && this.R;
    }

    /**
     * checks if the current entry is used via the valid bit
     * @returns whether the current entry is valid
     */
    checkValid() {
        return this.V;
    }

    /**
     * return the PPN of this entry
     */
    getPPN() {
        return this.PPN;
    }

    /**
     * set the current entry to the given permissions, tag, and PPN
     * @param {*} permissions object containing permissions for management bits
     * @param {*} tag tag to be set
     * @param {*} PPN PPN to be set
     */
    setPPN(permissions, tag, PPN) {
        this.V = permissions.V;
        this.D = permissions.D;
        this.R = permissions.R;
        this.W = permissions.W;
        this.E = permissions.E;
        this.tag = tag;
        this.PPN = PPN;
    }

    /**
     * display this TLB set entry at given coordinates
     * @param {*} x 
     * @param {*} y 
     */
    display(x, y) {
        var d = 1;
        this.p.textSize(scaleC);
        // cache block boxes
        // Where the tag start
        var xt = x + scaleC * xwidth(1) * (MGNT_BIT_WIDTH);
        // Where the PPN start
        var xPPN = x + scaleC * (xwidth(1) * (MGNT_BIT_WIDTH) + xwidth(this.p.ceil(this.t / 4)));
        this.p.stroke(0);

        // render valid bit
        (this.lightV ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x, y, scaleC * xwidth(1), scaleC);  // valid

        // render dirty bit
        (this.lightD ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1), y, scaleC * xwidth(1), scaleC);  // dirty

        // render read bit
        (this.lightR ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 2, y, scaleC * xwidth(1), scaleC);     // read

        // render write bit
        (this.lightW ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 3, y, scaleC * xwidth(1), scaleC);     // write

        // render exec bit
        (this.lightE ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x + scaleC * xwidth(1) * 4, y, scaleC * xwidth(1), scaleC);     // write

        // render tag bit
        // alert("PPN width:" + this.PPNWidth);
        // alert("tag width:" + this.t);
        (this.lightT ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(xt, y, scaleC * xwidth(this.p.ceil(this.t / 4)), scaleC);  // tag

        // for PPN
        (this.light > 0 ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(xPPN, y, scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)), scaleC);  // data

        // cache block text
        var ytext = y + 0.85 * scaleC;
        this.p.textAlign(this.p.CENTER);

        // render valid bit text
        this.p.fill(this.lightV ? colorH : 0);
        this.p.text(this.V, x + scaleC * xwidth(1) * 0.5, ytext);  // valid

        // render dirty bits
        this.p.fill(this.lightD ? colorH : 0);
        this.p.text(this.D, x + scaleC * xwidth(1) * 1.5, ytext);  // dirty

        // render read bits
        this.p.fill(this.lightR ? colorH : 0);
        this.p.text(this.R, x + scaleC * xwidth(1) * 2.5, ytext);   // read

        // render write bits
        this.p.fill(this.lightW ? colorH : 0);
        this.p.text(this.W, x + scaleC * xwidth(1) * 3.5, ytext);   // write

        // render exec bits
        this.p.fill(this.lightE ? colorH : 0);
        this.p.text(this.E, x + scaleC * xwidth(1) * 4.5, ytext);   // exec

        // render tag bits
        var tagText = "";
        if (this.V)
            tagText = toBase(this.tag, 16, this.p.ceil(this.t / 4));
        else
            for (var i = 0; i < this.p.ceil(this.t / 4); i++) tagText += "-";
        this.p.fill(this.lightT ? colorH : 0);
        this.p.text(tagText, xt + scaleC * xwidth(this.p.ceil(this.t / 4)) * 0.5, ytext);  // tag

        // render PPN bits
        this.p.fill(this.lightPPN > 1 ? colorH : 0);
        this.p.text(this.V && !isNaN(this.PPN) ? toBase(this.PPN, 16, 2) : "--"
            , xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * (0.5), ytext);  // data

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