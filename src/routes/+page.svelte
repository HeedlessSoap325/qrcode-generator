<script lang="ts">
	import { onMount } from "svelte";

	let canvas!: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let input: string = $state("Some Text");
	let errorCorection: string = $state("L");

	onMount(() => {
		ctx = canvas.getContext("2d");
		//TODO: draw
	});

	$effect(() => {
		if (ctx) {
			console.log(`rerender (input='${input}', errorCorrection='${errorCorection}')`)
			//TODO: draw
		}
	});
</script>

<div id="content">
    <canvas bind:this={canvas} id="qrcode"></canvas>

    <input id="input" type="text" placeholder="Qr Code Text..." bind:value={input}/>

	<div id="errorCorrectionRow">
		<label for="errorlvl">Error Correction:</label>
		<select id="errorlvl" bind:value={errorCorection}>
			<option value="L">L</option>
			<option value="M">M</option>
			<option value="Q">Q</option>
			<option value="H">H</option>
		</select>
	</div>
</div>

<style>
	#content {
		margin: 0;
		display: flex;
		flex-direction: column;
		place-items: center;
		height: 100vh;
	}

	#qrcode, #input {
		margin-bottom: 20px;
	}
</style>