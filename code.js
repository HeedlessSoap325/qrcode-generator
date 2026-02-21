import capacities from "./capacities.json" with { type: "json" };

const canvas = document.getElementById("qrcode");
const inputData = document.getElementById("input");
const errorLevel = document.getElementById("errorlvl");
const canvasctx = canvas.getContext("2d");

const pixelsize = 8;

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
]

function drawQrCode(qrcode, qrcodeDimensions) {
	for (let it = 0; it < (qrcodeDimensions * qrcodeDimensions); it++) {
		const color = qrcode[it] === 1 ? "black" : "white";

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
		qrcode[index] = data[it];
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
				limit: limit
			};
		}
	}
	return {
		version: 40,
		encoding,
		limit: capacities["40"][errorCorrection][encoding]
	};
}

function encodeData() {
	const info = determinQRCodeInfo();
}

function generate() {
	let qrcodeVersion = 1;
	let qrcodeDimensions = 21 + ((qrcodeVersion - 1) * 4);
	let qrcode = [];
	setQrCodeArea(qrcode, qrcodeDimensions, 0, 0, 7, 7, finderPattern); // Top left
	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 7), 0, 7, 7, finderPattern); // Top right
	setQrCodeArea(qrcode, qrcodeDimensions, 0, (qrcodeDimensions - 7), 7, 7, finderPattern); // Bottom left

	const timingPatternLen = qrcodeDimensions - 16;
	const timingPattern = Array.from({ length: timingPatternLen }, (_, i) => (i % 2 === 0 ? 1 : 0));
	setQrCodeArea(qrcode, qrcodeDimensions, 6, 8, 1, timingPatternLen, timingPattern); // Top left to Bottom left
	setQrCodeArea(qrcode, qrcodeDimensions, 8, 6, timingPatternLen, 1, timingPattern); // Top left to Top right

	setAlignmentPatterns(qrcode, qrcodeVersion, qrcodeDimensions);

	canvasctx.canvas.width  = qrcodeDimensions * pixelsize;
	canvasctx.canvas.height = qrcodeDimensions * pixelsize;
	drawQrCode(qrcode, qrcodeDimensions);
}

generate();
inputData.addEventListener("input", generate);
errorLevel.addEventListener("input", generate);