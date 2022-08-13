import { Memory } from "./Memory.js"
import { VScrollbar } from "./VScrollbar.js";
import { TLB } from "./TLB.js";
import { scrollSize, INIT, PARAMS_MEM, PARAMS_TLB } from "./Constants.js";


let canvas, diagramCanvas;
let inAddrWidth, inPgSize, inTlbSize, inTlbE, inPhysMemSize; // system param input
let ptSize, vmSize; // sys param calculated values

// colors
export let bg, colorC, colorH, colorM;

// System parameters
let m, PPNWidth, E, TLBSize, pgSize, physMemSize;

// Main canvas table components
let mem, tlb;

// scroll bars
let vbarMem, vbarMemEnable;
let vbarTlb, vbarTlbEnable;

// system control buttons
let paramButton;
let explain = false;

let msg = ""; // canvas message

// state variables and constants
let state;

// history related variables
let histArray = [];
let histMove = false;

const displayTables = (p) => {
    p.setup = function () {
        // initialize colors
        bg = p.color(230);
        colorC = p.color(226, 102, 26);  // orange
        colorM = p.color(51, 153, 126);  // turquoise
        colorH = p.color(255, 0, 0);     // red
        
        canvas = p.createCanvas(960, 400).parent("p5Canvas");

        // setup sys param input
        inAddrWidth = p.select("#addrWidth");
        inPgSize = p.select("#pgSize");
        inTlbSize = p.select("#tlbSize");
        inTlbE = p.select("#tlbE");
        inPhysMemSize = p.select("#physMemSize");

        // TODO: figure out how to display the calculated ptSize and vmSize are

        // setup system control buttons
        paramButton = p.select("#paramButton");
        paramButton.mousePressed(changeParams);

        // setup scroll bar
        vbarMem = new VScrollbar(p, p.width - scrollSize, 0, scrollSize, p.height, scrollSize);
        vbarTlb = new VScrollbar(p, 200 - scrollSize, 0, scrollSize, p.height, scrollSize);

        // setup working values
        TLBSize = p.int(inTlbSize.value());
        pgSize = p.int(inPgSize.value());
        physMemSize = p.int(inPhysMemSize.value());
        m = p.int(inAddrWidth.value());
        PPNWidth = p.log(physMemSize) / p.log(2);
        E = p.int(inTlbE.value());

        reset(true);
    }

    // draws the canvas, updated constantly
    p.draw = function () {
        p.background(bg);
        if (state === INIT) {
            dispMsg(5, 25);
        }
        if (state >= PARAMS_MEM) { mem.display(); }
        if (state >= PARAMS_TLB) { tlb.display(); }
        if (vbarMemEnable) { vbarMem.update(); vbarMem.display(); }
        if (vbarTlbEnable) { vbarTlb.update(); vbarTlb.display(); }
    }


    // helper method: resets the system to pre-generation
    // @param whether the system is being reset or not
    function reset(hist) {
        state = INIT;
        msg = "Welcome to the UW CSE 351 Virtual Memory Simulator!\n";
        msg += "Select system parameters above and press the button to get started.\n\n";
        msg += "Initial memory values are randomly generated (append \"?seed=******\"\n";
        msg += "to the URL to specify a 6-character seed — uses default otherwise).\n\n";
        msg += "Only data requests of 1 byte can be made.\n";
        msg += "The TLB and PT starts 'cold' (i.e. all lines are invalid).\n\n";
        msg += "You can hover over any byte of data in memory\nto see its corresponding memory address.\n\n";
        msg += "The access history can be modified by editing or pasting and then\n";
        msg += "pressing \"Load\", or can be traversed using the ↑ and ↓ buttons.";

        // restart history
        if (hist) {
            histArray = [];
        }
    }

    // Change systems parameter (what is displayed in main canvas) depending
    // on the current system state
    // safety measure in case someone mess with it I guess
    function changeParams() {
        if (checkParams) {
            switch (state) {
                case INIT:
                    mem = new Memory(p, m, vbarMem);

                    // reset memory scroll bar
                    vbarMemEnable = (mem.Mtop + mem.Mheight > p.height);
                    vbarMem.spos = vbarMem.ypos;
                    vbarMem.newspos = vbarMem.ypos;

                    paramButton.attribute('value', 'Next');
                    // msgbox.value("Press Next (left) to advance explanation.\n");
                    state = PARAMS_MEM;
                    if (!histMove && explain) break;
                case PARAMS_MEM:
                    // initialize TLB
                    tlb = new TLB(p, vbarTlb, TLBSize, E, m, PPNWidth);
                    // reset cache scroll bar
                    vbarTlbEnable = (tlb.TLBtop + tlb.TLBheight > p.height);
                    vbarTlb.spos = vbarTlb.ypos;
                    vbarTlb.newspos = vbarTlb.ypos;
                    state = PARAMS_TLB;
                    if (!histMove && explain) break;
            }
        }
    }

    // display the current message to canvas
    function dispMsg(x, y) {
        p.fill(0);
        p.noStroke();
        p.textSize(20);
        p.textAlign(p.LEFT);
        p.text(msg, x, y);
    }

    // checks whether the systems initialization params are correctly set
    // only returns true for dev purposes for now
    function checkParams() {
        return true;
    }
}

const displayDiagram = (p) => {
    let img;

    p.preload = function () {
        img = p.loadImage("../assets/diagram.png");
    }

    p.setup = function () {
        diagramCanvas = p.createCanvas(500, 180).parent("p5addrTranslationCanvas");
        p.image(img, 0, 0);
    }
}

let tableP5 = new p5(displayTables);
let diagramP5 = new p5(displayDiagram);