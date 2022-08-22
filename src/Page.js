import { scaleM } from "./Constants";
import { colorC, colorH, colorM } from "./App";


/**
 * class representing a single page with randomized byte data
 */
export class Page {
    /**
     * constructs a new instance of a page
     * @param {*} p the p5 object associated with the current canvas
     * @param {*} PgSize page size
     */
    constructor(p, PgSize) {
        this.p = p;
        this.PgSize = PgSize;

        this.data = [];
        this.light = 0;
        this.height = scaleM * (1 + 6 * (this.PgSize / 8 + 1)) / 4;
        this.width = scaleM * xwidth(2) * 8;
        for (var i = 0; i < PgSize; i++) {
            this.data[i] = p.floor(Math.random() * 256);  // randomize the initial memory
        }
    }

    highlight() {
        this.light = 1;
    }

    clearHighlight() {
        this.light = 0;
    }

    /**
     * display the current page at the given coordinate
     * @param {*} x the x coordinate of the top left corner
     * @param {*} y the y coordinate of the top left corner
     */
    display(x, y) {
        // iterate over rows
        for (let i = 0; i < this.PgSize / 8; i++) {
            var y = scaleM * (1 + 6 * i) / 4 + y;
            var ytext = y + 0.85 * scaleM;

            this.p.textSize(scaleM);
            // memory boxes
            this.p.stroke(0);
            for (var j = 0; j < 8; j++) {
                switch (this.light) {
                    case 0: this.p.noFill(); break;
                    case 1: this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100); break;
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
    }
}