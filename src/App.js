import { PhysicalMemory } from "./PhysicalMemory.js";
import { VirtualMemory } from "./VirtualMemory.js";
import { VScrollbar } from "./VScrollbar.js";
import { TLB } from "./TLB.js";
import { scrollSize, dampening, scaleM, scaleC } from "./Constants.js";
import { TLBDisplayHeight, PTDisplayHeight, DiskDisplayHeight } from "./Constants.js";
// import { INIT, PARAMS_PHYS_MEM, PARAMS_VIR_MEM, PARAMS_TLB, PARAMS_PT, PARAMS_DISK } from "./Constants.js";
import { PT } from "./PageTable.js";
import { bounded, toBase, getUrlParam } from "./HelperFunctions.js";
import { Disk } from "./Disk.js";


let canvas, diagramCanvas, seed;
let inAddrWidth, inPgSize, inTlbSize, inTlbE, inPhysMemSize; // system param input
let inReadAddr, inWriteAddr, inWriteData; // mem access param input

let dispPTSize, dispVMSize; // system param display
let ptSize, vmSize; // sys param calculated values

// colors
export let bg, colorC, colorH, colorM, colorP;
export let colorG, colorB, colorW, lightEmphasis;

// System parameters
let m, PPNWidth, E, TLBSize, pgSize, physMemSize, POwidth;
let VM = true;			// check if VM is being displayed
let userInteracting;	// check if user is currently using a button

// Main canvas table components
let physMem, virMem, tlb, pt, disk;

// scroll bars
let vbarPhysMem, vbarPhysMemEnable;
let vbarVirMem, vbarVirMemEnable;
let vbarDisk, vbarDiskEnable;
let vbarTlb, vbarTlbEnable;
let vbarPT, vbarPTEnable;

// system control buttons
let paramButton;
let readButton;
let writeButton;
let paramBox;
let explain;
let mmaBox;

let msg = ""; // canvas message
let msgbox;  // simulation messages

// system control access
let memoryAccessID = "MMA";         // memory access ID for system control
let generateSystemID = "GenSys";    // generate system ID for system control
let initialized = false;            // indicate whether system is ready to access user input

// state variables and constants
let state;
const INIT = 0, PARAMS_PHYS_MEM = 1, PARAMS_VIR_MEM = 2, PARAMS_TLB = 3;
const PARAMS_PT = 4, PARAMS_DISK = 5;
const READY = 6;
const CHECK_TLB = 7, CHECK_TLB_SET = 8, CHECK_TLB_VALID = 9, CHECK_TLB_TAG = 10;
const TLB_HIT = 11, TLB_MISS = 12;
const PROTECTION_CHECK = 13, PHYSICAL_PAGE_ACCESS = 14;
const CHECK_PT_VALID = 15, PT_HIT = 16, PT_MISS = 17;
const UPDATE_TLB = 18, PAGE_FAULT = 19;
const CHECK_SSN = 20, IN_DISK = 21, NOT_IN_DISK = 22, FIND_PM_VICTIM = 23;
const FIND_VICTIM_SSN = 24, VICTIM_IN_DISK = 25;
const VICTIM_DIRTY = 27, VICTIM_NOT_DIRTY = 28, WRITE_VICTIM_TO_DISK = 29;
const UPDATE_VICTIM_PTE = 30, MOVE_EVICTING_TO_PM = 31, UPDATE_EVICTING_PTE = 32;
const RESTART_INSTR = 33;
const SEEDLEN = 6;        // length of random seed string

// system status vairables
let TLBHit, TLBMiss;
let PTHit, PTMiss;

// System status & address breakdown html component
let dispVPN, dispPO, dispTLBTag, dispTLBIndex, dispPPN;
let dispTLBHit, dispTLBMiss, dispPTHit, dispPTMiss;

// history related variables
let histArray;
let histMove;
var histText, loadHistButton, uButton, dButton;
// history management variable
let histIndex;  // index of last entry

/**
 * Memory Access class for storing access history 
 */
class MemAccess {
    /**
     * constructs new instance of MemAccess
     */
    constructor() {
        // width and height of bar
        this.type = null;     // access type: 'R', 'W', 'A'
        this.addr = -1;       // access addr: decimal form
        // in case of 'A', addr is VPN
        this.data = -1;       // access data: decimal form
        this.tlbRes = '?';    // tlb access result: 'H', 'M', or '?'
        this.ptRes = '?';     // pt access result: 'H', 'M', or '?'
    }
}

/**
 * @todo update different highlighting for PM vs Disk
 */

const displayTables = (p) => {
    p.setup = function () {
        // initialize colors
        bg = p.color(230);
        colorC = p.color(226, 102, 26);  // orange
        colorM = p.color(51, 153, 126);  // turquoise
        colorH = p.color(255, 0, 0);     // red
        colorP = p.color(242, 0, 255);   // bright purple
        colorG = p.color(70, 70, 70);    // grey
        colorB = p.color(20, 20, 20);    // black
        colorW = p.color(230, 230, 230); // white
        lightEmphasis = p.color(255, 0, 0, 50)  // light red

        canvas = p.createCanvas(960, 750).parent("p5Canvas");

        // setup sys param input
        inAddrWidth = p.select("#addrWidth");
        inPgSize = p.select("#pgSize");
        inTlbSize = p.select("#tlbSize");
        inTlbE = p.select("#tlbE");
        inPhysMemSize = p.select("#physMemSize");
        dispPTSize = p.select("#ptSize");
        dispVMSize = p.select("#vmSize");
        inReadAddr = p.select("#rAddr");
        inWriteAddr = p.select("#wAddr");
        inWriteData = p.select("#wData");

        // setup system control buttons
        paramButton = p.select("#paramButton");
        // change params setup all classes for different tables
        paramButton.mousePressed(changeParams);
        paramBox = p.select("#paramBox");
        readButton = p.select("#readButton");
        readButton.mousePressed(readVM);
        writeButton = p.select("#writeButton");
        writeButton.mousePressed(writeVM);
        mmaBox = p.select("#mmaBox");

        // simulation messages
        msgbox = p.select("#msgbox");
        msgbox.value('');

        // history
        histText = p.select('#hist');
        loadHistButton = p.select('#loadHist');
        loadHistButton.mousePressed(loadHist);
        uButton = p.select('#upButton');
        uButton.mousePressed(histUp);
        dButton = p.select('#dnButton');
        dButton.mousePressed(histDown);
        histArray = [];
        histMove = false;
        histIndex = -1;     // start by pointing at no entry

        // setup system status display
        dispVPN = p.select("#dispVPN");
        dispPO = p.select("#dispPO");
        dispTLBTag = p.select("#dispTLBTag");
        dispTLBIndex = p.select("#dispTLBIndex");
        dispPPN = p.select("#dispPPN");
        dispTLBHit = p.select("#dispTLBHit");
        dispTLBMiss = p.select("#dispTLBMiss");
        dispPTHit = p.select("#dispPTHit");
        dispPTMiss = p.select("#dispPTMiss");

        // setup scroll bar
        vbarPhysMem = new VScrollbar(p, p.width - scrollSize - 350, 0,
            scrollSize, p.height, dampening, "vabarPhysMem");
        vbarVirMem = new VScrollbar(p, p.width - scrollSize, 0,
            scrollSize, p.height, dampening, "vbarVirMem");
        vbarDisk = new VScrollbar(p, p.width - scrollSize, 0,
            scrollSize, p.height, dampening, "vbarDisk");
        vbarTlb = new VScrollbar(p, 250 - scrollSize, 0,
            scrollSize, TLBDisplayHeight + scaleC, dampening, "vbarTlb");
        vbarPT = new VScrollbar(p, 250 - scrollSize, vbarTlb.ypos + TLBDisplayHeight + scaleC * 3,
            scrollSize, PTDisplayHeight + scaleC, dampening, "vbarPT");

        // initialize TLB, PT Hit/Miss state
        TLBHit = 0; TLBMiss = 0; PTHit = 0; PTMiss = 0;

        // initialize system parameters
        userInteracting = "";

        // extract seed for RNG
        // get seed from URL
        seed = getUrlParam('seed', 'cse351');
        if (seed.length != SEEDLEN) {
            window.alert("Wrong seed string length (" + seed.length + " instead of " + SEEDLEN + ") - using default seed \"cse351\".");
            seed = 'cse351';
        }
        console.log('seed = ' + seed);

        reset(true);
    }

    // draws the canvas, updated constantly
    p.draw = function () {
        p.background(bg);
        if (state === INIT) {
            dispMsg(5, 25);
        }
        if (state >= PARAMS_PHYS_MEM) { physMem.display(); }
        if (state >= PARAMS_VIR_MEM && VM) { virMem.updateAndDisplay(handleVPAllocation); }
        if (state >= PARAMS_TLB) { tlb.display(); }
        if (state >= PARAMS_PT) { pt.display(); }
        if (state >= PARAMS_DISK && !VM) { disk.display(); }
        if (vbarPhysMemEnable) { vbarPhysMem.update(); vbarPhysMem.display(); }
        if (vbarVirMemEnable && VM) { vbarVirMem.update(); vbarVirMem.display(); }
        if (vbarDiskEnable && !VM) { vbarDisk.update(); vbarDisk.display(); }
        if (vbarTlbEnable) { vbarTlb.update(); vbarTlb.display(); }
        if (vbarPTEnable) { vbarPT.update(); vbarPT.display(); }

        displaVDHeader();

        // display TLB, PT Hit/Miss information
        dispTLBHit.html(TLBHit);
        dispTLBMiss.html(TLBMiss);
        dispPTHit.html(PTHit);
        dispPTMiss.html(PTMiss);

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

        disableAccessButtons(0);

        // restart history
        if (hist) {
            histArray = [];
        }
    }

    function disableAccessButtons(accessType) {
        if (accessType != 0) paramButton.attribute('disabled', '');
        (accessType == 1 ? readButton.attribute('value', 'Next') : readButton.attribute('disabled', ''));
        (accessType == 2 ? writeButton.attribute('value', 'Next') : writeButton.attribute('disabled', ''));
        mmaBox.attribute('disabled', '');
        inReadAddr.attribute('disabled', '');
        inWriteAddr.attribute('disabled', '');
        inWriteData.attribute('disabled', '');
        histText.attribute('disabled', '');
        loadHistButton.attribute('disabled', '');
        uButton.attribute('disabled', '');
        dButton.attribute('disabled', '');
    }

    function enableAccessButtons() {
        readButton.attribute('value', 'Read');
        readButton.removeAttribute('disabled');
        writeButton.attribute('value', 'Write');
        writeButton.removeAttribute('disabled');
        mmaBox.removeAttribute('disabled');
        inReadAddr.removeAttribute('disabled');
        inWriteAddr.removeAttribute('disabled');
        inWriteData.removeAttribute('disabled');
        histText.removeAttribute('disabled');
        loadHistButton.removeAttribute('disabled');
        uButton.removeAttribute('disabled');
        dButton.removeAttribute('disabled');
        paramButton.removeAttribute('disabled');
    }

    var generateSysMessage

    // Change systems parameter (what is displayed in main canvas) depending
    // on the current system state
    // safety measure in case someone mess with it I guess
    function changeParams() {
        if (state == PARAMS_PHYS_MEM || state == PARAMS_VIR_MEM || state == PARAMS_TLB
            || state == PARAMS_PT || state == PARAMS_DISK || !checkParams()) {
            explain = paramBox.checked();
            console.log(explain + ", " + state);
            switch (state) {
                case INIT:
                    // reset initialized to false
                    initialized = false;
                    // reset previous system if applicable
                    resetOverhead();

                    // request system control
                    getControlAccess(generateSystemID);

                    physMem = new PhysicalMemory(p, physMemSize, pgSize, vbarPhysMem);

                    // reset memory scroll bar
                    vbarPhysMemEnable = (physMem.Mtop + physMem.Mheight > p.height);
                    vbarPhysMem.spos = vbarPhysMem.ypos;
                    vbarPhysMem.newspos = vbarPhysMem.ypos;

                    // update system paramter display window
                    paramButton.attribute('value', 'Next');
                    dispPTSize.html((p.pow(2, m) / pgSize) + " Entries");
                    dispVMSize.html(p.pow(2, m) + " Bytes");

                    // update message for physical memory
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    generateSysMessage += 'Values randomly generated with seed "' + seed + '".\n';
                    generateSysMessage += "Generating physical memory with size: "
                        + physMemSize + ", and page size: " + pgSize + "\n";
                    generateSysMessage += "So (phys mem size) / (pg size) = "
                        + (physMemSize / pgSize) + " total physical pages\n";
                    msgbox.value(generateSysMessage);

                    state = PARAMS_PHYS_MEM;
                    console.log(state);
                    if (!histMove && explain) break;
                case PARAMS_PHYS_MEM:
                    virMem = new VirtualMemory(p, m, POwidth, vbarVirMem);

                    // reset memory scroll bar
                    vbarVirMemEnable = (virMem.Mtop + virMem.Mheight > p.height);
                    vbarVirMem.spos = vbarVirMem.ypos;
                    vbarVirMem.newspos = vbarVirMem.ypos;

                    // update msg for VM
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    generateSysMessage += "Generating virtual memory with address width: " + m
                        + " and page offset width: " + POwidth + "\n";
                    generateSysMessage += "where page offset width = log_2(page size) = " + POwidth + " bits\n";
                    generateSysMessage += "So a total of 2^(m - POwidth) = " + p.pow(2, m - POwidth)
                        + " virtual pages\n"
                    msgbox.value(generateSysMessage);

                    state = PARAMS_VIR_MEM;
                    console.log(state);
                    if (!histMove && explain) break;
                case PARAMS_VIR_MEM:
                    // initialize TLB
                    tlb = new TLB(p, vbarTlb, TLBSize, E, m, PPNWidth);
                    // reset cache scroll bar
                    vbarTlbEnable = (tlb.TLBtop + tlb.TLBheight > TLBDisplayHeight);
                    vbarTlb.spos = vbarTlb.ypos;
                    vbarTlb.newspos = vbarTlb.ypos;

                    // update msg for TLB
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    generateSysMessage += "Generating Translation Lookaside Buffer with "
                        + TLBSize + " slots and associativity of " + E + "\n";
                    generateSysMessage += "So each Translation Lookaside Buffer set contains " + E + " blocks\n";
                    generateSysMessage += "and there are (total number of TLB slots) / (Associativity) = "
                        + (TLBSize / E) + " TLB sets\n";
                    generateSysMessage += "Each block contains a page table entry\n";

                    msgbox.value(generateSysMessage);

                    state = PARAMS_TLB;
                    console.log(state);
                    if (!histMove && explain) break;
                case PARAMS_TLB:
                    // initialize PT
                    pt = new PT(p, vbarPT, m, PPNWidth, POwidth);
                    // reset cache scroll bar
                    vbarPTEnable = (pt.PTtop + pt.PTheight > PTDisplayHeight);
                    vbarPT.spos = vbarPT.ypos;
                    vbarPT.newspos = vbarPT.ypos;

                    // udpate msg for pt
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    generateSysMessage += "generating page table with " + p.pow(2, m - POwidth)
                        + " (same as number of virtual pages) total entries.\n";
                    generateSysMessage += "Each page table entry contains Valid, Read, Write, Execute bits\n";
                    generateSysMessage += "Each page table entry also contains the Physical Page Number\n";
                    msgbox.value(generateSysMessage);

                    state = PARAMS_PT;
                    console.log(state);
                    if (!histMove && explain) break;
                case PARAMS_PT:
                    disk = new Disk(p, m, pgSize, vbarDisk);

                    // reset Disk scroll bar
                    vbarDiskEnable = (disk.Dtop + disk.Dheight > p.height);
                    vbarDisk.spos = vbarDisk.ypos;
                    vbarDisk.newspos = vbarDisk.ypos;

                    // update msg for disk
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    generateSysMessage += "generating disk (grow as space is needed)\n";
                    msgbox.value(generateSysMessage);

                    state = PARAMS_DISK;
                    console.log(state);
                    if (!histMove && explain) break;
                case PARAMS_DISK:
                    paramButton.attribute('value', 'Reset System');
                    msgbox.value("System Generated and Reset\n");
                    enableAccessButtons();
                    state = READY;
                    console.log(state);
                default:
                    // update msg for prepopulate
                    generateSysMessage = "Press [Next] to advance explanation.\n";
                    // add separating borders
                    generateSysMessage += "------------------------------------------------\n";

                    generateSysMessage += "prepopulate physical memory with 3 random virtual pages\n";

                    // pre-allocte 3 VPN
                    let list = [];
                    while (list.length < 3) {
                        let curVPN = p.floor(Math.random() * p.pow(2, m - POwidth));
                        if (!list.includes(curVPN)) {
                            list.push(curVPN);
                            handleVPAllocation(curVPN);
                            generateSysMessage += "virtual page: 0x" + toBase(curVPN, 16, null) + "\n";
                        }
                    }
                    msgbox.value(generateSysMessage);

                    // system done initializing
                    initialized = true;
                    // release control
                    releaseControlAccess(generateSystemID);
            }
        }
    }

    // persistent variable conatiners for readWriteDFA
    var VPN;
    var PO;
    var TLBI;
    var TLBT;
    var PPNRes;
    var PPN;
    var victimVPN;
    var victimSSN;
    var PPNRes;
    var SSNRes;
    var DFAmessage;
    var newAccess;
    var retryfaultingInstr;

    /**
     * @todo make sure when swapping current page from-to disk that values are preserved
     */

    /**
     * DFA that handles the address translation 
     * @param {*} writing set to true if writing, false if reading
     * @param {*} addr address to access
     * @param {*} data data to write if applicable. If read, value of this
     *                 parameter does not matter
     */
    function readWriteDFA(writing, addr, data) {
        explain = mmaBox.checked();

        switch (state) {
            case READY:
                console.log("ready");
                // get system control access to prevent allocation of new page
                getControlAccess(memoryAccessID);

                // clear all emphasis higlight for fresh start
                clearAllEmphasis();

                // reset display fields
                dispVPN.html("--");
                dispVPN.style("color", "black");
                dispPO.html("--");
                dispPO.style("color", "black");
                dispTLBTag.html("--");
                dispTLBTag.style("color", "black");
                dispTLBIndex.html("--");
                dispTLBIndex.style("color", "black");
                dispPPN.html("--");
                dispPPN.style("color", "black");
                dispTLBHit.html("--");
                dispTLBHit.style("color", "black");
                dispTLBMiss.html("--");
                dispTLBMiss.style("color", "black");
                dispPTHit.html("--");
                dispPTHit.style("color", "black");
                dispPTMiss.html("--");
                dispPTMiss.style("color", "black");

                // check input is valid
                if (isNaN(addr) || isNaN(data)) {
                    alert("Given write input is not a number");
                    return;
                } else if (addr >= p.pow(2, m) || addr < 0) {
                    alert("write address out of bound");
                    return;
                } else if (data < 0) {
                    alert("write data out of bound");
                    return;
                }
                VPN = addr >> POwidth;     // virtual page number
                PO = addr % pgSize;        // page offset

                dispVPN.html("0x" + toBase(VPN, 16, null));
                dispPO.html("0x" + toBase(PO, 16, null));
                dispVPN.style("color", "red");
                dispPO.style("color", "red");

                if (writing) {
                    disableAccessButtons(2);
                } else {
                    disableAccessButtons(1);
                }

                // check if retrying instruction
                if (retryfaultingInstr) {
                    DFAmessage += "break down virtual address into VPN, PO\n";
                }
                // reset message for msg box
                else {
                    DFAmessage = "break down virtual address into VPN, PO\n";
                }
                DFAmessage += "VPN: 0x" + toBase(VPN, 16, null)
                    + ", PO: 0x" + toBase(PO, 16, null) + "\n";

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // print to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                // build new access
                newAccess = new MemAccess();
                newAccess.type = writing ? "W" : "R";
                newAccess.addr = addr;
                newAccess.data = data;  // what's stored in data doesn't matter for R
                // since we will check access type first

                // push new mem access to hist and update display
                pushToHist(newAccess);
                updateHist();

                // this is how the DFA works, set next state and call again to trigger state code.
                state = CHECK_TLB;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_TLB:
                console.log("check tlb");

                // de-emphasize VPN and PO disp fields
                dispVPN.style("color", "black");
                dispPO.style("color", "black");

                // TLB bit breakdown for display
                let S = TLBSize / E;	// number of sets
                let Swidth = p.ceil(p.log(S) / p.log(2));	// bits required to represent S
                TLBI = VPN % S;
                TLBT = VPN >> Swidth;

                // update message for TLB
                DFAmessage += "Breaking VPN into TLB Index and tag\n";
                DFAmessage += "TLB Index: 0x" + toBase(TLBI, 16, null) + ", tag: 0x" + toBase(TLBT, 16, null) + "\n";

                // display tlb breakdown
                dispTLBTag.html("0x" + toBase(TLBT, 16, null));
                dispTLBIndex.html("0x" + toBase(TLBI, 16, null));
                dispTLBTag.style("color", "red");
                dispTLBIndex.style("color", "red");

                // update message box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = CHECK_TLB_SET;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_TLB_SET:
                dispTLBTag.style("color", "black");
                tlb.checkSet(VPN);

                DFAmessage += "Checking set: 0x" + toBase(TLBI, 16, null) + "\n";

                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = CHECK_TLB_TAG;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_TLB_TAG:
                dispTLBIndex.style("color", "black");
                dispTLBTag.style("color", "red");
                let tlb_tag_res = tlb.checkTag(VPN);

                DFAmessage += "Checking if set contains an entry with tag: 0x"
                    + toBase(TLBT, 16, null) + "\n";

                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = tlb_tag_res ? CHECK_TLB_VALID : TLB_MISS;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_TLB_VALID:
                dispTLBTag.style("color", "black");
                let tlb_valid_res = tlb.checkValid(VPN);

                DFAmessage += "Checking if discovered entry is valid\n";

                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = tlb_valid_res ? TLB_HIT : TLB_MISS;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case TLB_HIT:
                // get PPN from TLB
                console.log("VPN: " + VPN);
                PPN = tlb.getPPN(VPN);
                console.log("PPN: " + PPN);

                // TLB hit
                TLBHit++;
                // display PPN in box
                dispPPN.html("0x" + toBase(PPN, 16, null));
                dispPPN.style("color", "red");

                // update cur access
                histArray[histIndex].tlbRes = 'H';
                updateHist();

                // update message status
                DFAmessage += "TLB hit\n";
                DFAmessage += "PPN: 0x" + toBase(PPN, 16, null) + "\n";

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = PROTECTION_CHECK;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case TLB_MISS:
                // TLB miss
                TLBMiss++;

                // de-emphasize TLB tag and index
                dispTLBTag.style("color", "black");
                dispTLBIndex.style("color", "black");

                // update cur access
                histArray[histIndex].tlbRes = 'M';
                updateHist();

                // update message status
                DFAmessage += "TLB miss\n"

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = CHECK_PT_VALID;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PROTECTION_CHECK:
                console.log("pro check");

                // update message for protection check
                DFAmessage += "checking access permissions for ";
                DFAmessage += writing ? "write\n" : "read\n";

                // if has access permission, proceed to execute instruction.
                // else protection fault, revert to starting state.
                let permRes = pt.checkProtection(VPN, writing);
                if (permRes === "") {
                    state = PHYSICAL_PAGE_ACCESS;

                    // update msg state
                    DFAmessage += "have access permissions\n"
                } else {
                    console.log("Protection fault");

                    if (writing) {
                        enableAccessButtons(2);
                    } else {
                        enableAccessButtons(1);
                    }

                    // update msg state
                    DFAmessage += "Protection fault:\n";
                    DFAmessage += permRes;

                    // add separating borders
                    DFAmessage += "------------------------------------------------\n";
                    // flush to msg box
                    msgbox.value(DFAmessage);
                    msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                    // clear retry flag if necessary
                    retryfaultingInstr = false;

                    // set state
                    state = READY;

                    // release control access
                    releaseControlAccess(memoryAccessID)

                    // done so we don't call again
                    break;
                }

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PHYSICAL_PAGE_ACCESS:
                console.log("PP access");

                // update msg for accessing page
                DFAmessage += writing === true ? "writing to " : "reading from ";
                DFAmessage += "physical page 0x" + toBase(PPN, 16, null)
                    + " at offset 0x" + toBase(PO, 16, null) + "\n";

                if (writing) {
                    console.log("writing");
                    // access and write to physical memory with PPN
                    physMem.writeToPage(PPN, PO, data);

                    // update dirty bit
                    let perms = pt.getPagePermissions(VPN);
                    perms.D = 1;
                    // note since we are accessing the physical page,
                    // this page must be in PM
                    pt.setPTE(VPN, PPN, false, perms);
                } else {
                    console.log("reading");
                    // access and read from page
                    physMem.readFromPage(PPN, PO);
                }

                if (writing) {
                    enableAccessButtons(2);
                } else {
                    enableAccessButtons(1);
                }

                // update msg and flush to msg box
                DFAmessage += "done!\n";
                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                // clear retry flag if necessary
                retryfaultingInstr = false;

                // done so we dont call again 
                state = READY;

                // release control access
                releaseControlAccess(memoryAccessID)

                break;
            case CHECK_PT_VALID:
                console.log("check PT");

                // update msg for PT
                DFAmessage += "Checking page table...\n";
                DFAmessage += "Checking if VPN: 0x" + toBase(VPN, 16, null) + " have valid entry\n";

                // empahsize VPN field
                dispVPN.style("color", "red");

                let pt_valid = pt.checkValid(VPN);

                if (pt_valid) {
                    DFAmessage += "Page Table entry valid\n";
                } else {
                    DFAmessage += "Page Table entry invalid\n";
                }

                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = pt_valid ? PT_HIT : PT_MISS;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PT_HIT:
                // de-emphasize VPN field
                dispVPN.style("color", "black");

                PPNRes = pt.getPPN(VPN);  // PPN result from PT

                // page table hit
                PTHit++;
                // emphasize pt hit
                dispPTHit.style("color", "red");

                // update access state
                histArray[histIndex].ptRes = 'H';
                updateHist();

                // update msg state
                DFAmessage += "page table hit\n";

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = UPDATE_TLB;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PT_MISS:
                // page table miss
                PTMiss++;
                // emphasize page miss
                dispPTMiss.style("color", "red");

                // update access state
                histArray[histIndex].ptRes = 'M';
                updateHist();

                // update msg state
                DFAmessage += "page table miss\n";

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // update explain message
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = PAGE_FAULT;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case UPDATE_TLB:
                console.log("update tlb");

                // de-emphasize pt hit
                dispPTHit.style("color", "black");

                // update msg for updating tlb
                DFAmessage += "update TLB with new PTE found using Least Recently Used replacement policy\n";

                // get the PPN from page table result
                PPN = PPNRes[0];
                let dirty = PPNRes[1];

                // update tlb
                tlb.setEntry(VPN, pt.getPagePermissions(VPN), PPN);

                DFAmessage += "Retrieving PPN from TLB\n"
                DFAmessage += "PPN: 0x" + toBase(PPN, 16, null) + "\n";

                // update PPN field
                dispPPN.html("0x" + toBase(PPNRes[0], 16, null));
                // emphasize PPN field
                dispPPN.style("color", "red");

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = PROTECTION_CHECK;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PAGE_FAULT:
                console.log("page fault");

                // de-emphasize pt miss field
                dispPTMiss.style("color", "black");

                // update msg for Page Fault
                DFAmessage += "Page fault\n";
                DFAmessage += "Control transfered to OS\n";

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = CHECK_SSN;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_SSN:
                DFAmessage += "Attempting to get virtual page's location in disk via Swap Space Number (SSN)\n";

                // set display mode to disk
                VM = false;

                // access SSN while highlighting access
                SSNRes = pt.getSSN(VPN);

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = SSNRes !== null ? IN_DISK : NOT_IN_DISK;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case IN_DISK:
                DFAmessage += "SSN found!\n";
                DFAmessage += "Virtual page with VPN: 0x" + toBase(VPN, 16, null)
                    + " is located at SSN: 0x" + toBase(SSNRes[0], 16, null) + "\n";

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = FIND_PM_VICTIM;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case NOT_IN_DISK:
                console.log("segfault");

                // update msg state
                DFAmessage += "Page not found in disk\n";
                DFAmessage += "Segfault\n";

                if (writing) {
                    enableAccessButtons(2);
                } else {
                    enableAccessButtons(1);
                }

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                // clear retry flag if necessary
                retryfaultingInstr = false;

                // cannot be processed, so we do not proceed
                state = READY;

                // release control access
                releaseControlAccess(memoryAccessID)

                break;
            case FIND_PM_VICTIM:
                DFAmessage += "Finding page to evict in physical memory using LRU replacement policy\n";

                // find LRU page in physMem
                PPN = physMem.findVictim();
                victimVPN = physMem.getAssociatingVPN(PPN);

                DFAmessage += "Least recently used page is PPN: 0x" + toBase(PPN, 16, null)
                    + ", with VPN: 0x" + toBase(victimVPN, 16, null) + "\n";

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = FIND_VICTIM_SSN;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case FIND_VICTIM_SSN:
                DFAmessage += "Attempting to find victim page's (VPN: 0x"
                    + toBase(victimVPN, 16, null) + ") location in disk\n";

                // try to find if current page is already within disk
                victimSSN = disk.findPage(victimVPN);

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = VICTIM_IN_DISK;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case VICTIM_IN_DISK:
                DFAmessage += "Victim page found in disk at SSN: 0x" + toBase(victimSSN, 16, null) + "\n";
                DFAmessage += "Checking if victim is dirty...\n";

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = pt.getDirty(victimVPN) ? VICTIM_DIRTY : VICTIM_NOT_DIRTY;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case VICTIM_DIRTY:
                DFAmessage += "Victim is dirty, need to write to disk\n";

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = WRITE_VICTIM_TO_DISK;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case VICTIM_NOT_DIRTY:
                DFAmessage += "Victim is not dirty, no need to write to disk\n";

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = UPDATE_VICTIM_PTE;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case WRITE_VICTIM_TO_DISK:
                DFAmessage += "Writing changes to disk at SSN: 0x" + toBase(victimSSN, 16, null) + "\n";

                disk.setPage(victimSSN, physMem.getPage(PPN));

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = UPDATE_VICTIM_PTE;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case UPDATE_VICTIM_PTE:
                DFAmessage += "Updating evicted page's page table entry with its new location in disk\n";
                DFAmessage += "Swap Space Number: 0x" + toBase(victimSSN, 16, null) + "\n";
                DFAmessage += "invalidate evicted page's entry within TLB if applicable\n";

                let evictedPerm = pt.getPagePermissions(victimVPN);
                evictedPerm.V = 0;
                evictedPerm.D = 0;

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                // update PT perm
                pt.setPTE(victimVPN, victimSSN, true, evictedPerm);
                // update TLB perm
                tlb.invalidateEntry(victimVPN);

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = MOVE_EVICTING_TO_PM;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case MOVE_EVICTING_TO_PM:
                DFAmessage += "Copying content of evicting page at VPN: 0x"
                    + toBase(VPN, 16, null) + " to physical memory\n";

                // bring target page into physMem
                physMem.setPage(PPN, VPN, disk.getPage(SSNRes[0]));

                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = UPDATE_EVICTING_PTE;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case UPDATE_EVICTING_PTE:
                DFAmessage += "updating brought in page's page table entry with its new location in physical memory\n";
                DFAmessage += "PPN: 0x" + toBase(PPN, 16, null) + "\n";

                // get correct management bit permissions for newly brought in page
                let evictingPerm = pt.getPagePermissions(VPN);
                evictingPerm.V = 1;

                // update PT for newly brought in page
                pt.setPTE(VPN, PPN, false, evictingPerm);

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                state = RESTART_INSTR;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case RESTART_INSTR:
                DFAmessage += "restarting page-faulting instruction\n"

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);
                msgbox.elt.scrollTop = msgbox.elt.scrollHeight;

                // set retry faulting instruction flag so we keep disk swapping messages
                retryfaultingInstr = true;

                state = READY;

                // release control access (does this before quickly requesting again)
                // should not have issue with user requesting a new access within this time frame
                releaseControlAccess(memoryAccessID)

                if (!explain) readWriteDFA(writing, addr, data);
                break;
            default:
                alert("default case");
        }   // end switch
    }   // readWriteDFA

    /**
     * handles reading from VM upon user request to read at a given address
     */
    function readVM() {
        let addr = parseInt(inReadAddr.value(), 16);
        let data = 0;  // we are not writing so data is irrelevant 
        // only process if system initialized
        if (initialized) readWriteDFA(false, addr, data);
    }

    /**
     * handles writing to VM upon user request to write at a given address
     */
    function writeVM() {
        let addr = parseInt(inWriteAddr.value(), 16);
        let data = parseInt(inWriteData.value(), 16);
        // only process if system initialized
        if (initialized) readWriteDFA(true, addr, data);
    }

    /**
     * handles user allocating a new virtual page at the given VPN. 
     * Prioritize unused PM pages first before populating swap space.
     * If disk is full, no page will be allocated.
     * @param {*} VPN virtual page number of the page user is allocating
     */
    function handleVPAllocation(VPN) {
        // does not need to check for system initialization because 
        // the VM must have sys control inorder to call this function in the first place
        let perm = getPermForVPN(VPN);	// get management bit permission for this VA

        // if current page not already allocated
        if (pt.getPPN(VPN) === null && pt.getSSN(VPN) === null) {
            // update explain box
            let allocationMsg = "Attempting to allocate virtual page at VPN: 0x" + toBase(VPN, 16, null) + "\n";

            virMem.allocatePage(VPN);

            // allocates corresponding page in disk
            let SSN = disk.allocatePage(VPN);
            allocationMsg += "Allocating space for new page in disk at: 0x" + toBase(SSN, 16, null) + "\n";

            allocationMsg += "Attempting to find unused page in physical memory\n";
            let PPN = physMem.findUnusedPage();

            if (PPN !== -1) {
                allocationMsg += "Unused physical page at PPN: 0x" + toBase(PPN, 16, null) + " found\n";
                perm.V = 1;		// this page is in memory

                allocationMsg += "Storing a copy of newly allocated page in disk in memory\n"

                let page = disk.getPage(SSN)
                physMem.setPage(PPN, VPN, page);

                allocationMsg += "Updating page table entry for VPN: 0x" + toBase(VPN, 16, null) + "\n";
                allocationMsg += "Setting valid bit to 1 to indicate VPN: 0x"
                    + toBase(VPN, 16, null) + " is in physical memory\n";
                pt.setPTE(VPN, PPN, false, perm);
            } else {
                allocationMsg += "No unused page in physical memory found\n";
                allocationMsg += "Updating page table entry for VPN: 0x" + toBase(VPN, 16, null) + "\n";
                allocationMsg += "Setting valid bit to 0 since page is in disk\n";
                pt.setPTE(VPN, SSN, true, perm);
            }

            let newAccess = new MemAccess();
            newAccess.type = 'A';
            newAccess.addr = VPN;
            pushToHist(newAccess);

            // flush to msg box
            msgbox.value(allocationMsg);
            msgbox.elt.scrollTop = msgbox.elt.scrollHeight;
        }
    }

    /**
     * get the management permission for the given VPN based on its location within VM
     * @param {*} VPN virtual page number to get permission for
     * @returns management permission for the VPN without populated V, D, E bits
     */
    function getPermForVPN(VPN) {
        let totalVP = p.pow(2, m - POwidth);	// total number of virtual pages
        let percentage = VPN / totalVP;		// the percentage of the current page with
        // respect to total number of pages

        let perm;	// permission attached to the current VPN

        // read only segment
        if (0 <= percentage && percentage <= 0.1) {
            perm = {
                V: 0,
                D: 0,
                R: 1,
                W: 0,
                E: 0
            }
        }
        // read write segment
        else if (0.1 < percentage && percentage <= 0.4) {
            perm = {
                V: 0,
                D: 0,
                R: 1,
                W: 1,
                E: 0
            }
        }
        // shared heap/stack space
        else if (0.4 < percentage && percentage <= 1) {
            perm = {
                V: 0,
                D: 0,
                R: 1,
                W: 1,
                E: 0
            }
        }

        return perm;
    }

    /**
     * check parameters before generating the system
     * @returns 0 if system is setup correctly, 1 if otherwise
     */
    function checkParams() {
        reset(!histMove);

        // setup working values
        TLBSize = p.int(inTlbSize.value());         // TLB size in number of entries
        pgSize = p.int(inPgSize.value());           // page size in bytes

        physMemSize = p.int(inPhysMemSize.value()); // physical memory size
        m = p.int(inAddrWidth.value());             // address width
        E = p.int(inTlbE.value());                  // associativity

        // calculate other cache parameters
        POwidth = p.ceil(p.log(pgSize) / p.log(2));         // bit width of PO
        PPNWidth = p.ceil(p.log(physMemSize) / p.log(2));   // bit width of PPN

        // set random seed
        Math.seedrandom(seed);

        return 0;
    }

    /**
     * Display either VM or disk depending on user toggle and render VM/disk toggle
     */
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
                p.text("Virtual Memory", virMem.x + virMem.Mwidth * 0.3, 0.85 * scaleM);          // VM
                p.stroke(colorB);
                p.fill(colorB);
                p.textAlign(p.CENTER);
                p.text("Disk", virMem.x + virMem.Mwidth * 0.8, 0.85 * scaleM);    // Disk
            } else {
                p.stroke(colorB);
                p.fill(colorB);
                p.textAlign(p.CENTER);
                p.text("Virtual Memory", virMem.x + virMem.Mwidth * 0.3, 0.85 * scaleM);          // VM
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
            if (!VM) {
                label = "SSN";
            }
            p.text(label, virMem.x - 6, scaleM * 0.8);
        }
    }

    /**
         * flush all recorded data for every table,
         * reverting them to initial value
         */
    function flush() {
        tlb.flush();
        pt.flush();
        physMem.flush();
        virMem.flush();
        disk.flush();
    }

    /**
     * reset all system overhead relative to current 
     * sys state to default starting state
     */
    function resetOverhead() {
        // history stored value
        histArray = [];
        histMove = false;
        histIndex = -1;

        // display field stored values
        TLBHit = 0; TLBMiss = 0;
        PTHit = 0; PTMiss = 0;

        // initialized state
        initialized = false;

        // explain box values
        msg = '';
        msgbox.value('');

        // free control access lock
        userInteracting = "";

        // reset display fields
        dispVPN.html("--");
        dispVPN.style("color", "black");
        dispPO.html("--");
        dispPO.style("color", "black");
        dispTLBTag.html("--");
        dispTLBTag.style("color", "black");
        dispTLBIndex.html("--");
        dispTLBIndex.style("color", "black");
        dispPPN.html("--");
        dispPPN.style("color", "black");
        dispTLBHit.html("--");
        dispTLBHit.style("color", "black");
        dispTLBMiss.html("--");
        dispTLBMiss.style("color", "black");
        dispPTHit.html("--");
        dispPTHit.style("color", "black");
        dispPTMiss.html("--");
        dispPTMiss.style("color", "black");
    }

    // display the current message to canvas
    function dispMsg(x, y) {
        p.fill(0);
        p.noStroke();
        p.textSize(20);
        p.textAlign(p.LEFT);
        p.text(msg, x, y);
    }

    /**
     * check if user wants to update the VM state to disk or reverse
     */
    function updateVMDiskState() {
        if (!initialized) return false;
        // only check if sys initialized
        if (bounded(p.mouseY, 0, 0.85 * scaleM + 5)) {
            if (bounded(p.mouseX, virMem.x, virMem.x + virMem.Mwidth * 0.6)) {
                VM = true;
            }
            else if (bounded(p.mouseX, virMem.x + virMem.Mwidth * 0.6, virMem.x + virMem.Mwidth)) {
                VM = false;
            }
        }
    }

    /**
     * update history box to contain newest access instances
     */
    function updateHist() {
        // build string list of hist entries
        let histMsg = '';
        for (let i = 0; i < histArray.length; i++) {
            // arrow indicating which hist we're on
            histMsg += i == histIndex ? '> ' : '  ';
            switch (histArray[i].type) {
                case 'A':
                    histMsg += 'Allocate VPN: 0x' + toBase(histArray[i].addr, 16, 2) + '\n';
                    break;
                case 'W':
                    histMsg += 'W(0x' + toBase(histArray[i].addr, 16, 2) + ', 0x' +
                        toBase(histArray[i].data, 16, 2) + ') = \n' +
                        "  TLB: " + histArray[i].tlbRes + ", " +
                        "PT: " + histArray[i].ptRes + ", " + '\n';
                    break;
                case 'R':
                    histMsg += 'R(0x' + toBase(histArray[i].addr, 16, 2) + ') = \n' +
                        "  TLB: " + histArray[i].tlbRes + ", " +
                        "PT: " + histArray[i].ptRes + '\n';
                    break;
                default:
                    hist.value(hist.value() + 'Unknown access type\n');
            }
        }
        // post hist to hist box
        histText.value(histMsg);
    }

    /**
     * move hist cursor up
     */
    function histUp() {
        // only allow input when system initialized
        if (!initialized) return;
        histIndex = p.max(0, histIndex - 1);
        updateHist();
    }

    /**
     * move hist cursor down
     */
    function histDown() {
        // only allow input when system initialized
        if (!initialized) return;
        histIndex = p.min(histArray.length - 1, histIndex + 1);
        updateHist();
    }

    function loadHist() {
        /**
         * @todo new access is run on temp, but the display needs to show hist,
         *       since that's the thing being updated
         */

        // only allow input when system initialized
        if (!initialized) return;

        // flush current tables
        flush();
        paramBox.checked(false);
        mmaBox.checked(false);

        // update current hist upto histIndex
        let tempHist = histArray.slice(0, histIndex + 1);
        // reset histIndex since the calls will increment it
        histIndex = -1;
        // reset histArray to restart access
        histArray = [];

        // reset system tracking variables
        TLBHit = 0; TLBMiss = 0;
        PTHit = 0; PTMiss = 0;

        // re-call read/write for each entry
        for (let i = 0; i < tempHist.length; i++) {
            if (tempHist[i].type === 'A') {
                handleVPAllocation(tempHist[i].addr);
            } else {
                readWriteDFA(tempHist[i].type === 'W' ? true : false
                    , tempHist[i].addr, tempHist[i].data);
            }
        }
        console.log(histIndex);
        updateHist();
    }

    /**
     * push given mem access to hist
     * @param {*} access mem access to push
     */
    function pushToHist(access) {
        histArray.push(access);
        histIndex++;
        updateHist();
    }

    /**
     * clear all emphasis highlight in each table
     */
    function clearAllEmphasis() {
        tlb.clearHighlight();
        pt.clearHighlight();
        physMem.clearHighlight();
        virMem.clearHighlight();
        disk.clearHighlight();
    }

    /**
     * swap the given SSN page from disk with a page within physical memory
     * @param {*} SSN number of the page being brought in
     * @param {*} VPN virtual page number that will map to the page being brought in at SSN
     * @returns an array where the first is the newly allocated PPN which contains the page 
     * 			from the old SSN, and the second is the VPN of the victim removed.
     */
    function swapPageFromDiskToMem(SSN, VPN) {
        let PPN = physMem.findVictim();
        let victimVPN = physMem.getAssociatingVPN(PPN);

        let diskPage = disk.getPage(SSN);

        disk.setPage(SSN, physMem.getPage(PPN));
        physMem.setPage(PPN, VPN, diskPage);

        return [PPN, victimVPN];
    }
}

/**
 * p5 function to display diagram
 * @param {*} p p5 object for the diagram
 */
// const displayDiagram = (p) => {
//     let img;

//     p.preload = function () {
//         img = p.loadImage("../assets/diagram.png");
//     }

//     p.setup = function () {
//         diagramCanvas = p.createCanvas(500, 180).parent("p5addrTranslationCanvas");
//         p.image(img, 0, 0);
//     }
// }

/**
 * gives caller control over handling user input. 
 * All other user input components should be unable to handle 
 * user input while one component has control.
 * Caller is responsible for releasing control access
 * after input handling is done
 * @param {*} componentId arbitrary string id of the component requesting control	
 * 						  Note: component id should simply be the class name
 * @returns true - if the component can have access to handle user input
 * 			false - another component is current handling user input
 */
export function getControlAccess(componentId) {
    /**
     * @todo the mma ids should not prohibit the user's ability to scorll.
     *       it should only prohibit the ability to allocate
     */
    if (!userInteracting) {
        userInteracting = componentId;
        return true;
    } else if (userInteracting === memoryAccessID && componentId !== "VM") {
        return true;
    }
    return false;
}

/**
 * release caller control over handling user input to allow other 
 * component to handle user input. Only components currently holding
 * control access can free the control access. 
 * Components are responsible for releasing control access after input is processed
 * @param {*} componentId arbitrary string id of the component requesting control
 * 						  Note: component id should simply be the class name
 */
export function releaseControlAccess(componentId) {
    if (userInteracting === componentId) {
        userInteracting = "";
    }
}

let tableP5 = new p5(displayTables);
// let diagramP5 = new p5(displayDiagram);