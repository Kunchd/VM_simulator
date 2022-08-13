// constants
const scaleC = 20;        // scale for sizing of cache
const MGNT_BIT_WIDTH = 5;

// colors
let bg, colorC, colorH, colorM;

/* Class to represent a TLB. */
export class TLB {
	/**
	 * Construct a new isntance of TLB
	 * @param {*} p the p5 object assigned to current canvas
	 * @param {*} scrollBar the scroll bar to attatch the TLB to
	 * @param {*} scrollBarEnable determine whether the scroll bar is enabled
	 * @param {*} TLBSize the size in bytes of the TLB
	 * @param {*} E the assciativity of the TLB
	 * @param {*} addrWidth the bit width of the virtual address
	 * @param {*} PPNWidth the bit width of the PPN
	 */
	constructor(p, scrollBar, TLBSize, E, addrWidth, PPNWidth) {
		// initialize colors
		bg = p.color(230);
		colorC = p.color(226, 102, 26);  // orange
		colorM = p.color(51, 153, 126);  // turquoise
		colorH = p.color(255, 0, 0);     // red

		this.p = p;     // p5 object of current canvas

		this.S = TLBSize / E;     // number of TLB sets
		this.E = E;     // TLB associatibity
		this.addrWidth = addrWidth;     // address width
		this.PPNWidth = PPNWidth;       // PPN width
		this.t = addrWidth - PPNWidth - (this.p.log(this.S / E) / this.p.log(2));    // tag width

		this.TLBtop = scaleC;  // initial y of top of TLB
		this.TLBheight = this.S * 1.5 * this.E * scaleC;  // height of TLB when drawn out
		this.sets = [];  // sets in the TLB
		for (var i = 0; i < this.S; i++)
			this.sets[i] = new TLBSet(this.p, this.E, this.t, this.PPNWidth);
		this.Cwidth = this.sets[0].width + 2;  // width of TLB when drawn out

		// initialize TLB with scrollBar
		this.vbarTLBEnable = (this.TLBtop + this.TLBheight > (this.p.height / 2));
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
			
			offset = -(this.TLBheight + 2 * this.TLBtop - this.p.height) * this.vbarTLB.getPos();
			console.log(offset);
		}

		// display name of each set
		for (var i = 0; i < this.S; i++) {
			this.p.textSize(scaleC * 0.8);
			this.p.textAlign(this.p.RIGHT);
			this.p.noStroke();
			this.p.fill(colorC);
			this.p.text("Set " + i, x - 2, this.TLBtop + offset + 1.5 * this.E * scaleC * i + scaleC * (0.75 * this.E + 0.35));
			this.sets[i].display(x, this.TLBtop + offset + 1.5 * this.E * scaleC * i);
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
	}
}


/* Class to represent a TLB set (E cache lines).
 * This is where most of the cache policies are handled. */
class TLBSet {
	constructor(p, E, t, PPNWidth) {
		this.p = p;   // p5 object for current canvas

		this.E = E;   // associativty
		this.t = t;   // tag width
		this.PPNWidth = PPNWidth;   // PPN width

		this.lines = [];  // lines in this set
		for (var i = 0; i < E; i++)
			this.lines[i] = new TLBSetEntry(p, t, PPNWidth);
		// width for drawing
		this.width = scaleC * (xwidth(1) * (MGNT_BIT_WIDTH)
			+ xwidth(t < 1 ? 0 : this.p.ceil(t / 4)) + xwidth(this.p.ceil(this.PPNWidth / 4)) + 1);
		// is this the set of interest for this access? (affects display)
		this.active = 0;

		// // replacement policy:  0 = random, 1 = LRU
		// this.used = [];
		// if ( replace > 0 )
		//   for (var i = 0; i < E; i++ )
		//     this.used[i] = (replace == 1 ? E - i : 0);  // LRU: replace Block 0 first, FIFO: all zeros
	}
	// // INCOMPLETE
	// updateFIFO ( linenum ) {
	//   if (fifoup) {
	//     this.used[linenum] = Math.max.apply(null, this.used) + 1;
	//   }
	// }

	// updateLRU( linenum ) {
	//   var old = this.used[linenum];
	//   for (var i = 0; i < E; i++)
	//     this.used[i] += (this.used[i] < old) ? 1 : 0;
	//   this.used[linenum] = 1;
	// }

	// chooseVictim( ) {
	//   var victim;
	//   for (victim = 0; victim < E; victim++)  // first fill invalid lines
	//     if (this.lines[victim].V == 0) {
	//       msgbox.value(msgbox.value() + "Invalid Line " + victim + " chosen for replacement.\n");
	//       msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
	//       this.lines[victim].lightV = 1;
	//       fifoup = true;  // for FIFO replacement updates
	//       return victim;
	//     }
	//   if (replace == 0) {         // random replacement
	//     victim = floor(random(0,E));
	//     msgbox.value(msgbox.value() + "Line " + victim + " randomly chosen for replacement.\n");
	//   } else if (replace == 1) {  // LRU replacement
	//     victim = this.used.indexOf(E);
	//     msgbox.value(msgbox.value() + "Line " + victim + " is the least recently used.\n");
	//   } else if (replace == 2) {  // FIFO replacement
	//     victim = this.used.indexOf(1);
	//     msgbox.value(msgbox.value() + "Line " + victim + " is the first placed.\n");
	//   }
	//   msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
	//   this.lines[victim].highlightData();
	//   return victim;
	// }

	// checkSet( addr ) {
	//   var T = int(addr/K/S);  // tag value of addr
	//   for (var i = 0; i < E; i++)
	//     if (this.lines[i].V == 1 && this.lines[i].T == T) {
	//       activeLine = this.lines[i];
	//       activeLine.lightV = 1;
	//       activeLine.lightT = 1;
	//       cacheH += 1;  result = "H";  // record hit
	//       activeLineNum = i;
	//       msgbox.value(msgbox.value() + "HIT in Line " + i + "!\n");
	//       msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
	//       dispHit.style('color','red');
	//       return;
	//     }
	//   cacheM += 1;  result = "M";  // record miss
	//   msgbox.value(msgbox.value() + "MISS!\n");
	//   msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
	//   dispMiss.style('color','red');
	// }

	flush() {
		for (var i = 0; i < E; i++) {
			this.lines[i].invalidate();
			// if (replace > 0) this.used[i] = (replace == 1 ? E-i : 0);  // reset replacement policy
		}
	}

	setActive() { this.active = 1; }
	clearActive() { this.active = 0; }
	clearHighlight() { for (var i = 0; i < E; i++) this.lines[i].clearHighlight(); }

	display(x, y) {
		// draw rectangle set around different entries
		this.p.stroke(colorC);  // orange set outline
		(this.active ? this.p.fill(255, 0, 0, 50) : this.p.noFill());
		this.p.rect(x, y, this.width, 1.5 * scaleC * this.E);

		// draw each entry within the set
		for (var i = 0; i < this.E; i++) {
			this.lines[i].display(x + 0.5 * scaleC, y + scaleC * (1 + 6 * i) / 4);
			// if (replace != 0) {
			//   textSize(12);
			//   fill(colorC);
			//   noStroke();
			//   text(this.used[i], x + this.width + 0.3*scaleC, y+scaleC*(2+3*i)/2);
			// }
		}
	}
}


class TLBSetEntry {
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