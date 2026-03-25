// Backpressure and highwater examples

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { delay } from "../common/utils.js";
import { Transform } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "../test.txt");

let chunkCount = 0;

const slowProcessor = new Transform({
	async transform(chunk, encoding, callback) {
		chunkCount++;

		let processingTime =
			chunkCount < 5 ? 350 : chunkCount < 10 ? 750 : 1500; // Controls backpressure

		console.log(
			`Chunk #${chunkCount} | Delay: ${processingTime}ms | Chunk Length: ${chunk.length}`,
		);

		await delay(processingTime);

		callback(null, chunk); // pass chunk forward
	},
});

console.log("Stream outputted to /tmp/output.txt");
console.log("Run `tail -f /tmp/output.txt` to watch the file grow");

fs.createReadStream(filePath, {
	highWaterMark: 128 * 1024, // 128KB blocks
})
	.pipe(slowProcessor) // Controls backpressure
	.pipe(fs.createWriteStream("/tmp/output.txt"));
