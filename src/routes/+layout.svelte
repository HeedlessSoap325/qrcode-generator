<script>
	const numQrCodes = 6;
	const num = Math.floor(Math.random() * numQrCodes);

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={`qrCode${num}.png`} />
</svelte:head>

{@render children()}