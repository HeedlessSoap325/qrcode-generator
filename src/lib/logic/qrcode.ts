/*
	This Code is mostely based on multiple sources and helpful pages, listed below:
		- ISO: https://www.arscreatio.com/repositorio/images/n_23/SC031-N-1915-18004Text.pdf
		- https://perthirtysix.com/how-the-heck-do-qr-codes-work
		- https://www.thonky.com/qr-code-tutorial
		- https://en.wikipedia.org/wiki/BCH_code#Systematic_encoding:_The_message_as_a_prefix
*/

import capacitiesFile from "$lib/data/capacities.json";
import structuringFile from "$lib/data/structuring.json";

type QRCode = number[];

export type QRCodeErrorCorrection = "L" | "M" | "Q" | "H";

type QRCodeEncoding = "byte" | "numeric" | "alphanumeric";

type QRCodePoly = number[];

interface QrCodeInfo {
	version: number,
	encoding: QRCodeEncoding,
	limit: number,
	errorCorrection: QRCodeErrorCorrection,
	maxCodewords: number,
	dimensions: number,
};

interface QRCapacity {
	numeric: number,
	alphanumeric: number,
	byte: number,
	maxCodewords: number,
};

type QRErrorLevels = Record<QRCodeErrorCorrection, QRCapacity>;

type QRCapacities = Record<string, QRErrorLevels>;


interface QRStructure {
	ECperBlock: number,
	numBlocksGroup1: number,
	numCodewordsInGroup1Blocks: number,
	numBlocksGroup2?: number,
	numCodewordsInGroup2Blocks?: number,
};

type QRStructuring = Record<string, QRStructure>;

const capacities = capacitiesFile as QRCapacities;
const structuring = structuringFile as QRStructuring;

const PIXELSIZE = 8;

const MODULE_BLACK_FLAG 	= 0b1;
const MODULE_FINDER_FLAG 	= 0b10;
const MODULE_TIMING_FLAG	= 0b100;
const MODULE_ALIGNMENT_FLAG = 0b1000;
const MODULE_FORMAT_FLAG	= 0b10000;
const MODULE_DATA_FLAG 		= 0b100000;

const FUNCTION_PATTERN = MODULE_FINDER_FLAG | MODULE_TIMING_FLAG | MODULE_ALIGNMENT_FLAG;
const ENCODEING_REGION = MODULE_DATA_FLAG | MODULE_FORMAT_FLAG;
const RESERVED_MODULE  = FUNCTION_PATTERN | MODULE_FORMAT_FLAG;	 

const FORMAT_INFORMATION_MASK 		= 0b101010000010010;
const FORMAT_INFORMATION_GENERATOR 	= [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1];
const VERSION_INFORMATION_GENERATOR = [1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1];


const FINDER_PATTERN = [
	1, 1, 1, 1, 1, 1, 1,
	1, 0, 0, 0, 0, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 0, 0, 0, 0, 1,
	1, 1, 1, 1, 1, 1, 1,
];

const ALIGNMENT_PATTERN = [
	1, 1, 1, 1, 1,
	1, 0, 0, 0, 1,
	1, 0, 1, 0, 1,
	1, 0, 0, 0, 1,
	1, 1, 1, 1, 1,
];

const DATA_EXTENSION_1 			= [1, 1, 1, 0, 1, 1, 0, 0];
const DATA_EXTENSION_2 			= [0, 0, 0, 1, 0, 0, 0, 1];
const ALPHANUMERIC_LOOKUP_TABLE = [
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", 
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", 
	" ", "$", "%", "*", "+", "-", ".", "/", ":"
];

function intToBitsFixed(n: number, length: number): number[] {
    if (n < 0) {
        throw new Error("Only non-negative integers supported");
    }

    const max = 1 << length;
    if (n >= max) {
        throw new Error(`Number ${n} does not fit in ${length} bits`);
    }

    const bits = new Array(length);

    for (let i = length - 1; i >= 0; i--) {
        bits[i] = n & 1;
        n >>= 1;
    }

    return bits;
}

function bitsToInt(bits: number[]): number {
    return parseInt(bits.join(''), 2);
}

function mod2Division(dividend: number[], divisor: number[]): number[] {
    let remainder = dividend.slice();
    for (let i = 0; i <= remainder.length - divisor.length; i++) {
        if (remainder[i] === 1) {
            for (let j = 0; j < divisor.length; j++) {
                remainder[i + j] ^= divisor[j];
            }
        }
    }
    return remainder.slice(-(divisor.length - 1));
}

/*
	Set the values in the Rectangle, starting at x and y, to the given data.
	data = [1, 0, 0, 1, 0, 1, 0, 1, 1], with w=3 & h=3 and x=1, y=2 will set:
		y: 2, x: 1 to 1
		y: 2, x: 2 to 0
		y: 2, x: 3 to 0
		y: 3, x: 1 to 1
		y: 3, x: 2 to 0
		y: 3, x: 3 to 1
		y: 4, x: 1 to 0
		y: 4, x: 2 to 1
		y: 4, x: 3 to 1
*/
function setQrCodeArea(qrcode: QRCode, qrcodeDimensions: number, x: number, y: number, w: number, h: number, data: number[], flags: number = 0): void {
	if (data.length < (w * h)) {
		console.error(`setQrCodeArea: length of data (${data.length}) is less than expected (${w * h})`);
		return;
	}

	for (let it = 0; it < (w * h); it++) {
		const rowOffset = Math.floor(it / w);
		const colOffset = it % w;
		const index = (y + rowOffset) * qrcodeDimensions + (x + colOffset);

		if (qrcode[index] & FUNCTION_PATTERN) {
			console.warn(`setQrCodeArea: Function tried setting a module (x=${x + colOffset}, y=${y + rowOffset}) reserved by a function pattern to ${data[it]}`);
		} else {
			const color = data[it] === 0 ? 0 : 1;
			qrcode[index] = color | flags;
		}
	}
}

// Source - https://stackoverflow.com/a/73349304
// Posted by YourMJK, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-18, License - CC BY-SA 4.0
function setAlignmentPatterns(qrcode: QRCode, info: QrCodeInfo): void {
    if (info.version <= 1) return;
	let coordinates = [];
    let intervals = Math.floor((info.version / 7)) + 1;  // Number of gaps between alignment patterns
    let distance = 4 * info.version + 4;  // Distance between first and last alignment pattern
    let step = Math.round(distance / intervals);  // Round equal spacing to nearest integer
    step = 2 * Math.round(step / 2);;  // Round step to next even number
    coordinates[0] = 6;  // First coordinate is always 6 (can't be calculated with step)
    for (let i = 1; i <= intervals; i++) {
        coordinates[i] = 6 + distance - step * (intervals - i);  // Start right/bottom and go left/up by step*k
    }

	const allPairs = coordinates.flatMap(a => coordinates.map(b => [a, b])); // Cartesian product of the coordinates wit itself
	
	for (let it = 0; it < ((intervals + 1) * (intervals + 1)); it++) {
		const x = allPairs[it][0]; // Center x
		const y = allPairs[it][1]; // Center y
		if (((x - 2) < 8 && ((y - 2) < 8 || (y + 2) > (info.dimensions - 8 - 1))) || ((x + 2) > (info.dimensions - 8 - 1) && (y - 2) < 8)) continue; // Don't place inside finder Patterns
		setQrCodeArea(qrcode, info.dimensions, x - 2, y - 2, 5, 5, ALIGNMENT_PATTERN, MODULE_ALIGNMENT_FLAG);
	}
}

function determinEncoding(text: string): QRCodeEncoding {
	if (/^[0-9]+$/.test(text)) {
		return "numeric";
	} else if (/^[0-9A-Z \$%\*\+\-\.\/:]+$/.test(text)) {
		return "alphanumeric";
	} else {
		return "byte";
	}
}

function determinQRCodeInfo(input: string, errorCorrection: QRCodeErrorCorrection): QrCodeInfo {
	const encoding = determinEncoding(input);

	for(let i = 1; i <= 40; i++) {
		const limit = capacities[`${i}`][errorCorrection][encoding];
		const maxCodewords = capacities[`${i}`][errorCorrection]["maxCodewords"];
		const dimensions = 21 + ((i - 1) * 4);
		if(limit >= input.length || i === 40) {
			return {
				version: i,
				encoding,
				limit,
				errorCorrection,
				maxCodewords,
				dimensions,
			};
		}
	}

	throw new Error("Unreachable");
}

/*
	encode the data in input, based on the encoding mode.
	returns a list, which contains each codeword(8 bit, most significant bit first) as a list.
	return = [
		[0,0,0,1,0,0,0,0], //mode indicator + 4 most significat bits of character count indicator
		[0,0,1,0,0,0,0,0], //character count indicator + 2 most significant bits of the first data segment
		[0,0,0,0,1,1,0,0], //data
		[0,1,0,1,0,1,1,0],
		[0,1,1,0,0,0,0,1],
		...
	]
*/
function encodeData(info: QrCodeInfo, input: string): number[] {
	// Version    Numeric   Alphanumeric   byte
	// 1  to 9    10        9              8
	// 10 to 26   12        11             16
	// 27 to 40   14        13             16
	let data = input;
	if (info.limit > input.length) {
		data = input.slice(0, info.limit);
	}

	let ret: number[] = [];

	if(info.encoding === "numeric") {
		const mode 	= intToBitsFixed(1, 4); // 0001 is the mode indicator for numbers
		let countLen = 10; // See table above
		if(info.version >= 10) countLen = 12;
		if(info.version >= 27) countLen = 14;
		const len 	= intToBitsFixed(data.length, countLen); // character count indicator must be countLen bits long
		const parts = data.match(/.{1,3}/g) || []; // split data stream every 3 characters

		ret = [...ret, ...mode, ...len];

		parts.forEach(part => {
			const num = parseInt(part, 10);
			let len = 10;
			if(part.length === 1) len = 4;
			else if (part.length === 2) len = 7;

			const bin = intToBitsFixed(num, len);
			ret = [...ret, ...bin];
		});
	} else if(info.encoding === "alphanumeric") {
		const mode 	= intToBitsFixed(2, 4); // 0010 is the mode indicator for numbers
		let countLen = 9; // See table above
		if(info.version >= 10) countLen = 11;
		if(info.version >= 27) countLen = 13;
		const len 	= intToBitsFixed(data.length, countLen); // character count indicator must be countLen bits long
		const parts = data.match(/.{1,2}/g) || []; // split data stream every 3 characters

		ret = [...ret, ...mode, ...len];

		parts.forEach(part => {
			if(part.length === 1) {
				const charValue = ALPHANUMERIC_LOOKUP_TABLE.indexOf(part);
				const bin 		= intToBitsFixed(charValue, 6);

				ret = [...ret, ...bin];
			} else { //part.length === 2
				const char1Value = ALPHANUMERIC_LOOKUP_TABLE.indexOf(part[0]);
				const char2Value = ALPHANUMERIC_LOOKUP_TABLE.indexOf(part[1]);
				const num 		 = (ALPHANUMERIC_LOOKUP_TABLE.length * char1Value)+ char2Value;
				const bin 		 = intToBitsFixed(num, 11);

				ret = [...ret, ...bin];
			}
		});
	} else { // info.encodeing === "byte"
		const mode 	= intToBitsFixed(4, 4); // 0100 is the mode indicator for numbers
		let countLen = 8; // See table above
		if(info.version >= 10) countLen = 16;
		const len 	= intToBitsFixed(data.length, countLen); // character count indicator must be countLen bits long

		ret = [...ret, ...mode, ...len];

		for(let it = 0; it < data.length; it++) {
			const num = data.charCodeAt(it); // Convert to ascii code
			const bin = intToBitsFixed(num, 8);

			ret = [...ret, ...bin];
		}
	}
	const remainingBits = info.maxCodewords * 8 - ret.length;
	const terminatorLen = Math.min(4, remainingBits); // Terminator is max. 4 Bits of 0s
	ret = [...ret, ...Array(terminatorLen).fill(0)];

	const padLen = (8 - (ret.length % 8)) % 8; // Codewords are 8 Bit long
	const pad = intToBitsFixed(0, padLen);
	ret = [...ret, ...pad]; // The Bit stream must be padded, so that the Extension boundaries allign with the codeword boundaries

	const numCodewords = ret.length / 8; //This should be an integer
	for(let it = 0; it < (info.maxCodewords - numCodewords); it++) {
		if (it % 2 === 0) { // Alternate extension codewords
			ret = [...ret, ...DATA_EXTENSION_1]; // Extend with 236, as specified in ISO
		} else {
			ret = [...ret, ...DATA_EXTENSION_2]; // Extend with 17, as specified in ISO
		}
	}
	return ret;
}

function generateEC(data: number[], numEcCodewords: number): number[] {
	const EXP = new Array(512); // int to exponent
	const LOG = new Array(256); // exponent to int

	function initGF() {
		let x = 1;

        for (let i = 0; i < 255; i++) {
            EXP[i] = x;
            LOG[x] = i;
            x <<= 1; // next power of 2
            if (x & 0x100) { // if greater than 256
                x ^= 0x11d; // mod 285 (see ISO QR-Code specification)
            }
        }

        for (let i = 255; i < 512; i++) {
            EXP[i] = EXP[i - 255]; // map values >= 255 to mod 255
        }
	}

	/*
		Multiply two powers of alpha
	*/
	function multiplyGF(a: number, b: number): number {
		if (a === 0 || b === 0) return 0;
		return EXP[LOG[a] + LOG[b]]; // Multiplication with Logs and Antilogs
	}

	function multiplyPolynomial(poly1: QRCodePoly, poly2: QRCodePoly): QRCodePoly {
		const result = new Array(poly1.length + poly2.length - 1).fill(0);

		// Multiply each coefficient in poly1, with each coefficient of poly2
		for (let i = 0; i < poly1.length; i++ ) {
			for (let j = 0; j < poly2.length; j++) {
				result[i + j] ^= multiplyGF(poly1[i], poly2[j]); // multiply alpha exponents safely and set result
			}
		}
		return result;
	}

	function dividePolynomial(poly1: QRCodePoly, poly2: QRCodePoly): QRCodePoly {
        const result = poly1.slice();

        for (let i = 0; i < (poly1.length - poly2.length + 1); i++) {
            const coef = result[i]; // Get current coefficient 
            if (coef !== 0) {
                for (let j = 0; j < poly2.length; j++) {
                    result[i + j] ^= multiplyGF(poly2[j], coef); // Effectively multiply poly1 by 1/coef
                }
            }
        }
        return result.slice(result.length - (poly2.length - 1));
    }


	function generateGeneratorPolynomial(degree: number): QRCodePoly {
		let poly = [1]; // start polynomial is (1x - a^0) (1 in alpha notation is 0, so 1x is irrelevant)
		for (let i = 0; i < degree; i++) {
			poly = multiplyPolynomial(poly, [1, EXP[i]]); // Multiply by (1x - a^i)
		}
		return poly;
	}

	// EC Codeword Generation
	initGF();

	const generator = generateGeneratorPolynomial(numEcCodewords);
	
	// shift message polynomial numEcCodewords times to the left.
	const paddedData = data.concat(new Array(numEcCodewords).fill(0));

	const remainder = dividePolynomial(paddedData, generator);

	return remainder;
}

function structureData(info: QrCodeInfo, input: string): number[] {
	// TODO: this Function doesn't work like it should, the Data should be divided into blocks
	// TODO: these blocks should each generate EC, and then be ordered very specifically.
	const rawData = encodeData(info, input);

	const structure = structuring[`${info.version}-${info.errorCorrection}`];

	// blockLengths will contain the number of integers, each block should contain
	let blockLengths = Array(structure["numBlocksGroup1"]).fill(structure["numCodewordsInGroup1Blocks"]);

	if (structure.hasOwnProperty("numBlocksGroup2")) {
		const arr = Array(structure["numBlocksGroup2"]).fill(structure["numCodewordsInGroup2Blocks"]);
		blockLengths = [...blockLengths, ...arr] ;
	}

	// Convert from bits to integers
	const codewords: number[] = [];
	for (let i = 0; i < (rawData.length / 8); i++) {
		const num = bitsToInt(rawData.slice((i * 8), ((i + 1) * 8)));
		codewords.push(num);
	}

	// Split Data Codewords according to blockLengths
	let start = 0;
	const dataBlocks = blockLengths.map(len => {
		const chunk = codewords.slice(start, start + len);
		start += len;
		return chunk;
	});

	const numEcCodewords = structure["ECperBlock"];

	// Generate EC Blocks with data of each Data Block
	const ecBlocks = [];
	for (let it = 0; it < dataBlocks.length; it++) {
		const errorCorrection = generateEC(dataBlocks[it], numEcCodewords);
		ecBlocks.push(errorCorrection);
	}

	let structuredData: number[] = [];

	// Place Data Codewords (see ISO)
	for (let col = 0; col < Math.max(...blockLengths); col++) {
		for (let row = 0; row < dataBlocks.length; row++) {
			if (dataBlocks[row].length > col) {
				structuredData = [...structuredData, ...intToBitsFixed(dataBlocks[row][col], 8)];
			}
		}
	}

	// Place EC Codewords (see ISO)
	for (let col = 0; col < numEcCodewords; col++) {
		for (let row = 0; row < dataBlocks.length; row++) {
			structuredData = [...structuredData, ...intToBitsFixed(ecBlocks[row][col], 8)];
		}
	}
	
	return structuredData;
}

function generateBCH(data: number, dataLen: number, totalLen: number, generator: number[], mask: number): number {
	let ret = 0;
	ret = data << (totalLen - dataLen); // shift left (totalLen - dataLen) bits

    // Convert to bit array (totalLen bits total)
    let dividend = intToBitsFixed(ret, totalLen);

    let remainder = mod2Division(dividend, generator); // Compute remainder
    let remainderInt = bitsToInt(remainder); // Convert remainder to integer

    ret |= remainderInt; // Merge remainder
    ret ^= mask; // Apply mask

	return ret;
}

function setFormatInformation(qrcode: QRCode, info: QrCodeInfo, maskIndex: number): void {
	let data = 0b0;

	if (maskIndex < 0 || maskIndex > 7) {
		console.error("setFormatInformation: supplied invalide maskIndex, must be from 0 to 7");
		return;
	}

	if(info.errorCorrection === "M") data = 0b00 << 3
	else if(info.errorCorrection === "L") data = 0b01 << 3
	else if(info.errorCorrection === "H") data = 0b10 << 3
	else if(info.errorCorrection === "Q") data = 0b11 << 3
	else {
		console.error("setFormatInformation: supplied invalide errorCorrection, is not M | L | H | Q");
		return;
	}
	data = generateBCH(data |= maskIndex, 5, 15, FORMAT_INFORMATION_GENERATOR, FORMAT_INFORMATION_MASK);

    const format = intToBitsFixed(data, 15); // Final 15-bit format string
	const format1 = format.slice(0, 8);
	format1.splice(6, 0, 1);
	const format2 = format.slice(7, 15).reverse()
	format2.splice(6, 0, 1);

	setQrCodeArea(qrcode, info.dimensions, 0, 8, 9, 1, format1, MODULE_FORMAT_FLAG); // Left to right
	setQrCodeArea(qrcode, info.dimensions, 8, 0, 1, 8, format2, MODULE_FORMAT_FLAG); // Top to bottom

	const format3 = format.slice(0, 7).reverse();
	format3.splice(0, 0, 1);
	const format4 = format.slice(7, 15);
	setQrCodeArea(qrcode, info.dimensions, 8, (info.dimensions - 8), 1, 8, format3, MODULE_FORMAT_FLAG); // Top to bottom
	setQrCodeArea(qrcode, info.dimensions, (info.dimensions - 8), 8, 8, 1, format4, MODULE_FORMAT_FLAG); // Left to right


	if(info.version > 6) { // Version Information is required for all QR codes over version 6
		let versionInfo: number | number[] = generateBCH(info.version, 6, 18, VERSION_INFORMATION_GENERATOR, 0);
		versionInfo = intToBitsFixed(versionInfo, 18); // Final 18-bit version string
		versionInfo = versionInfo.reverse(); // Least significant Bit first

		// Tanspose
		const data1 = new Array(versionInfo.length);
		for (let i = 0; i < versionInfo.length; i++) {
			data1[(i % 3) * 6 + Math.floor(i / 3)] = versionInfo[i];
		}

		setQrCodeArea(qrcode, info.dimensions, (info.dimensions - 11), 0, 3, 6, versionInfo, MODULE_FORMAT_FLAG); //Top right
		setQrCodeArea(qrcode, info.dimensions, 0, (info.dimensions - 11), 6, 3, data1, MODULE_FORMAT_FLAG); //Bottom left
	}
}

function placeDataInQrCode(qrcode: QRCode, info: QrCodeInfo, data: number[]): void {
	let dataIdx = 0;
	let encounteredTimingPattern = false;

	for(let currentCol = 0; currentCol < info.dimensions; currentCol += 2) {
		for(let rowIter = 0; rowIter < info.dimensions; rowIter++) {
			if (currentCol === (info.dimensions - 7)) {
				encounteredTimingPattern = true;
				currentCol++;
			}

			const dir = ((currentCol - (encounteredTimingPattern ? 1 : 0)) / 2) % 2; // 0 = upwards, 1 = downwards
			const currentRow = (dir === 0 ? rowIter : (info.dimensions - rowIter - 1));
			const qrX = (info.dimensions - currentCol - 1);
			const qrY = (info.dimensions - currentRow - 1);

			if (!(qrcode[(qrY * info.dimensions) + qrX] & RESERVED_MODULE)) {
				setQrCodeArea(qrcode, info.dimensions, qrX, qrY, 1, 1, [data[dataIdx]], MODULE_DATA_FLAG);
				dataIdx++;
			}
			if (!(qrcode[(qrY * info.dimensions) + qrX - 1] & RESERVED_MODULE)) {
				setQrCodeArea(qrcode, info.dimensions, qrX - 1, qrY, 1, 1, [data[dataIdx]], MODULE_DATA_FLAG);
				dataIdx++;
			}
			
			if (dataIdx >= data.length) break;
		}
		if (dataIdx >= data.length) break;
	}
}

function maskQrCode(qrcode: QRCode, info: QrCodeInfo, maskIndex: number): void {
	if (maskIndex < 0 || maskIndex > 7) {
		console.error(`maskQrCode: invalid maskindex (${maskIndex}) provided. Must be from 0 to 7`);
		return;
	}

	for (let i = 0; i < info.dimensions; i++) {
		for (let j = 0; j < info.dimensions; j++) {
			const qrIndex = (j * info.dimensions) + i;
			if (qrcode[qrIndex] & RESERVED_MODULE) continue;

			let res = 0;
			switch (maskIndex) {
				case 0: res = (i + j) % 2; 									break;
				case 1: res = j % 2; /* ISO specified i%2 (wrong pattern) */break;
				case 2: res = i % 3; /* ISO specified j%3 (wrong pattern) */break;
				case 3: res = (i + j) % 3;									break;
				case 4: res = (Math.floor(i / 3) + Math.floor(j / 2)) % 2;	break;
				case 5: res = (i * j) % 2 + (i * j) % 3; 					break;
				case 6: res = ((i * j) % 2 + (i * j) % 3) % 2; 				break;
				case 7: res = ((i + /* not '*' */ j) % 2 + (i * j) % 3) % 2;break;
			}

			if (res == 0) qrcode[qrIndex] ^= 1;
		}
	}
}

function evaluateMaskScore(qrcode: QRCode, info: QrCodeInfo): number {
	function get(y: number, x: number) { return qrcode[y * info.dimensions + x] & MODULE_BLACK_FLAG; }
	let score = 0;

	// Rule 1
	function scan(map: (r: number, c: number) => [number, number]) { // map is a function, mapping i and j to x and y
		for (let i = 0; i < info.dimensions; i++) {
			let run = 1;
			for (let j = 1; j < info.dimensions; j++) {
				if (get(...map(i, j)) === get(...map(i, j-1))) { // check adjacent modules
					run++;
				} else {
					if (run >= 5) score += 3 + run - 5; // Add penalty of N1 (3) + i (run - 5)
					run = 1;
				}
			}
			if (run >= 5) score += 3 + run - 5; // Add penalty of N1 (3) + i (run - 5)
		}
	}

	scan((r, c)=>[r, c]); // rows (normal)
	scan((c, r)=>[r, c]); // columns (flip rows and columns)

	// Rule 2
	for (let r = 0; r < (info.dimensions - 1); r++) {
		for (let c = 0; c < (info.dimensions - 1); c++) {
			/* 
				Chech for 2x2 blocks
				ISO specifies the penalty of a block of m*n should be N2(3) * (m - 1) * (n - 1) 
				By always checking to the right and bottom, we effectively ignore one col and row of the block, achieving the same result
			*/
			const v = get(r, c);
			if (v === get(r, c + 1) && v ===get(r + 1, c) && v === get(r + 1, c + 1)) score += 3; 
		}
	}

	// Rule 3
	const pattern = [1,0,1,1,1,0,1,0,0,0,0];

	function check(map: (r: number, c: number) => [number, number]) { // map is a function, mapping i and j to x and y
		for (let i = 0; i < info.dimensions; i++) {
			for (let j = 0; j <= (info.dimensions - 11); j++){
				let k = 0;
				for (; k < 11 && get(...map(i, j + k)) === pattern[k]; k++); // Check, if the pattern exists
				if (k === 11) score += 40; // Add penalty of N3 (40)
			}
		}
	}

	check((r, c)=>[r, c]); // rows (normal)
	check((c, r)=>[r, c]); // columns (flip rows and columns)

	// Rule 4
	const dark = qrcode.reduce((a,b) => a + b, 0);
	score += Math.floor(Math.abs((dark / qrcode.length) * 100 - 50) / 5) * 10; // calculate k (see ISO) and multiply by N4 (10)

	return score;
}

function determinMask(qrcode: QRCode, info: QrCodeInfo, data: number[]): number {
	let bestMask = 0;
	let bestScore = Infinity;

	const dummy = qrcode.slice();
	setFormatInformation(dummy, info, 0); // Reserve space for version information, will be overriten on each pass
	placeDataInQrCode(dummy, info, data);

	for (let mask = 0; mask < 8; mask++) {
		const dummy2 = dummy.slice();
		setFormatInformation(dummy2, info, mask); // Reserve space for version information, will be overriten on each pass

		maskQrCode(dummy2, info, mask);
		const maskScore = evaluateMaskScore(dummy2, info);
		
		if (maskScore < bestScore) {
			bestScore = maskScore;
			bestMask = mask;
		}
	}

	return bestMask;
}

export function generate(input: string, errorCorrection: QRCodeErrorCorrection): [QRCode, number] {
	const info: QrCodeInfo = determinQRCodeInfo(input, errorCorrection);
	const qrcode: QRCode = Array.from<number>({length: info.dimensions**2}).fill(0);

	console.groupCollapsed("generate: Expected warnings");

	const finderSeperator: number[] = Array.from<number>({length: 8}).fill(0);

	setQrCodeArea(qrcode, info.dimensions, 0, 0, 7, 7, FINDER_PATTERN,  MODULE_FINDER_FLAG); // Top left
	setQrCodeArea(qrcode, info.dimensions, 7, 0, 1, 8, finderSeperator, MODULE_FINDER_FLAG); // Top to bottom
	setQrCodeArea(qrcode, info.dimensions, 0, 7, 8, 1, finderSeperator, MODULE_FINDER_FLAG); // Left to right

	setQrCodeArea(qrcode, info.dimensions, (info.dimensions - 7), 0, 7, 7, FINDER_PATTERN,  MODULE_FINDER_FLAG); // Top right
	setQrCodeArea(qrcode, info.dimensions, (info.dimensions - 8), 0, 1, 8, finderSeperator, MODULE_FINDER_FLAG); // Top to bottom
	setQrCodeArea(qrcode, info.dimensions, (info.dimensions - 8), 7, 8, 1, finderSeperator, MODULE_FINDER_FLAG); // Left to right

	setQrCodeArea(qrcode, info.dimensions, 0, (info.dimensions - 7), 7, 7, FINDER_PATTERN,  MODULE_FINDER_FLAG); // Bottom left
	setQrCodeArea(qrcode, info.dimensions, 0, (info.dimensions - 8), 8, 1, finderSeperator, MODULE_FINDER_FLAG); // Left to right
	setQrCodeArea(qrcode, info.dimensions, 7, (info.dimensions - 8), 1, 8, finderSeperator, MODULE_FINDER_FLAG); // Top to bottom

	setAlignmentPatterns(qrcode, info);

	const timingPatternLen = info.dimensions - 16;
	const timingPattern: number[] = Array.from({ length: timingPatternLen }, (_, i) => (i % 2 === 0 ? 1 : 0));

	setQrCodeArea(qrcode, info.dimensions, 6, 8, 1, timingPatternLen, timingPattern, MODULE_TIMING_FLAG); // Top left to Bottom left
	setQrCodeArea(qrcode, info.dimensions, 8, 6, timingPatternLen, 1, timingPattern, MODULE_TIMING_FLAG); // Top left to Top right

	const data = structureData(info, input);

	const maskIndex = determinMask(qrcode, info, data);

	setFormatInformation(qrcode, info, maskIndex);

	placeDataInQrCode(qrcode, info, data);

	maskQrCode(qrcode, info, maskIndex);

	console.groupEnd();

	return [ qrcode, info.dimensions ];
}

export function drawQrCode(canvasctx: CanvasRenderingContext2D, qrcode: QRCode, qrcodeDimensions: number): void {
	canvasctx.canvas.width  = qrcodeDimensions * PIXELSIZE;
	canvasctx.canvas.height = qrcodeDimensions * PIXELSIZE;

	for (let it = 0; it < (qrcodeDimensions ** 2); it++) {
		const color = (qrcode[it] & MODULE_BLACK_FLAG) ? "black" : "white";

		canvasctx.fillStyle = color;
		const x = it % qrcodeDimensions;
		const y = Math.floor(it / qrcodeDimensions);
		canvasctx.fillRect(x * PIXELSIZE, y * PIXELSIZE, PIXELSIZE, PIXELSIZE);
	}
}