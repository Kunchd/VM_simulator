
let canvas, diagramCanvas;
let bg; // color variables

let msg = ""; // canvas message

// state variables and constants
let state;
const INIT = 0;

// history related variables
let histArray = [];

const displayTables = (p) => {
    p.setup = function () {
        bg = p.color(230);
        canvas = p.createCanvas(960, 400).parent("p5Canvas");

        reset(true);
    }

    p.draw = function () {
        p.background(bg);
        dispMsg(5, 25);
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

    // display the current message to canvas
    function dispMsg(x, y) {
        p.fill(0);
        p.noStroke();
        p.textSize(20);
        p.textAlign(p.LEFT);
        p.text(msg, x, y);
    }
}

const displayDiagram = (p) => {
    let img;

    p.preload = function () {
        img = p.loadImage("../assets/diagram.png");
    }

    p.setup = function () {
        diagramCanvas = p.createCanvas(500, 200).parent("p5addrTranslationCanvas");
        p.image(img, 0, 0);
    }
}

let tableP5 = new p5(displayTables);
let diagramP5 = new p5(displayDiagram);