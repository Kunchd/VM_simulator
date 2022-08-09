/* Class to represent a TLB. */
class Cache {
    constructor( p, scaleC,  ) {
      this.Ctop = scaleC;  // initial y of top of cache
      this.Cheight = S * 1.5*E*scaleC;  // height of cache when drawn out
      this.sets = [];  // sets in the cache
      for (var i = 0; i < S; i++)
        this.sets[i] = new CacheSet();
      this.Cwidth = this.sets[0].width + 2;  // width of cache when drawn out
      this.x = vbarCache.xpos - 10 - this.Cwidth;
    }
  
    flush( ) {
      for (var i = 0; i < S; i++)
        this.sets[i].flush();
    }
  
    clearHighlight( ) { for (var i = 0; i < S; i++) this.sets[i].clearHighlight(); }
  
    display( ) {
      var x = this.x;
      var offset = 0;
      if (vbarCacheEnable)
        offset = -(this.Cheight + 2*this.Ctop - height) * vbarCache.getPos();
      for (var i = 0; i < S; i++) {
        textSize(scaleC*0.8);
        textAlign(RIGHT);
        noStroke();
        fill(colorC);
        text("Set " + i, x-2, this.Ctop + offset + 1.5*E*scaleC*i + scaleC*(0.75*E+0.35));
        this.sets[i].display(x, this.Ctop + offset + 1.5*E*scaleC*i);
      }
      noStroke();
      fill(bg);
      rect(x, 0, this.Cwidth, this.Ctop);  // background for header
      rect(x, 0, -scaleC*3.0, this.Ctop);  // cover set numbers
      fill(colorC);
      stroke(colorC);
      textSize(scaleC);
      textAlign(CENTER);
      var ytext = 0.85*scaleC;
      text("V", x + scaleC*(0.5 + xwidth(1)*0.5), ytext);  // valid
      if (WH == 1)
        text("D", x + scaleC*(0.5 + xwidth(1)*1.5), ytext);  // dirty
      if (t > 0) {
        var xt = x + scaleC*(0.5 + xwidth(1)*(1+WH));
        text("T", xt + scaleC*xwidth(ceil(t/4))*0.5, ytext);  // tag
      }
      var xb = x + scaleC*(xwidth(1)*(1+WH) + xwidth(t < 1 ? 0 : ceil(t/4)));
      textAlign(LEFT);
      text( "Cache Data", xb + scaleC, ytext);  // data
    }
  }