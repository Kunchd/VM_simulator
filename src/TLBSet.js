import { TLBSetEntry } from './TLBSetEntry.js';
import { scaleC } from './Constants.js';
import {colorC, colorM, colorH} from "./App.js";
import { xwidth } from './App.js';

/* Class to represent a TLB set (E cache lines).
 * This is where most of the cache policies are handled. */
export class TLBSet {
    constructor( p, E, t, PPNWidth ) {
      this.p = p;   // p5 object for current canvas

      this.E = E;   // associativty
      this.t = t;   // tag width
      this.PPNWidth = PPNWidth;   // PPN width

      this.lines = [];  // lines in this set
      for (var i = 0; i < E; i++)
        this.lines[i] = new TLBSetEntry(p, t, PPNWidth);
      // width for drawing
      this.width = scaleC*(xwidth(1)*(1) + xwidth(t < 1 ? 0 : this.p.ceil(t/4)) + xwidth(2) + 1);
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
  
    flush( ) {
      for (var i = 0; i < E; i++) {
        this.lines[i].invalidate();
        // if (replace > 0) this.used[i] = (replace == 1 ? E-i : 0);  // reset replacement policy
      }
    }
  
    setActive( ) { this.active = 1; }
    clearActive( ) { this.active = 0; }
    clearHighlight( ) { for (var i = 0; i < E; i++) this.lines[i].clearHighlight(); }
  
    display( x, y ) {
      this.p.stroke(colorC);  // orange set outline
      (this.active ? this.p.fill(255, 0, 0, 50) : this.p.noFill());
      this.p.rect(x, y, this.width, 1.5*scaleC*this.E);
      for (var i = 0; i < this.E; i++) {
        this.lines[i].display(x+0.5*scaleC, y+scaleC*(1+6*i)/4);
        // if (replace != 0) {
        //   textSize(12);
        //   fill(colorC);
        //   noStroke();
        //   text(this.used[i], x + this.width + 0.3*scaleC, y+scaleC*(2+3*i)/2);
        // }
      }
    }
  }