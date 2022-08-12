import { scaleC } from "./Constants.js";
import { colorC, colorM, colorH } from "./App.js";
import { xwidth, toBase } from "./App.js";

// Management bit width
const MGNT_BIT_WIDTH = 5;

// Note: WH and WM policies settings are removed 

/* Class to represent a TLB entry (tag + PPN + management bits) */
export class TLBSetEntry {
    // undefined for PPN means no value
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
        this.T = 0;       // tag value
        this.addr = -1;   // address of beginning of block (-1 is dummy addr)
        this.PPN = 0;     // PPN value

        // lighting values
        this.lightPPN = 0;  // indicate highlighting for moved/changed data
        this.lightV = 0;
        this.lightD = 0;
        this.lightR = 0;
        this.lightW = 0;
        this.lightE = 0;
        this.lightT = 0;
    }

    // all functional methods are temporarily commented

    // invalidate() {
    //   if (this.D == 1) this.writeMem();
    //   this.V = 0;
    //   this.lightV = 1;
    // }

    // readMem( addr ) {
    //   this.addr = int(addr/K)*K;  // store address of beginning of block
    //   this.T = int(addr/K/S);
    //   this.lightT = 1;
    //   for (var i = 0; i < K; i++) {
    //     this.block[i] = mem.data[this.addr+i];
    //     mem.highlight(this.addr+i, 1);
    //     this.light[i] = 1;
    //   }
    //   this.lightV = !this.V;  // only highlight if it was previously invalid
    //   this.V = 1;
    //   msgbox.value(msgbox.value() + "Block read into cache from memory at address 0x" + toBase(this.addr, 16, 1) + ".\n");
    //   msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
    // }

    // writeMem( ) {
    //   for (var i = 0; i < K; i++) {
    //     mem.highlight(this.addr+i, mem.data[this.addr+i] == this.block[i] ? 2 : 3);
    //     mem.data[this.addr+i] = this.block[i];
    //   }
    //   this.D = this.D < 0 ? -1 : 0;
    //   this.lightD = 1;
    //   msgbox.value(msgbox.value() + "block written to memory at address 0x" + toBase(this.addr, 16, 1) + ".\n");
    //   msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
    // }

    // readByte( addr ) {
    //   this.light[addr%K] = 2;
    //   return this.block[addr%K];
    // }

    // writeByte( addr, data ) {
    //   this.block[addr%K] = data;
    //   this.light[addr%K] = 2;
    //   if (this.D < 0) {
    //     msgbox.value(msgbox.value() + "Write through: ");
    //     this.writeMem(this.addr);  // write through to Mem
    //   } else {
    //     msgbox.value(msgbox.value() + "Write back: set Dirty bit.");
    //     this.D = 1;  // set dirty bit
    //     this.lightD = 1;
    //   }
    // }

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
     * @todo change math for the TLB to work
     */

    /**
     * 
     * @param {*} x 
     * @param {*} y 
     */
    display(x, y) {
        // var d = this.D < 0 ? 0 : 1;    a write policy thing
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
            tagText = toBase(this.T, 16, this.p.ceil(this.t / 4));
        else
            for (var i = 0; i < this.p.ceil(this.t / 4); i++) tagText += "-";
        this.p.fill(this.lightT ? colorH : 0);
        this.p.text(tagText, xt + scaleC * xwidth(this.p.ceil(this.t / 4)) * 0.5, ytext);  // tag

        // render PPN bits
        this.p.fill(this.lightPPN > 1 ? colorH : 0);
        this.p.text(this.V ? toBase(this.PPN, 16, 2) : "--"
            , xPPN + scaleC * xwidth(this.p.ceil(this.PPNWidth / 4)) * (0.5), ytext);  // data

        // hover text
        if (this.V && this.p.mouseY > y && this.p.mouseY < y + scaleC && this.p.mouseX > xPPN && this.p.mouseX < xPPN + scaleC * xwidth(2) * K) {
            var idx = int((mouseX - xPPN) / xwidth(2) / scaleC);
            this.p.textSize(hoverSize);
            this.p.fill(colorH);
            this.p.noStroke();
            this.p.text("0x" + (this.addr + idx).toString(16), mouseX, mouseY);
        }
    }
}