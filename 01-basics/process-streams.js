process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
	const input = chunk.trim();

	if (!input) {
		process.stderr.write("ERROR: Empty input\n");
		return;
	}

	try {
		const result = chunk.toUpperCase();

		process.stdout.write(`OUTPUT: ${result}`);
	} catch (err) {
		process.stderr.write(`ERROR: ${err.message}\n`);
	}
});

process.stdin.on("end", () => {
	process.stdout.write("\nDone processing\n");
});
