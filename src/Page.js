import { scaleM, hoverSize } from "./Constants.js";
import { colorC, colorH, colorM } from "./App.js";
import { xwidth, toBase } from "./HelperFunctions.js";


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
        this.height = scaleM * (1.5 * (this.PgSize / 8) - 0.5);
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
     * write the given data at the give page offset
     * @param {*} PO page offset
     * @param {*} data data to write
     */
    write(PO, data) {
        this.data[PO] = data;
    }

    /**
     * display the current page at the given coordinate
     * @param {*} x the x coordinate of the top left corner
     * @param {*} y the y coordinate of the top left corner
     */
    display(x, y) {
        // iterate over rows
        for (let i = 0; i < this.PgSize / 8; i++) {
            var iterY = scaleM * (6 * i) / 4 + y;
            var ytext = iterY + 0.85 * scaleM;


            this.p.textSize(scaleM);
            // memory boxes
            this.p.stroke(0);
            for (var j = 0; j < 8; j++) {
                switch (this.light) {
                    case 0: this.p.noFill(); break;
                    case 1: this.p.fill(this.p.red(colorC), this.p.green(colorC), this.p.blue(colorC), 100); break;
                }
                this.p.rect(x + scaleM * xwidth(2) * j, iterY, scaleM * xwidth(2), scaleM);
            }
            // memory text
            this.p.fill(0);
            this.p.textAlign(this.p.CENTER);
            for (var j = 0; j < 8; j++) {
                this.p.fill(this.light === 1 ? colorH : 0);
                this.p.text(toBase(this.data[8 * i + j], 16, 2), x + scaleM * xwidth(2) * (j + 0.5), ytext);
            }
            // hover text
            if (this.p.mouseY > iterY && this.p.mouseY < iterY + scaleM && this.p.mouseX > x && this.p.mouseX < x + scaleM * xwidth(2) * 8) {
                var idx = this.p.int((this.p.mouseX - x) / xwidth(2) / scaleM);
                this.p.textSize(hoverSize);
                this.p.fill(colorH);
                this.p.noStroke();
                this.p.text("0x" + (8 * i + idx).toString(16), this.p.mouseX, this.p.mouseY);
            }
        }
    }
}