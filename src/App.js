import { PhysicalMemory } from "./PhysicalMemory.js";
import { VirtualMemory } from "./VirtualMemory.js";
import { VScrollbar } from "./VScrollbar.js";
import { TLB } from "./TLB.js";
import { scrollSize, dampening, scaleM, scaleC } from "./Constants.js";
import { TLBDisplayHeight, PTDisplayHeight, DiskDisplayHeight } from "./Constants.js";
import { INIT, PARAMS_PHYS_MEM, PARAMS_VIR_MEM, PARAMS_TLB, PARAMS_PT, PARAMS_DISK } from "./Constants.js";
import { PT } from "./PageTable.js";
import { bounded } from "./HelperFunctions.js";
import { Disk } from "./Disk.js";


let canvas, diagramCanvas;
let inAddrWidth, inPgSize, inTlbSize, inTlbE, inPhysMemSize; // system param input
let ptSize, vmSize; // sys param calculated values

// colors
export let bg, colorC, colorH, colorM;
export let colorG, colorB, colorW;

// System parameters
let m, PPNWidth, E, TLBSize, pgSize, physMemSize, PO;

// Main canvas table components
let physMem, virMem, tlb, pt, disk;

// scroll bars
let vbarPhysMem, vbarPhysMemEnable;
let vbarVirMemDisk, vbarVirMemEnable;
let vbarTlb, vbarTlbEnable;
let vbarPT, vbarPTEnable;
let vbarDiskEnable;

// system control buttons
let paramButton;
let explain = false;
let VM = true;

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
        colorG = p.color(70, 70, 70);    // grey
        colorB = p.color(20, 20, 20);       // black
        colorW = p.color(230, 230, 230); // white

        canvas = p.createCanvas(960, 750).parent("p5Canvas");

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
        vbarPhysMem = new VScrollbar(p, p.width - scrollSize - 350, 0, scrollSize, p.height, dampening);
        vbarVirMemDisk = new VScrollbar(p, p.width - scrollSize, 0, scrollSize, p.height, dampening);
        vbarTlb = new VScrollbar(p, 250 - scrollSize, 0, scrollSize, TLBDisplayHeight + scaleC, dampening);
        vbarPT = new VScrollbar(p, 250 - scrollSize, vbarTlb.ypos + TLBDisplayHeight + scaleC * 3, 
            scrollSize, PTDisplayHeight + scaleC, dampening);

        reset(true);
    }

    // draws the canvas, updated constantly
    p.draw = function () {
        p.background(bg);
        if (state === INIT) {
            dispMsg(5, 25);
        }
        if (state >= PARAMS_PHYS_MEM) { physMem.display(); }
        if (state >= PARAMS_VIR_MEM && VM) { virMem.display(); }
        if (state >= PARAMS_TLB) { tlb.display(); }
        if (state >= PARAMS_PT) { pt.display(); }
        if (state >= PARAMS_DISK && !VM) { disk.display(); }
        if (vbarPhysMemEnable) { vbarPhysMem.update(); vbarPhysMem.display(); }
        if (vbarVirMemEnable && VM) { vbarVirMemDisk.update(); vbarVirMemDisk.display(); }
        if (vbarDiskEnable && !VM) { vbarVirMemDisk.update(); vbarVirMemDisk.display(); }
        if (vbarTlbEnable) { vbarTlb.update(); vbarTlb.display(); }
        if (vbarPTEnable) { vbarPT.update(); vbarPT.display(); }

        displaVDHeader();
        if (p.mouseIsPressed) {
            updateVMDiskState();
        }
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
        if (!checkParams()) {
            switch (state) {
                case INIT:
                    physMem = new PhysicalMemory(p, physMemSize, pgSize, vbarPhysMem);

                    // reset memory scroll bar
                    vbarPhysMemEnable = (physMem.Mtop + physMem.Mheight > p.height);
                    vbarPhysMem.spos = vbarPhysMem.ypos;
                    vbarPhysMem.newspos = vbarPhysMem.ypos;

                    paramButton.attribute('value', 'Next');
                    // msgbox.value("Press Next (left) to advance explanation.\n");
                    state = PARAMS_PHYS_MEM;
                    if (!histMove && explain) break;
                case PARAMS_PHYS_MEM:
                    virMem = new VirtualMemory(p, m, PO, vbarVirMemDisk);

                    // reset memory scroll bar
                    vbarVirMemEnable = (virMem.Mtop + virMem.Mheight > p.height);
                    vbarVirMemDisk.spos = vbarVirMemDisk.ypos;
                    vbarVirMemDisk.newspos = vbarVirMemDisk.ypos;

                    // msgbox.value("Press Next (left) to advance explanation.\n");
                    state = PARAMS_VIR_MEM;
                    if (!histMove && explain) break;
                case PARAMS_VIR_MEM:
                    // initialize TLB
                    tlb = new TLB(p, vbarTlb, TLBSize, E, m, PPNWidth);
                    // reset cache scroll bar
                    vbarTlbEnable = (tlb.TLBtop + tlb.TLBheight > TLBDisplayHeight);
                    vbarTlb.spos = vbarTlb.ypos;
                    vbarTlb.newspos = vbarTlb.ypos;
                    state = PARAMS_TLB;
                    if (!histMove && explain) break;
                case PARAMS_TLB:
                    // initialize PT
                    pt = new PT(p, vbarPT, m, PPNWidth, PO);
                    // reset cache scroll bar
                    vbarPTEnable = (pt.PTtop + pt.PTheight > PTDisplayHeight);
                    vbarPT.spos = vbarPT.ypos;
                    vbarPT.newspos = vbarPT.ypos;
                    state = PARAMS_PT;
                    if (!histMove && explain) break;
                case PARAMS_PT:
                    disk = new Disk(p, m, PO, vbarVirMemDisk);
                    vbarDiskEnable = (disk.Dtop + disk.Dheight > p.height);

                    state = PARAMS_DISK;
                    if (!histMove && explain) break;
            }
        }
    }

    /**
     * check parameters before generating the system
     * @returns 0 if system is setup correctly, 1 if otherwise
     */
    function checkParams() {
        reset(!histMove);

        // setup working values
        TLBSize = p.int(inTlbSize.value());
        pgSize = p.int(inPgSize.value());

        physMemSize = p.int(inPhysMemSize.value());
        m = p.int(inAddrWidth.value());
        E = p.int(inTlbE.value());

        // calculate other cache parameters
        PO = p.log(pgSize) / p.log(2);
        PPNWidth = p.log(physMemSize) / p.log(2);

        return 0;
    }

    function displaVDHeader() {
        if (virMem !== undefined) {
            // display background
            p.noStroke();
            p.fill(bg);
            p.rect(virMem.x, 0, virMem.Mwidth + 5, virMem.Mtop);  // background for header
            p.rect(virMem.x, 0, -scaleM * 2.6, virMem.Mtop);  // cover row address

            // display selected
            p.fill(colorG);
            if (VM) {
                p.rect(virMem.x, 0, virMem.Mwidth * 0.6, 0.85 * scaleM + 5);
            } else {
                p.rect(virMem.x + virMem.Mwidth * 0.6, 0, virMem.Mwidth * 0.4, 0.85 * scaleM + 5);
            }

            // display title
            p.textSize(scaleM);
            if (VM) {
                p.stroke(colorW);
                p.fill(colorW);
                p.textAlign(p.CENTER);
                p.text("Vitrual Memory", virMem.x + virMem.Mwidth * 0.3, 0.85 * scaleM);          // VM
                p.stroke(colorB);
                p.fill(colorB);
                p.textAlign(p.CENTER);
                p.text("Disk", virMem.x + virMem.Mwidth * 0.8, 0.85 * scaleM);    // Disk
            } else {
                p.stroke(colorB);
                p.fill(colorB);
                p.textAlign(p.CENTER);
                p.text("Vitrual Memory", virMem.x + virMem.Mwidth * 0.3, 0.85 * scaleM);          // VM
                p.stroke(colorW);
                p.fill(colorW);
                p.textAlign(p.CENTER);
                p.text("Disk", virMem.x + virMem.Mwidth * 0.8, 0.85 * scaleM);    // Disk
            }

            // label VM
            p.textSize(scaleM * 0.8);
            p.textAlign(p.RIGHT);
            p.noStroke();
            p.fill(colorM);
            let label = "VPN";
            if(!VM) {
                label = "SSN";
            }
            p.text(label, virMem.x - 6, scaleM * 0.8);
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

    function updateVMDiskState() {
        if (bounded(p.mouseY, 0, 0.85 * scaleM + 5)) {
            if (bounded(p.mouseX, virMem.x, virMem.x + virMem.Mwidth * 0.6)) {
                VM = true;
                // reset scrollbar
                vbarVirMemDisk.spos = vbarVirMemDisk.ypos;
                vbarVirMemDisk.newspos = vbarVirMemDisk.ypos;
            }
            else if (bounded(p.mouseX, virMem.x + virMem.Mwidth * 0.6, virMem.x + virMem.Mwidth)) {
                VM = false;
                // reset scrollbar
                vbarVirMemDisk.spos = vbarVirMemDisk.ypos;
                vbarVirMemDisk.newspos = vbarVirMemDisk.ypos;
            }
        }

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