/* Vertical Scroll Bar class.
 * based on:  https://processing.org/examples/scrollbar.html */
export class VScrollbar {
    /**
     * creates a new instance of scroll bar
     * @param {*} p the p5 obect attached to the current canvas
     * @param {*} xp x position of bar
     * @param {*} yp y position of bar
     * @param {*} sw width of bar
     * @param {*} sh height of bar
     * @param {*} l loose/heavyness of bar
     */
    constructor(p, xp, yp, sw, sh, l) {
        // width and height of bar
        this.swidth = sw;
        this.sheight = sh;
        // x- and y-position of bar
        this.xpos = xp;
        this.ypos = yp;
        // y-position of slider (start at top)
        this.spos = yp;
        this.newspos = this.spos;
        // max and min values of slider
        this.sposMin = yp;
        this.sposMax = yp + sh - sw;
        // how loose/heavy
        this.loose = l;
        // status of mouse and slider
        this.over = false;
        this.locked = false;
        //   current p5 obj associated with the canvas this class is in
        this.p = p;
    }

    /**
     * update the scroll bar position to match mouse movement when 
     * over the current scroll bar
     */
    update() {
        this.over = this.overEvent();
        if (this.p.mouseIsPressed && this.over) {
            this.locked = true;
        }
        if (!this.p.mouseIsPressed) {
            this.locked = false;
        }
        if (this.locked) {
            this.newspos = this.constrain(this.p.mouseY - this.swidth / 2, this.sposMin, this.sposMax);
        }
        if (this.p.abs(this.newspos - this.spos) > 1) {
            this.spos = this.spos + (this.newspos - this.spos) / this.loose;
        }
    }

    constrain(val, minv, maxv) { return this.p.min(this.p.max(val, minv), maxv); }

    /**
     * @returns whether mouse is currently over the bar or not
     */
    overEvent() {
        return (this.p.mouseX > this.xpos && this.p.mouseX < this.xpos + this.swidth &&
            this.p.mouseY > this.ypos && this.p.mouseY < this.ypos + this.sheight);
    }

    /**
     * Display the current scroll bar
     */
    display() {
        this.p.noStroke();
        // draw slide track
        this.p.fill(0, 0, 0, 50);  // transparent black
        this.p.rect(this.xpos, this.ypos, this.swidth, this.sheight);

        // draw slider
        this.p.fill((this.over || this.locked) ? 50 : 160);
        this.p.rect(this.xpos, this.spos, this.swidth, this.swidth);

        // stripes
        this.p.stroke(0);
        this.p.line(this.xpos + 0.2 * this.swidth, this.spos + 0.25 * this.swidth, this.xpos + 0.8 * this.swidth, this.spos + 0.25 * this.swidth);
        this.p.line(this.xpos + 0.2 * this.swidth, this.spos + 0.5 * this.swidth, this.xpos + 0.8 * this.swidth, this.spos + 0.5 * this.swidth);
        this.p.line(this.xpos + 0.2 * this.swidth, this.spos + 0.75 * this.swidth, this.xpos + 0.8 * this.swidth, this.spos + 0.75 * this.swidth);
    }

    // return spos as percentage of bar height
    getPos() { return (this.spos - this.sposMin) / (this.sposMax - this.sposMin); }
}