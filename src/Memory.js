// import {scaleM, scrollSize, hoverSize} from "./Constants.js";
// import {colorC, colorM, colorH, bg} from "./App.js";
// import { xwidth, toBase } from "./App.js";

const scrollSize = 16;
export const hoverSize = 16;     // size of hover text
const scaleM = 20;        // scale for sizing of memory

let bg, colorC, colorM, colorH;

/**
 * class to represent physical memory
 */
// TODO: math probably needs modifcation to fit our needs
export class Memory {

  /**
   * constructs a new instance of memory
   * @param {*} p the p5 object associated with the canvas which this memory
   *              representation will be placed in
   * @param {*} m the address width
   * @param {*} scrollBar the scroll bar associated with this table
   */
  constructor(p, m, scrollBar, scrollBarEnable) {
    bg = p.color(230);
    colorC = p.color(226, 102, 26);  // orange
    colorM = p.color(51, 153, 126);  // turquoise
    colorH = p.color(255, 0, 0);     // red

    this.Mtop = scaleM;  // initial y of top of memory
    this.Mheight = 1.5 * p.pow(2, m - 3) * scaleM;  // height of memory when drawn out
    this.Mwidth = scaleM * xwidth(2) * 8 + 2;  // width of memory when drawn out
    this.x = p.width - this.Mwidth - scrollSize - 10; // x coordinate of this table???
    this.data = [];  // data stored in memory
    this.light = [];  // indicate highlighting for moved/changed data
    this.vbarMem = scrollBar;   // the scroll bar created for the memory
    this.vbarMemEnable = scrollBarEnable;  // indicate whether current memory is enabled
    this.p = p;
    this.m = m;
    for (var i = 0; i < p.pow(2, this.m); i++) {
      this.data[i] = p.floor(Math.random() * 256);  // randomize the initial memory
      this.light[i] = 0;                 // nothing starts highlighted
    }
  }

  // helper methods for hightlighting
  // highlighting:  0 - no highlight, 1 - background, 2 - background + text
  highlight(addr, light) { this.light[addr] = light; }
  clearHighlight() { for (var i = 0; i < this.light.length; i++) this.light[i] = 0; }

  /**
   * Displays the memory table
   */
  display() {
    var x = this.x;
    var offset = 0;
    if (this.vbarMemEnable)
      offset = -(this.Mheight + 2 * this.Mtop - this.p.height) * this.vbarMem.getPos();
    for (var i = 0; i < this.p.pow(2, this.m - 3); i++) {
      var y = offset + scaleM * (1 + 6 * i) / 4 + this.Mtop;
      var ytext = y + 0.85 * scaleM;
      // label word/row
      this.p.textSize(scaleM * 0.8);
      this.p.textAlign(this.p.RIGHT);
      this.p.noStroke();
      this.p.fill(colorM);
      this.p.text("0x" + toBase(8 * i, 16, this.p.ceil(this.m / 4)), x - 2, ytext);

      this.p.textSize(scaleM);
      // memory boxes
      this.p.stroke(0);
      for (var j = 0; j < 8; j++) {
        switch (this.light[8 * i + j]) {
          case 0: this.p.noFill(); break;
          case 1: this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100); break;
          case 2:
          case 3: this.p.fill(this.p.red(colorM), this.p.green(colorM), this.p.blue(colorM), 100); break;
        }
        this.p.rect(x + scaleM * xwidth(2) * j, y, scaleM * xwidth(2), scaleM);
      }
      // memory text
      this.p.fill(0);
      this.p.textAlign(this.p.CENTER);
      for (var j = 0; j < 8; j++) {
        this.p.fill(this.light[8 * i + j] == 3 ? colorH : 0);
        this.p.text(toBase(this.data[8 * i + j], 16, 2), x + scaleM * xwidth(2) * (j + 0.5), ytext);
      }
      // hover text
      if (this.p.mouseY > y && this.p.mouseY < y + scaleM && this.p.mouseX > x && this.p.mouseX < x + scaleM * xwidth(2) * 8) {
        var idx = this.p.int((this.p.mouseX - x) / xwidth(2) / scaleM);
        this.p.textSize(hoverSize);
        this.p.fill(colorH);
        this.p.noStroke();
        this.p.text("0x" + (8 * i + idx).toString(16), this.p.mouseX, this.p.mouseY);
      }
    }
    this.p.noStroke();
    this.p.fill(bg);
    this.p.rect(x, 0, this.Mwidth, this.Mtop);  // background for header
    this.p.rect(x, 0, -scaleM * 2.6, this.Mtop);  // cover row address
    this.p.fill(colorM);
    this.p.stroke(colorM);
    this.p.textSize(scaleM);
    this.p.textAlign(this.p.CENTER);
    this.p.text("Physical Memory", x + this.Mwidth / 2, 0.85 * scaleM);  // mem label
  }
}

/* Helper function for determining width of boxes for cache and mem. */
export function xwidth(w) { return 0.2 + 0.7 * w; }


/* Helper function that prints d in base b, padded out to padding digits. */
export function toBase(d, b, padding) {
  var out = Number(d).toString(b);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
  while (out.length < padding)
    out = "0" + out;
  return out;
}