import { PhysicalMemory } from "./PhysicalMemory.js";
import { VirtualMemory } from "./VirtualMemory.js";
import { VScrollbar } from "./VScrollbar.js";
import { TLB } from "./TLB.js";
import { scrollSize, dampening, scaleM, scaleC } from "./Constants.js";
import { TLBDisplayHeight, PTDisplayHeight, DiskDisplayHeight } from "./Constants.js";
// import { INIT, PARAMS_PHYS_MEM, PARAMS_VIR_MEM, PARAMS_TLB, PARAMS_PT, PARAMS_DISK } from "./Constants.js";
import { PT } from "./PageTable.js";
import { bounded } from "./HelperFunctions.js";
import { Disk } from "./Disk.js";


let canvas, diagramCanvas;
let inAddrWidth, inPgSize, inTlbSize, inTlbE, inPhysMemSize; // system param input
let inReadAddr, inWriteAddr, inWriteData; // mem access param input

let dispPTSize, dispVMSize; // system param display
let ptSize, vmSize; // sys param calculated values

// colors
export let bg, colorC, colorH, colorM;
export let colorG, colorB, colorW;

// System parameters
let m, PPNWidth, E, TLBSize, pgSize, physMemSize, POwidth;
let VM = true;

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
var paramBox;
var explain;
var mmaBox;


let msg = ""; // canvas message

// state variables and constants
let state;
const INIT = 0, PARAMS_PHYS_MEM = 1, PARAMS_VIR_MEM = 2, PARAMS_TLB = 3;
const PARAMS_PT = 4, PARAMS_DISK = 5;
const READY = 6, CHECK_TLB = 7;
const PROTECTION_CHECK = 8, PHYSICAL_PAGE_ACCESS = 9;
const CHECK_PAGE_TABLE = 10, UPDATE_TLB = 11, PAGE_FAULT = 12;



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
		dispPTSize = p.select("#ptSize");
		dispVMSize = p.select("#vmSize");
		inReadAddr = p.select("#rAddr");
		inWriteAddr = p.select("#wAddr");
		inWriteData = p.select("#wData");

		// setup system control buttons
		paramButton = p.select("#paramButton");
		paramButton.mousePressed(changeParams);
    paramBox = p.select("#paramBox");
		readButton = p.select("#readButton");
		readButton.mousePressed(readVM);
		writeButton = p.select("#writeButton");
		writeButton.mousePressed(writeVM);
    mmaBox = p.select("#mmaBox");

		// setup scroll bar
		vbarPhysMem = new VScrollbar(p, p.width - scrollSize - 350, 0, scrollSize, p.height, dampening);
		vbarVirMem = new VScrollbar(p, p.width - scrollSize, 0, scrollSize, p.height, dampening);
		vbarDisk = new VScrollbar(p, p.width - scrollSize, 0, scrollSize, p.height, dampening);
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
      explain = paramBox.checked();
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

					// msgbox.value("Press Next (left) to advance explanation.\n");
					state = PARAMS_PHYS_MEM;
					if (!histMove && explain) break;
				case PARAMS_PHYS_MEM:
					virMem = new VirtualMemory(p, m, POwidth, vbarVirMem);

					// reset memory scroll bar
					vbarVirMemEnable = (virMem.Mtop + virMem.Mheight > p.height);
					vbarVirMem.spos = vbarVirMem.ypos;
					vbarVirMem.newspos = vbarVirMem.ypos;

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
					pt = new PT(p, vbarPT, m, PPNWidth, POwidth);
					// reset cache scroll bar
					vbarPTEnable = (pt.PTtop + pt.PTheight > PTDisplayHeight);
					vbarPT.spos = vbarPT.ypos;
					vbarPT.newspos = vbarPT.ypos;
					state = PARAMS_PT;
					if (!histMove && explain) break;
				case PARAMS_PT:
					disk = new Disk(p, m, pgSize, vbarDisk);

					// reset Disk scroll bar
					vbarDiskEnable = (disk.Dtop + disk.Dheight > p.height);
					vbarDisk.spos = vbarDisk.ypos;
					vbarDisk.newspos = vbarDisk.ypos;

					state = PARAMS_DISK;
					if (!histMove && explain) break;
				case PARAMS_DISK:
					/**
					 * @TODO fix
					 */
           paramButton.attribute('value', 'Reset System');
					state = READY;
			}
		}
	}

	var addr;
	var data;
	var VPN;
	var PO;
	var PPNRes;
	var PPN;

	/**
	 * DFA that handles the address translation 
	 * @param {*} writing set to true if writing, false if reading
	 * 
	 */
	function readWriteDFA(writing) {
		explain = mmaBox.checked();

		switch (state) {
			case READY:
				console.log("ready");
				if (writing) {
					addr = parseInt(inWriteAddr.value(), 16);
					data = parseInt(inWriteData.value(), 16);
				} else {
					addr = parseInt(inReadAddr.value(), 16);
					data = 0;  // we are not writing so data is irrelevant 
				}

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

        if (writing) {
          writeButton.attribute('value', 'next');
        } else {
          readButton.attribute('value', 'next');
        }


				// this is how the DFA works, set next state and call again to trigger state code.
				state = CHECK_TLB;
				if (!explain) readWriteDFA(writing);
				break;
			case CHECK_TLB:
				console.log("check tlb");
				// check if address is in TLB
				console.log("VPN: " + VPN);
				PPN = tlb.getPPN(true, VPN);
				console.log("PPN: " + PPN);


				if (PPN === -1) {
					// TLB miss
					state = CHECK_PAGE_TABLE;
				} else {
					// TLB hit
					state = PROTECTION_CHECK;
				}
				if (!explain) readWriteDFA(writing);
				break;
			case PROTECTION_CHECK:
				console.log("pro check");
				/**
				 * @todo implement PTE bit check
				 */
				state = PHYSICAL_PAGE_ACCESS;
				if (!explain) readWriteDFA(writing);
				break;
			case PHYSICAL_PAGE_ACCESS:
				console.log("PP access");
				if (writing) {
					console.log("writing");
					// access and write to physical memory with PPN
					physMem.writeToPage(PPN, PO, data);
				} else {
					console.log("reading");
					// read
				}

        if (writing) {
          writeButton.attribute('value', 'Write');
        } else {
          readButton.attribute('value', 'Read');
        }


				// done so we don't call again 
				state = READY;
				break;
			case CHECK_PAGE_TABLE:
				console.log("check PT");
				PPNRes = pt.getPPN(true, VPN);  // PPN result from PT
				if (PPNRes === null) {
					// page table miss
					state = PAGE_FAULT;
				} else {
					// page table hit
					state = UPDATE_TLB;
				}
				if (!explain) readWriteDFA(writing);
				break;
			case UPDATE_TLB:
				console.log("update tlb");
				// get the PPN from page table result
				PPN = PPNRes[0];
				let dirty = PPNRes[1];

				// update tlb
				tlb.setEntry(VPN, pt.getPagePermissions(VPN), PPN);
				state = PROTECTION_CHECK;
				if (!explain) readWriteDFA(writing);
				break;
			case PAGE_FAULT:
				console.log("page fault");

				let SSNRes = pt.getSSN(writing, VPN);

				// page not found in disk
				if (SSNRes === null) {
					console.log("segfault");
					return;
				}
				// page found in disk
				else {
					let [SSN, dirty] = SSNRes;
					// bring this page into mem
					let [PPN, victimVPN] = swapPageFromDiskToMem(SSN, VPN);
					
					// get correct management bit permissions for newly brought in page
					let evictingPerm = pt.getPagePermissions(VPN);
					evictingPerm.V = 1;

					// if victim is in the current process and is dirty, update its PTE
					if(victimVPN !== -1 && pt.getDirty(victimVPN)) {
						let evictedPerm = pt.getPagePermissions(victimVPN);
						evictedPerm.V = 0;
						evictedPerm.D = 0;
						pt.setPTE(victimVPN, SSN, true, evictedPerm);
					}

					// update PT for newly brought in page
					pt.setPTE(VPN, PPN, false, evictingPerm);
				}

				state = READY;
				if (!explain) readWriteDFA(writing);
				break;
			default:
				alert("default case");
		}
	}

	/**
	 * handles reading from VM upon user request to read at a given address
	 */
	function readVM() {
		readWriteDFA(false);
	}

	/**
	 * handles writing to VM upon user request to write at a given address
	 */
	function writeVM() {
		readWriteDFA(true);
	}

	/**
	 * handles user allocating a new virtual page at the given VPN. 
	 * Prioritize unused PM pages first before populating swap space.
	 * @param {*} VPN virtual page number of the page user is allocating
	 */
	function handleVPAllocation(VPN) {
		let perm = getPermForVPN(VPN);	// get management bit permission for this VA

		// if current page not already allocated
		if (pt.getPPN(perm.W, VPN) === null && pt.getSSN(perm.W, VPN) === null) {
			virMem.allocatePage(VPN);
			let PPN = physMem.findUnusedPage();

			if (PPN !== -1) {
				perm.V = 1;		// this page is in memory

				physMem.allocatePage(PPN, VPN);
				pt.setPTE(VPN, PPN, false, perm);
			} else {
				let SSN = disk.allocatePage();
				pt.setPTE(VPN, SSN, true, perm);
			}
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
		if(0 <= percentage &&percentage <= 0.2) {
			perm = {
				V: 0,
				D: 0,
				R: 1,
				W: 0,
				E: 0
			}
		}
		// read write segment
		else if(0.2 < percentage && percentage <= 0.4) {
			perm = {
				V: 0,
				D: 0,
				R: 1,
				W: 1,
				E: 0
			}
		}
		// shared heap/stack space
		else if(0.4 < percentage && percentage <= 1) {
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
			}
			else if (bounded(p.mouseX, virMem.x + virMem.Mwidth * 0.6, virMem.x + virMem.Mwidth)) {
				VM = false;
			}
		}
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