const stream = new ReadableStream({
	start(controller) {
		let count = 1;

		const interval = setInterval(() => {
			console.log("Producing:", count);

			controller.enqueue(count++);

			if (count > 6) {
				clearInterval(interval);
				controller.close();
			}
		}, 500);
	},
});

const [stream1, stream2] = stream.tee();

async function readStream(name, stream) {
	const reader = stream.getReader();

	while (true) {
		const { value, done } = await reader.read();

		if (done) {
			console.log(`${name}: done`);
			break;
		}

		console.log(`${name} got:`, value);

		await new Promise((r) => setTimeout(r, Math.random() * 1000));
	}
}

readStream("Reader A", stream1);
readStream("Reader B", stream2);
