import { scaleM, hoverSize } from "./Constants.js";
import { colorB, bg, colorP } from "./App.js";
import { xwidth, toBase } from "./HelperFunctions.js";
import { EMPHASIS_HIGHLIGHT } from "./Constants.js";


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
        this.POWidth = this.p.log(PgSize) / this.p.log(2);

        this.data = [];

        this.VPN = -1;      // VPN associated with this page, for easier swapping
        this.PPN = -1;       // physical page number for hovertext and easier tracking

        /*
		 * 0 stands for unused
		 * 1 stands for emphasis highlight
		 */
        this.light = [];
        this.height = scaleM * (1.5 * (this.PgSize / 8) - 0.5);
        this.width = scaleM * xwidth(2) * 8;
        for (var i = 0; i < PgSize; i++) {
            this.data[i] = p.floor(Math.random() * 256);  // randomize the initial memory
            this.light[i] = 0;  // initialize with no emphasis highlight
        }
    }

    /**
     * emphasize highlight for the given byte
     * @param {*} byteIndex PO of the byte to highlight
     */
    highlight(byteIndex) {
        this.light[byteIndex] = 1;
    }

    /**
     * clear emphasis highlight
     */
    clearHighlight() {
        for(let i = 0; i < this.light.length; i++) this.light[i] = 0;
    }

    /**
     * set the associating VPN of this page to the given VPN
     * @param {*} VPN new associating VPN
     */
    setAssociatingVPN(VPN) {
        this.VPN = VPN;
    }

    /**
     * @returns associating VPN of this page, or -1 if no association exists
     */
    getAssociatingVPN() {
        return this.VPN
    }

    /**
     * set the associating Physical page number for this page
     * @param {*} PPN page number to set
     */
    setAssociatingPPN(PPN) {
        this.PPN = PPN;
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
                switch (this.light[8 * i + j]) {
                    case 0: this.p.noFill(); break;
                    case 1: this.p.fill(EMPHASIS_HIGHLIGHT); break;
                }
                this.p.rect(x + scaleM * xwidth(2) * j, iterY, scaleM * xwidth(2), scaleM);
            }
            // memory text
            this.p.fill(0);
            this.p.textAlign(this.p.CENTER);
            for (var j = 0; j < 8; j++) {
                this.p.fill(colorB);
                this.p.text(toBase(this.data[8 * i + j], 16, 2), x + scaleM * xwidth(2) * (j + 0.5), ytext);
            }
            // hover text (only show if this page is allocated)
            if (this.VPN !== -1 && this.p.mouseY > iterY && this.p.mouseY < iterY + scaleM 
                && this.p.mouseX > x && this.p.mouseX < x + scaleM * xwidth(2) * 8) {
                var idx = this.p.int((this.p.mouseX - x) / xwidth(2) / scaleM);
                let hoverText = "VA: 0x" + toBase(this.VPN * this.PgSize + 8 * i + idx, 16, null) + 
                                ", PA: 0x" + toBase(this.PPN * this.PgSize + 8 * i + idx, 16, null);
                let hoverTextLength = hoverText.length * hoverSize / 2 + 4;  // 4 added for buffer

                let hoverHeight = this.p.mouseY - hoverSize * 0.5;
                
                // draw background rect for hover text
                this.p.fill(bg);
                this.p.noStroke();
                this.p.rect(this.p.mouseX - (hoverTextLength / 2), 
                            hoverHeight - hoverSize * 0.85, hoverTextLength, hoverSize + 0.2,
                            5);

                // write hover text
                this.p.textSize(hoverSize);
                this.p.fill(colorP);
                this.p.noStroke();
                // this.p.text("0x" + (8 * i + idx).toString(16), this.p.mouseX, this.p.mouseY);
                this.p.text( hoverText, this.p.mouseX, hoverHeight);
            }
        }
    }
}