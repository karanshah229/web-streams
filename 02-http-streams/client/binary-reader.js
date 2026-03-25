// Streaming image is not working in terminal, so showing a progress bar instead
// Streaming is working in browser - modify timeout is server to simulate slower network

const resp = await fetch("http://localhost:3000/binary/image");

const total = Number(resp.headers.get("content-length"));

const [imageStream, progressStream] = resp.body.tee();

async function showProgress(stream) {
	let received = 0;
	const barLength = 30;

	const startTime = Date.now();

	for await (const chunk of stream) {
		received += chunk.length;

		const elapsed = (Date.now() - startTime) / 1000;

		const speed = received / elapsed; // bytes/sec
		const speedKB = (speed / 1024).toFixed(1);

		if (!total) {
			process.stdout.write(
				`\rDownloaded ${(received / 1024).toFixed(1)} KB (${speedKB} KB/s)`,
			);
			continue;
		}

		const percent = received / total;
		const filled = Math.floor(percent * barLength);

		const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

		const remaining = total - received;

		const etaSeconds = remaining / speed;

		const eta = etaSeconds > 0 ? `${etaSeconds.toFixed(1)}s` : "0s";

		process.stdout.write(
			`\rDownloading: ${bar} ${(percent * 100).toFixed(1)}% (${speedKB} KB/s) ETA ${eta}`,
		);
	}

	process.stdout.write("\n");
}

async function collectImage(stream) {
	const chunks = [];

	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
}

const progressPromise = showProgress(progressStream);
const imagePromise = collectImage(imageStream);

await progressPromise;

const buffer = await imagePromise;
const base64 = buffer.toString("base64");
process.stdout.write(`\u001b]1337;File=inline=1;width=50%:${base64}\u0007`);
