// temporary storage for const
const scaleC = 20;


// Note: WH and WM policies settings are removed 

/* Class to represent a TLB entry (tag + PPN + management bits) */
class TLBSetEntry {
    constructor(p) {
        this.p = p;       // p5 object of the current canvas
        this.V = 0;       // valid bit value
        this.D = 0;       // initialized to non-dirty?
        this.T = 0;       // tag value
        this.addr = -1;   // address of beginning of block (-1 is dummy addr)
        this.block = [];  // data in the cache block
        this.light = [];  // indicate highlighting for moved/changed data
        for (var i = 0; i < K; i++) {
            this.block[i] = 0;
            this.light[i] = 0;
        }
        this.lightV = 0;
        this.lightD = 0;
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
    highlightData() { for (var i = 0; i < K; i++) this.light[i] = 1; }
    highlightAll() {
        this.lightV = 1;
        this.lightD = 1;
        this.lightT = 1;
        this.highlightData();
    }

    // clears the currently highlighted data
    clearHighlight() {
        for (var i = 0; i < K; i++) this.light[i] = 0;
        this.lightV = 0;
        this.lightD = 0;
        this.lightT = 0;
    }

    display(x, y) {
        var d = this.D === 0 ? 0 : 1;
        this.p.textSize(scaleC);
        // cache block boxes
        var xt = x + scaleC * xwidth(1) * (1 + d);
        var xb = x + scaleC * (xwidth(1) * (1 + d) + xwidth(t < 1 ? 0 : this.p.ceil(t / 4)));
        this.p.stroke(0);
        (this.lightV ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
        this.p.rect(x, y, scaleC * xwidth(1), scaleC);  // valid
        if (d == 1) {
            (this.lightD ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
            this.p.rect(x + scaleC * xwidth(1), y, scaleC * xwidth(1), scaleC);  // dirty
        }
        if (t > 0) {
            (this.lightT ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
            this.p.rect(xt, y, scaleC * xwidth(this.p.ceil(t / 4)), scaleC);  // tag
        }
        for (var i = 0; i < K; i++) {
            (this.light[i] > 0 ? this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100) : this.p.noFill());
            this.p.rect(xb + scaleC * xwidth(2) * i, y, scaleC * xwidth(2), scaleC);  // data
        }

        // cache block text
        var ytext = y + 0.85 * scaleC;
        this.p.textAlign(CENTER);
        this.p.fill(this.lightV ? colorH : 0);
        this.p.text(this.V, x + scaleC * xwidth(1) * 0.5, ytext);  // valid
        if (d == 1) {
            this.p.fill(this.lightD ? colorH : 0);
            this.p.text(this.D, x + scaleC * xwidth(1) * 1.5, ytext);  // dirty
        }
        if (t > 0) {
            var tagText = "";
            if (this.V)
                tagText = toBase(this.T, 16, this.p.ceil(t / 4));
            else
                for (var i = 0; i < this.p.ceil(t / 4); i++) tagText += "-";
            this.p.fill(this.lightT ? colorH : 0);
            this.p.text(tagText, xt + scaleC * xwidth(this.p.ceil(t / 4)) * 0.5, ytext);  // tag
        }
        for (var i = 0; i < K; i++) {
            this.p.fill(this.light[i] > 1 ? colorH : 0);
            this.p.text(this.V ? toBase(this.block[i], 16, 2) : "--", xb + scaleC * xwidth(2) * (i + 0.5), ytext);  // data
        }

        // hover text
        if (this.V && this.p.mouseY > y && this.p.mouseY < y + scaleC && this.p.mouseX > xb && this.p.mouseX < xb + scaleC * xwidth(2) * K) {
            var idx = int((mouseX - xb) / xwidth(2) / scaleC);
            this.p.textSize(hoverSize);
            this.p.fill(colorH);
            this.p.noStroke();
            this.p.text("0x" + (this.addr + idx).toString(16), mouseX, mouseY);
        }
    }
}

/* Helper function for determining width of boxes for cache and mem. */
function xwidth(w) { return 0.2 + 0.7 * w; }


/* Helper function that prints d in base b, padded out to padding digits. */
function toBase(d, b, padding) {
    var out = Number(d).toString(b);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (out.length < padding)
        out = "0" + out;
    return out;
}