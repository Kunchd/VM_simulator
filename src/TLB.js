import { TLBSet } from "./TLBSet.js";
import {scaleC} from "./Constants.js";
import {colorC, colorM, colorH, bg} from "./App.js";
import { xwidth } from "./App.js";

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
  constructor(p, scrollBar, scrollBarEnable, TLBSize, E, addrWidth, PPNWidth) {
    this.p = p;     // p5 object of current canvas

    this.S = TLBSize / E;     // number of TLB sets
    this.E = E;     // TLB associatibity
    this.addrWidth = addrWidth;     // address width
    this.PPNWidth = PPNWidth;       // PPN width
    this.t = addrWidth - PPNWidth - (this.p.log(this.S / E) / this.p.log(2));    // tag width

    this.Ctop = scaleC;  // initial y of top of cache
    this.Cheight = this.S * 1.5 * this.E * scaleC;  // height of cache when drawn out
    this.sets = [];  // sets in the cache
    for (var i = 0; i < this.S; i++)
      this.sets[i] = new TLBSet(this.p, this.E, this.t, this.PPNWidth);
    this.Cwidth = this.sets[0].width + 2;  // width of cache when drawn out

    this.vbarTLBEnable = scrollBarEnable;
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
    if (this.vbarCacheEnable)
      offset = -(this.Cheight + 2 * this.Ctop - height) * vbarCache.getPos();
    for (var i = 0; i < this.S; i++) {
      this.p.textSize(scaleC * 0.8);
      this.p.textAlign(this.p.RIGHT);
      this.p.noStroke();
      this.p.fill(colorC);
      this.p.text("Set " + i, x - 2, this.Ctop + offset + 1.5 * this.E * scaleC * i + scaleC * (0.75 * this.E + 0.35));
      this.sets[i].display(x, this.Ctop + offset + 1.5 * this.E * scaleC * i);
    }
    this.p.noStroke();
    this.p.fill(bg);
    this.p.rect(x, 0, this.Cwidth, this.Ctop);  // background for header
    this.p.rect(x, 0, -scaleC * 3.0, this.Ctop);  // cover set numbers
    this.p.fill(colorC);
    this.p.stroke(colorC);
    this.p.textSize(scaleC);
    this.p.textAlign(this.p.CENTER);
    var ytext = 0.85 * scaleC;
    this.p.text("V", x + scaleC * (0.5 + xwidth(1) * 0.5), ytext);  // valid
    this.p.text("D", x + scaleC * (0.5 + xwidth(1) * 1.5), ytext);  // dirty
    if (this.t > 0) {
      var xt = x + scaleC * (0.5 + xwidth(1) * (1 + WH));
      this.p.text("T", xt + scaleC * xwidth(this.p.ceil(this.t / 4)) * 0.5, ytext);  // tag
    }
    var xb = x + scaleC * (xwidth(1) * (1) + xwidth(this.t < 1 ? 0 : this.p.ceil(this.t / 4)));
    this.p.textAlign(this.p.LEFT);
    this.p.text("PPN", xb + scaleC, ytext);  // data
  }
}