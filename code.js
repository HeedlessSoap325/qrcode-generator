import capacities from "./capacities.json" with { type: "json" };

const canvas = document.getElementById("qrcode");
const inputData = document.getElementById("input");
const errorLevel = document.getElementById("errorlvl");
const canvasctx = canvas.getContext("2d");

const pixelsize = 8;

const PIXEL_BLACK_FLAG 		= 0b1;
const PIXEL_RESERVED_FLAG 	= 0b10;

const finderPattern = [
	1, 1, 1, 1, 1, 1, 1,
	1, 0, 0, 0, 0, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 1, 1, 1, 0, 1,
	1, 0, 0, 0, 0, 0, 1,
	1, 1, 1, 1, 1, 1, 1,
];

const alignmentPattern = [
	1, 1, 1, 1, 1,
	1, 0, 0, 0, 1,
	1, 0, 1, 0, 1,
	1, 0, 0, 0, 1,
	1, 1, 1, 1, 1,
];

const formatInformationMask = 0b101010000010010;
const formatInformationGenerator = 0b10100110111;
const versionInformationGenerator = 0b1111100100101;

const dataExtension1 = [1, 1, 1, 0, 1, 1, 0, 0];
const dataExtension2 = [0, 0, 0, 1, 0, 0, 0, 1];
const alphanumerics = [
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", 
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", 
	" ", "$", "%", "*", "+", "-", ".", "/", ":"
];

function drawQrCode(qrcode, qrcodeDimensions) {
	for (let it = 0; it < (qrcodeDimensions * qrcodeDimensions); it++) {
		const color = (qrcode[it] & PIXEL_BLACK_FLAG) ? "black" : "white";

		canvasctx.fillStyle = color;
		const x = it % qrcodeDimensions;
		const y = Math.floor(it / qrcodeDimensions);
		canvasctx.fillRect(x * pixelsize, y * pixelsize, pixelsize, pixelsize);
	}
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
function setQrCodeArea(qrcode, qrcodeDimensions, x, y, w, h, data) {
	for (let it = 0; it < w * h; it++) {
		const rowOffset = Math.floor(it / w);
		const colOffset = it % w;
		const index = (y + rowOffset) * qrcodeDimensions + (x + colOffset);
		if (qrcode[index] & PIXEL_RESERVED_FLAG) {
			console.warn(`setQrCodeArea: Function tried setting reserved pixel (x=${x + colOffset}, y=${y + rowOffset}) to ${data[it]}`);
		} else {
			const color = data[it] === 0 ? 0 : 1;
			qrcode[index] = color | PIXEL_RESERVED_FLAG;
		}
	}
}

// Source - https://stackoverflow.com/a/73349304
// Posted by YourMJK, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-18, License - CC BY-SA 4.0
function setAlignmentPatterns(qrcode, qrcodeVersion, qrcodeDimensions) {
    if (qrcodeVersion <= 1) return;
	let coordinates = [];
    let intervals = Math.floor((qrcodeVersion / 7)) + 1;  // Number of gaps between alignment patterns
    let distance = 4 * qrcodeVersion + 4;  // Distance between first and last alignment pattern
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
		if ((x <= 7 && (y <= 7 || y >= (qrcodeDimensions - 8))) || (x >= (qrcodeDimensions - 8) && y <= 7)) continue; // Don't place inside finder Patterns
		setQrCodeArea(qrcode, qrcodeDimensions, x - 2, y - 2, 5, 5, alignmentPattern);
	}
}

function determinEncoding(text) {
	if (/^[0-9]+$/.test(text)) {
		return "numeric";
	} else if (/^[0-9A-Z \$%\*\+\-\.\/:]+$/.test(text)) {
		return "alphanumeric";
	} else {
		return "byte";
	}
}

function determinQRCodeInfo() {
	const input = inputData.value;
	const errorCorrection = errorLevel.value;
	const encoding = determinEncoding(input);

	for(let i = 1; i <= 40; i++) {
		const limit = capacities[`${i}`][errorCorrection][encoding];
		if(limit >= input.length) {
			return {
				version: i,
				encoding,
				limit: limit,
				errorCorrection
			};
		}
	}
	return {
		version: 40,
		encoding,
		limit: capacities["40"][errorCorrection][encoding],
		errorCorrection
	};
}

/*
	encode the data in inputData.value, based on the encoding mode.
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
function encodeData(info) {
	// Version    Numeric   Alphanumeric   byte
	// 1  to 9    10        9              8
	// 10 to 26   12        11             16
	// 27 to 40   14        13             16
	let ret = [];
	if(info.encoding === "numeric") {
		const mode 	= intToBitsFixed(1, 4); // 0001 is the mode indicator for numbers
		const countLen = 10; // See table above
		if(info.version >= 10) countLen = 12;
		if(info.version >= 27) countLen = 14;
		const len 	= intToBitsFixed(inputData.value.length, countLen); // character count indicator must be countLen bits long
		const parts = inputData.value.match(/.{1,3}/g) || []; // split input stream every 3 characters

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
		const countLen = 9; // See table above
		if(info.version >= 10) countLen = 11;
		if(info.version >= 27) countLen = 13;
		const len 	= intToBitsFixed(inputData.value.length, countLen); // character count indicator must be countLen bits long
		const parts = inputData.value.match(/.{1,2}/g) || []; // split input stream every 3 characters

		ret = [...ret, ...mode, ...len];

		parts.forEach(part => {
			if(part.length === 1) {
				const charValue = alphanumerics.indexOf(part);
				const bin 		= intToBitsFixed(charValue, 6);

				ret = [...ret, ...bin];
			} else { //part.length === 2
				const char1Value = alphanumerics.indexOf(part[0]);
				const char2Value = alphanumerics.indexOf(part[1]);
				const num 		 = (alphanumerics.length * char1Value)+ char2Value;
				const bin 		 = intToBitsFixed(num, 11);

				ret = [...ret, ...bin];
			}
		});
	} else { // info.encodeing === "byte"
		const mode 	= intToBitsFixed(4, 4); // 0100 is the mode indicator for numbers
		const countLen = 8; // See table above
		if(info.version >= 10) countLen = 16;
		const len 	= intToBitsFixed(inputData.value.length, countLen); // character count indicator must be countLen bits long

		ret = [...ret, ...mode, ...len];

		for(let it = 0; it < inputData.value.length; it++) {
			const num = inputData.value.charCodeAt(it); // Convert to ascii code
			const bin = intToBitsFixed(num, 8);

			ret = [...ret, ...bin];
		}
	}
	ret = [...ret, 0, 0, 0, 0]; // Terminator for all QR code bit streams
	const padLen = 8 - (ret.length % 8); // Codewords are 8 Bit long
	const pad = intToBitsFixed(0, padLen);
	ret = [...ret, ...pad]; // The Bit stream must be padded, so that the Extension boundaries allign with the codeword boundaries

	const numCodewords = ret / 8; //This should be an integer
	const maxCodewords = 0; //TODO
	for(let it = 0; it < (maxCodewords - numCodewords); it++) {
		if (it % 2 === 0) { // Alternate extension codewords
			ret = [...ret, ...dataExtension1]; // Extend with 236, as specified in ISO
		} else {
			ret = [...ret, ...dataExtension2]; // Extend with 17, as specified in ISO
		}
	}
	return ret;
}

function intToBits(n) {
    return n.toString(2).split('').map(Number);
}

function intToBitsFixed(n, length) {
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

function bitsToInt(bits) {
    return parseInt(bits.join(''), 2);
}

function mod2Division(dividend, divisor) {
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

function setFormatInformation(qrcodeVersion, qrcode, qrcodeDimensions, errorCorrection, maskIndex) {
	let data = 0b0;
	if(errorCorrection === "M") data = 0b00 << 3
	else if(errorCorrection === "L") data = 0b01 << 3
	else if(errorCorrection === "H") data = 0b10 << 3
	else if(errorCorrection === "Q") data = 0b11 << 3
	else {
		console.error("setFormatInformation: supplied invalide errorCorrection, is not M | L | H | Q");
		return;
	}
    data |= maskIndex; // add mask bits (3 bits)

    data <<= 10; // shift left 10 bits

    // Convert to bit array (15 bits total)
    let dividend = intToBitsFixed(data, 15);
    let generator = intToBitsFixed(formatInformationGenerator, 11);

    let remainder = mod2Division(dividend, generator); // Compute remainder
    let remainderInt = bitsToInt(remainder); // Convert remainder to integer

    data |= remainderInt; // Merge remainder

    data ^= formatInformationMask; // Apply QR format mask (0x5412)

    const info = intToBitsFixed(data, 15); // Final 15-bit format string
	const info1 = info.slice(0, 8);
	info1.splice(6, 0, 1);
	const info2 = info.slice(7, 15).reverse()
	info2.splice(6, 0, 1);

	setQrCodeArea(qrcode, qrcodeDimensions, 0, 8, 8, 1, info1); // Left to right
	setQrCodeArea(qrcode, qrcodeDimensions, 8, 0, 1, 8, info2); // Top to bottom

	const info3 = info.slice(0, 7).reverse();
	info3.splice(0, 0, 1);
	const info4 = info.slice(7, 15);
	setQrCodeArea(qrcode, qrcodeDimensions, 8, (qrcodeDimensions - 8), 1, 8, info3); // Top to bottom
	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 8), 8, 8, 1, info4); // Left to right


	if(qrcodeVersion > 6) { // Version Information is required for all QR codes over version 6
		let data = qrcodeVersion << 12;

		// Convert to bit array (18 bits total)
		let dividend = intToBitsFixed(data, 18);
    	let generator = intToBitsFixed(versionInformationGenerator, 13);

		let remainder = mod2Division(dividend, generator); // Compute remainder
		let remainderInt = bitsToInt(remainder); // Convert remainder to integer

		data |= remainderInt; // Merge remainder
		
		data = intToBitsFixed(data, 18); // Final 18-bit version string
		data = data.reverse(); // Least significant Bit first

		// Tanspose
		const data1 = new Array(data.length);
		for (let i = 0; i < data.length; i++) {
			data1[(i % 3) * 6 + Math.floor(i / 3)] = data[i];
		}

		setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 11), 0, 3, 6, data); //Top right
		setQrCodeArea(qrcode, qrcodeDimensions, 0, (qrcodeDimensions - 11), 6, 3, data1); //Bottom left
	}
}

function generate() {
	const info = determinQRCodeInfo();
	const qrcodeDimensions = 21 + ((info.version - 1) * 4);
	const qrcode = Array.from({length: qrcodeDimensions**2}).fill(0);

	console.groupCollapsed("generate: Expected warnings");
	const finderSeperator = Array.from({length: 8}).fill(0);
	const timingPatternLen = qrcodeDimensions - 16;
	const timingPattern = Array.from({ length: timingPatternLen }, (_, i) => (i % 2 === 0 ? 1 : 0));

	setQrCodeArea(qrcode, qrcodeDimensions, 0, 0, 7, 7, finderPattern); // Top left
	setQrCodeArea(qrcode, qrcodeDimensions, 7, 0, 1, 8, finderSeperator); // Top to bottom
	setQrCodeArea(qrcode, qrcodeDimensions, 0, 7, 8, 1, finderSeperator); // Left to right

	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 7), 0, 7, 7, finderPattern); // Top right
	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 8), 0, 1, 8, finderSeperator); // Top to bottom
	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 8), 7, 8, 1, finderSeperator); // Left to right

	setQrCodeArea(qrcode, qrcodeDimensions, 0, (qrcodeDimensions - 7), 7, 7, finderPattern); // Bottom left
	setQrCodeArea(qrcode, qrcodeDimensions, 0, (qrcodeDimensions - 8), 8, 1, finderSeperator); // Left to right
	setQrCodeArea(qrcode, qrcodeDimensions, 7, (qrcodeDimensions - 8), 1, 8, finderSeperator); // Top to bottom

	setAlignmentPatterns(qrcode, info.version, qrcodeDimensions);

	setQrCodeArea(qrcode, qrcodeDimensions, 6, 8, 1, timingPatternLen, timingPattern); // Top left to Bottom left
	setQrCodeArea(qrcode, qrcodeDimensions, 8, 6, timingPatternLen, 1, timingPattern); // Top left to Top right

	//TODO: Encode Data & determin Mask
	console.log(encodeData(info));

	setFormatInformation(info.version, qrcode, qrcodeDimensions, info.errorCorrection, 1); //TODO: replace "1" with actual Mask

	//TODO: Set Data to QR Code

	console.groupEnd();

	canvasctx.canvas.width  = qrcodeDimensions * pixelsize;
	canvasctx.canvas.height = qrcodeDimensions * pixelsize;
	drawQrCode(qrcode, qrcodeDimensions);
}

generate();
inputData.addEventListener("input", generate);
errorLevel.addEventListener("input", generate);