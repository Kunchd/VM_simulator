import { PhysicalMemory } from "./PhysicalMemory.js";
import { VirtualMemory } from "./VirtualMemory.js";
import { VScrollbar } from "./VScrollbar.js";
import { TLB } from "./TLB.js";
import { scrollSize, dampening, scaleM, scaleC } from "./Constants.js";
import { TLBDisplayHeight, PTDisplayHeight, DiskDisplayHeight } from "./Constants.js";
// import { INIT, PARAMS_PHYS_MEM, PARAMS_VIR_MEM, PARAMS_TLB, PARAMS_PT, PARAMS_DISK } from "./Constants.js";
import { PT } from "./PageTable.js";
import { bounded, toBase } from "./HelperFunctions.js";
import { Disk } from "./Disk.js";


let canvas, diagramCanvas;
let inAddrWidth, inPgSize, inTlbSize, inTlbE, inPhysMemSize; // system param input
let inReadAddr, inWriteAddr, inWriteData; // mem access param input

let dispPTSize, dispVMSize; // system param display
let ptSize, vmSize; // sys param calculated values

// colors
export let bg, colorC, colorH, colorM, colorP;
export let colorG, colorB, colorW;

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

// state variables and constants
let state;
const INIT = 0, PARAMS_PHYS_MEM = 1, PARAMS_VIR_MEM = 2, PARAMS_TLB = 3;
const PARAMS_PT = 4, PARAMS_DISK = 5;
const READY = 6, CHECK_TLB = 7;
const PROTECTION_CHECK = 8, PHYSICAL_PAGE_ACCESS = 9;
const CHECK_PAGE_TABLE = 10, UPDATE_TLB = 11, PAGE_FAULT = 12;

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
        this.fRes = '?';      // final access result: 'H', 'M', or '?'
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
                    generateSysMessage = "generating physical memory with size: "
                        + physMemSize + ", and page size: " + pgSize + "\n";
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
                    generateSysMessage += "generating virtual memory with " + p.pow(2, m - POwidth) + " pages\n";
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
                    generateSysMessage += "generating TLB with " + TLBSize + " slots and associativity of " + E + "\n";
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
                    generateSysMessage += "generating page table with " + p.pow(2, m - POwidth) + " total entries.\n";
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
                    generateSysMessage += "generating disk with same size as VM (unrealisitc)\n";
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
                    generateSysMessage += "prepopulate physical memory with 3 random virtual pages\n";
                    msgbox.value(generateSysMessage);

                    // pre-allocte 3 VPN
                    let list = [];
                    while (list.length < 3) {
                        let curVPN = p.floor(Math.random() * p.pow(2, m - POwidth));
                        if (!list.includes(curVPN)) {
                            list.push(curVPN);
                            handleVPAllocation(curVPN);
                        }
                    }
            }
        }
    }

    // persistent variable conatiners for readWriteDFA
    var VPN;
    var PO;
    var PPNRes;
    var PPN;
    var PPNRes;
    var DFAmessage;
    var newAccess;

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

                dispVPN.html(toBase(VPN, 16, null));
                dispPO.html(toBase(PO, 16, null));

                if (writing) {
                    disableAccessButtons(2);
                } else {
                    disableAccessButtons(1);
                }

                // reset message for msg box
                DFAmessage = "break down virtual address into VPN, PO\n";
                DFAmessage += "VPN: " + VPN + ", PO: " + PO + "\n";

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // print to msg box
                msgbox.value(DFAmessage);

                // build new access
                newAccess = new MemAccess();
                newAccess.type = writing ? "W" : "R";
                newAccess.addr = addr;
                newAccess.data = data;  // what's stored in data doesn't matter for R
                // since we will check access type first

                // this is how the DFA works, set next state and call again to trigger state code.
                state = CHECK_TLB;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case CHECK_TLB:
                console.log("check tlb");

                // TLB bit breakdown for display
                let S = TLBSize / E;	// number of sets
                let Swidth = p.ceil(p.log(S) / p.log(2));	// bits required to represent S
                let TLBI = VPN % S;
                let TLBT = VPN >> Swidth;

                // update message for TLB
                DFAmessage += "Breaking VPN into TLB Index and tag\n";
                DFAmessage += "TLB Index: " + TLBI + ", tag: " + TLBT + "\n";
                DFAmessage += "Checking TLB with TLBI and TLBT\n";

                // display tlb breakdown
                dispTLBTag.html(toBase(TLBT, 16, null));
                dispTLBIndex.html(toBase(TLBI, 16, null));

                // check if address is in TLB
                console.log("VPN: " + VPN);
                PPN = tlb.getPPN(VPN);
                console.log("PPN: " + PPN);


                if (PPN === -1) {
                    // TLB miss
                    TLBMiss++;
                    state = CHECK_PAGE_TABLE;

                    // update cur access
                    newAccess.tlbRes = 'M';
                    // update message status
                    DFAmessage += "TLB miss\n"
                } else {
                    // TLB hit
                    TLBHit++;
                    // display PPN in box
                    dispPPN.html(toBase(PPN, 16, null));

                    state = PROTECTION_CHECK;

                    // update cur access
                    newAccess.tlbRes = 'H';
                    // update message status
                    DFAmessage += "TLB hit\n"
                }

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // print message to msg box
                msgbox.value(DFAmessage);

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

                    // update access state
                    newAccess.fRes = 'H';
                    // update msg state
                    DFAmessage += "have access permissions\n"
                } else {
                    console.log("Protection fault");
                    state = READY;

                    if (writing) {
                        enableAccessButtons(2);
                    } else {
                        enableAccessButtons(1);
                    }

                    // update access state
                    newAccess.fRes = 'M';
                    // update msg state
                    DFAmessage += "Protection fault:\n";
                    DFAmessage += permRes;

                    // add separating borders
                    DFAmessage += "------------------------------------------------\n";
                    // flush to msg box
                    msgbox.value(DFAmessage);

                    // push access to hist
                    pushToHist(newAccess);
                    // done so we don't call again
                    break;
                }

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);

                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PHYSICAL_PAGE_ACCESS:
                console.log("PP access");

                // update msg for accessing page
                DFAmessage += writing === true ? "writing to " : "reading from ";
                DFAmessage += "physical page " + PPN + " at offset " + PO + "\n";

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

                // push access to hist
                pushToHist(newAccess);

                // done so we dont call again 
                state = READY;
                break;
            case CHECK_PAGE_TABLE:
                console.log("check PT");

                // update msg for PT
                DFAmessage += "checking page table for VPN\n";

                PPNRes = pt.getPPN(VPN);  // PPN result from PT
                if (PPNRes === null) {
                    // page table miss
                    PTMiss++;
                    state = PAGE_FAULT;

                    // update access state
                    newAccess.ptRes = 'M';
                    // update msg state
                    DFAmessage += "page table miss\n";
                } else {
                    // page table hit
                    PTHit++;
                    // display PPN in box
                    dispPPN.html(toBase(PPNRes[0], 16, null));

                    state = UPDATE_TLB;

                    // update access state
                    newAccess.ptRes = 'H';
                    // update msg state
                    DFAmessage += "page table hit\n";
                }

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);

                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case UPDATE_TLB:
                console.log("update tlb");

                // update msg for updating tlb
                DFAmessage += "update TLB with new PTE found\n";

                // get the PPN from page table result
                PPN = PPNRes[0];
                let dirty = PPNRes[1];

                // update tlb
                tlb.setEntry(VPN, pt.getPagePermissions(VPN), PPN);
                state = PROTECTION_CHECK;

                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);

                if (!explain) readWriteDFA(writing, addr, data);
                break;
            case PAGE_FAULT:
                console.log("page fault");

                // update msg for Page Fault
                DFAmessage += "page fault\n";
                DFAmessage += "control transfered to OS\n";

                // add separating borders (start of OS actions)
                DFAmessage += "------------------------------------------------\n";
                DFAmessage += "attempting to get page from disk\n";

                let SSNRes = pt.getSSN(VPN);

                // page not found in disk
                if (SSNRes === null) {
                    console.log("segfault");

                    // update access state
                    newAccess.fRes = 'M';
                    // update msg state
                    DFAmessage += "page not found in disk\n";
                    DFAmessage += "segfault\n";

                    if (writing) {
                        enableAccessButtons(2);
                    } else {
                        enableAccessButtons(1);
                    }

                    // push access to hist
                    pushToHist(newAccess);

                    // add separating borders
                    DFAmessage += "------------------------------------------------\n";
                    // flush to msg box
                    msgbox.value(DFAmessage);

                    // cannot be processed, so we do not proceed
                    state = READY;
                    break;
                }
                // page found in disk
                else {
                    // updating msg state
                    DFAmessage += "page found in disk\n";
                    DFAmessage += "swapping page into memory using LRU replacement policy\n";

                    let [SSN, dirty] = SSNRes;
                    // bring this page into mem
                    // let [PPN, victimVPN] = swapPageFromDiskToMem(SSN, VPN);

                    // find LRU page in physMem
                    let PPN = physMem.findVictim();
                    let victimVPN = physMem.getAssociatingVPN(PPN);

                    DFAmessage += "Least recently used page is PPN: " + PPN + ", with VPN: " + victimVPN + "\n";

                    // updating msg state
                    DFAmessage += "check if page to evict is dirty\n";

                    // check if victim is dirty
                    if (pt.getDirty(victimVPN)) {
                        // evicted page is dirty writing to disk
                        DFAmessage += "evicted page is dirty, writing to disk\n";
                    } else {
                        DFAmessage += "evicted page is not dirty, no need to update disk\n";
                    }

                    // try to find if current page is already within disk
                    let victimSSN = disk.findPage(victimVPN);
                    // if already in disk, simply move page into spot in disk
                    if (victimSSN !== -1) {
                        disk.setPage(victimSSN, physMem.getPage(PPN));

                        // updating msg state
                        DFAmessage += "updating evicted page's page table entry with its new location in disk\n";
                        DFAmessage += "swap space number: " + victimSSN + "\n";

                        DFAmessage += "invalidate evicted page's entry within TLB if applicable\n";
                        let evictedPerm = pt.getPagePermissions(victimVPN);
                        evictedPerm.V = 0;
                        evictedPerm.D = 0;
                        // update PT perm
                        pt.setPTE(victimVPN, victimSSN, true, evictedPerm);
                        // update TLB perm
                        tlb.invalidateEntry(victimVPN);
                    }
                    // if not in disk, allocate new page
                    else {
                        // FOR READING in case page is not on disk
                        if (!pt.getDirty(victimVPN)) {
                            DFAmessage += "copy of page not found in disk. Allocating new page in disk for evicted page\n";
                        }

                        // For both reading and writing case
                        // allocate page in disk if not already there
                        victimSSN = disk.allocatePage(victimVPN);
                        // if disk full, notify user
                        if (victimSSN === -1) {
                            DFAmessage += "disk space full, unable to write evicted page in disk\n";
                        }
                        // else write to new page
                        else {
                            disk.setPage(victimSSN, physMem.getPage(PPN));
                            // updating msg state
                            // updating msg state
                            DFAmessage += "updating evicted page's page table entry with its new location in disk\n";
                            DFAmessage += "swap space number: " + victimSSN + "\n";

                            DFAmessage += "invalidate evicted page's entry within TLB if applicable\n";
                            let evictedPerm = pt.getPagePermissions(victimVPN);
                            evictedPerm.V = 0;
                            evictedPerm.D = 0;
                            // update PT perm
                            pt.setPTE(victimVPN, victimSSN, true, evictedPerm);
                            // update TLB perm DOESNT WORK since it adds a new one
                            tlb.invalidateEntry(victimVPN);
                        }
                    }

                    // bring target page into physMem
                    physMem.setPage(PPN, VPN, disk.getPage(SSN));

                    // get correct management bit permissions for newly brought in page
                    let evictingPerm = pt.getPagePermissions(VPN);
                    evictingPerm.V = 1;

                    /**
                     * @todo convert embeded messages to use hex
                     */

                    // update msg state
                    DFAmessage += "updating brought in page's page table entry with its new location in physical memory\n";
                    DFAmessage += "PPN: " + PPN + "\n";

                    // update PT for newly brought in page
                    pt.setPTE(VPN, PPN, false, evictingPerm);
                }

                DFAmessage += "restarting page-faulting instruction\n"
                // add separating borders
                DFAmessage += "------------------------------------------------\n";
                // flush to msg box
                msgbox.value(DFAmessage);

                state = READY;
                if (!explain) readWriteDFA(writing, addr, data);
                break;
            default:
                alert("default case");
        }
    }

    /**
     * handles reading from VM upon user request to read at a given address
     */
    function readVM() {
        let addr = parseInt(inReadAddr.value(), 16);
        let data = 0;  // we are not writing so data is irrelevant 
        readWriteDFA(false, addr, data);
    }

    /**
     * handles writing to VM upon user request to write at a given address
     */
    function writeVM() {
        let addr = parseInt(inWriteAddr.value(), 16);
        let data = parseInt(inWriteData.value(), 16);
        readWriteDFA(true, addr, data);
    }

    /**
     * handles user allocating a new virtual page at the given VPN. 
     * Prioritize unused PM pages first before populating swap space.
     * If disk is full, no page will be allocated.
     * @param {*} VPN virtual page number of the page user is allocating
     */
    function handleVPAllocation(VPN) {
        let perm = getPermForVPN(VPN);	// get management bit permission for this VA

        // if current page not already allocated
        if (pt.getPPN(VPN) === null && pt.getSSN(VPN) === null) {
            virMem.allocatePage(VPN);
            let PPN = physMem.findUnusedPage();

            if (PPN !== -1) {
                perm.V = 1;		// this page is in memory

                physMem.allocatePage(PPN, VPN);
                pt.setPTE(VPN, PPN, false, perm);
            } else {
                let SSN = disk.allocatePage();
                if (SSN === -1) {
                    console.log("out of disk space");
                    return;
                }
                pt.setPTE(VPN, SSN, true, perm);
            }

            let newAccess = new MemAccess();
            newAccess.type = 'A';
            newAccess.addr = VPN;
            pushToHist(newAccess);
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
        if (0 <= percentage && percentage <= 0.2) {
            perm = {
                V: 0,
                D: 0,
                R: 1,
                W: 0,
                E: 0
            }
        }
        // read write segment
        else if (0.2 < percentage && percentage <= 0.4) {
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
                    histMsg += 'Allocate VPN: ' + toBase(histArray[i].addr, 16, 2) + '\n';
                    break;
                case 'W':
                    histMsg += 'W(0x' + toBase(histArray[i].addr, 16, 2) + ', 0x' +
                        toBase(histArray[i].data, 16, 2) + ') = ' +
                        "tlb: " + histArray[i].tlbRes + ", " +
                        "pt: " + histArray[i].ptRes + ", " +
                        "final res: " + histArray[i].fRes + '\n';
                    break;
                case 'R':
                    histMsg += 'R(0x' + toBase(histArray[i].addr, 16, 2) + ') = ' +
                        "tlb: " + histArray[i].tlbRes + ", " +
                        "pt: " + histArray[i].ptRes + ", " +
                        "final res: " + histArray[i].fRes + '\n';
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
        histIndex = p.max(0, histIndex - 1);
        updateHist();
    }

    /**
     * move hist cursor down
     */
    function histDown() {
        histIndex = p.min(histArray.length - 1, histIndex + 1);
        updateHist();
    }

    function loadHist() {
        // flush current tables
        flush();
        // update current hist upto histIndex
        let tempHist = histArray.slice(0, histIndex + 1);
        // reset histIndex since the calls will increment it
        histIndex = -1;

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
        histArray = tempHist;
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
    if (!userInteracting) {
        userInteracting = componentId;
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