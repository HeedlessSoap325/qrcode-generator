<div id="content">
    <canvas id="qrcode"></canvas>

    <input id="input" type="text" placeholder="Qr Code Text..." value="Some Text"/>
    <label for="errorlvl">Error Correction:</label>
    <select id="errorlvl">
        <option value="L">L</option>
        <option value="M">M</option>
        <option value="Q">Q</option>
        <option value="H">H</option>
    </select>
</div>

<style>
	#content {
		margin: 0;
		display: grid;
		place-items: center;
		height: 100vh;
	}

	#qrcode, #input {
		display: block;
		margin-bottom: 20px;
	}
</style>