<script lang="ts">
	import { onMount } from "svelte";
	import { generate, drawQrCode, type QRCodeErrorCorrection, type QrRenderInfo, MODULE_FINDER_FLAG, MODULE_TIMING_FLAG, MODULE_ALIGNMENT_FLAG, MODULE_FORMAT_FLAG, MODULE_DATA_FLAG } from "$lib/logic/qrcode.ts";

	let canvas!: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let input: string = $state("Some Text");
	let errorCorrection: QRCodeErrorCorrection = $state("L");
	let showQrSections: boolean = $state(false);
	const renderSettings: QrRenderInfo[] = [
		{ mask: MODULE_FINDER_FLAG, 	hexDarkColor: "#d55e00", hexLightColor: "#fcefe6" },
		{ mask: MODULE_TIMING_FLAG, 	hexDarkColor: "#f0e442", hexLightColor: "#fdfce7" },
		{ mask: MODULE_ALIGNMENT_FLAG,	hexDarkColor: "#009e73", hexLightColor: "#e6f4f1" },
		{ mask: MODULE_FORMAT_FLAG, 	hexDarkColor: "#0072b2", hexLightColor: "#fcfdfe" },
		{ mask: MODULE_DATA_FLAG, 		hexDarkColor: "#cc79a7", hexLightColor: "#f9eef4" },
	];

	onMount(() => {
		ctx = canvas.getContext("2d");

		drawQrCode(ctx!, ...generate(input, errorCorrection), (showQrSections ? renderSettings : []));
	});

	$effect(() => {
		if (ctx) {
			drawQrCode(ctx, ...generate(input, errorCorrection),  (showQrSections ? renderSettings : []));
		}
	});
</script>

<div id="content">
	<div class="top-row">
	  	<canvas bind:this={canvas} id="qrcode"></canvas>

		<div>
			<label class="checkbox">
				<input id="showQrSections" type="checkbox" bind:checked={showQrSections} />
				Show QR sections
			</label>
	
			<div id="qrSectionsLegend" class:visible={showQrSections} >
				<span><span style="color: {renderSettings[0].hexDarkColor};">●</span> Finder Pattern</span>
				<span><span style="color: {renderSettings[1].hexDarkColor};">●</span> Timing Pattern</span>
				<span><span style="color: {renderSettings[2].hexDarkColor};">●</span> Alignment Pattern</span>
				<span><span style="color: {renderSettings[3].hexDarkColor};">●</span> Format Pattern</span>
				<span><span style="color: {renderSettings[4].hexDarkColor};">●</span> Data Content</span>
			</div>
		</div>
	</div>
  
	<div class="controls">
		<input id="input" type="text" placeholder="QR Code text..." bind:value={input} />
  
		<label id="errorlvlLabel" for="errorlvl">Error Correction</label>
		<select id="errorlvl" bind:value={errorCorrection}>
			<option value="L">L</option>
			<option value="M">M</option>
			<option value="Q">Q</option>
			<option value="H">H</option>
		</select>
	</div>
</div>

<style>
	#content {
		max-width: 700px;
		margin: 40px auto;
		padding: 20px;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	.top-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 24px;
	
	}

	#qrcode {
		width: 300px;
		height: 300px;
		background: #f8f9fb;
		border-radius: 12px;
		padding: 10px;
		box-shadow: inset 0 0 0 1px #e5e7eb;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #4b5563;
	}

	#qrSectionsLegend {
		font-size: 14px;
		color: #374151;
		line-height: 1.6;
		transition: opacity 0.3s ease-out;
		display: flex;
		opacity: 0;
		flex-direction: column;
		margin-top: 75px;
		gap: 6px;
	}

	#qrSectionsLegend.visible {
		transition: opacity 0.3s ease-in;
		display: flex;
		opacity: 1;
		flex-direction: column;
		gap: 6px;
		margin-top: 75px;
	}

	.controls {
		margin-top: 24px;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	#input {
		flex: 1;
  		min-width: 0;
		padding: 12px 14px;
		font-size: 15px;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		outline: none;
		transition: all 0.2s ease;
	}

	#input:focus {
		border-color: #1216fd;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	#errorlvlLabel {
		white-space: nowrap;
	}

	#errorlvl {
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
		background: white;
		cursor: pointer;
	}

	@media (max-width: 600px) {
		.top-row {
			grid-template-columns: 1fr;
		}

		#qrcode {
			margin: 0 auto;	
		}

		#qrSectionsLegend.visible {
			margin: 0;
			align-items: center;
		}

		.controls {
			flex-wrap: wrap;
		}

		#input {
			flex: 1 1 100%;
		}
	}
</style>