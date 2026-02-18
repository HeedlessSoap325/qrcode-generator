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

function generate() {
	let qrcodeVersion = 1;
	let qrcodeDimensions = 21 + ((qrcodeVersion - 1) * 4);
	let qrcode = [];
	setQrCodeArea(qrcode, qrcodeDimensions, 0, 0, 7, 7, finderPattern);
	setQrCodeArea(qrcode, qrcodeDimensions, (qrcodeDimensions - 7), 0, 7, 7, finderPattern);
	setQrCodeArea(qrcode, qrcodeDimensions, 0, (qrcodeDimensions - 7), 7, 7, finderPattern);

	const timingPatternLen = qrcodeDimensions - 16;
	const timingPattern = Array.from({ length: timingPatternLen }, (_, i) => (i % 2 === 0 ? 1 : 0));
	setQrCodeArea(qrcode, qrcodeDimensions, 6, 8, 1, timingPatternLen, timingPattern);
	setQrCodeArea(qrcode, qrcodeDimensions, 8, 6, timingPatternLen, 1, timingPattern);
	console.log(timingPatternLen)
	console.log(timingPattern)

	
	//console.log(errorLevel.value);
	canvasctx.canvas.width  = qrcodeDimensions * pixelsize;
	canvasctx.canvas.height = qrcodeDimensions * pixelsize;
	drawQrCode(qrcode, qrcodeDimensions);
}

generate();
inputData.addEventListener("input", generate);
errorLevel.addEventListener("input", generate);