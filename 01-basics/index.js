import { delay } from "./../utils.js";
import { Readable } from "stream";

// Smallest stream example
Readable.from(["Hello ", "World", "\n"]).pipe(process.stdout);

let printOnce = false;
const stream = new Readable({
	async read() {
		if (!printOnce) printOnce = true;
		else return;

		this.push("Lorem ");
		await delay(1000); // ⏳ delay

		this.push("Ipsum ");
		await delay(1000); // ⏳ delay

		this.push("Dolor ");
		await delay(1000); // ⏳ delay

		this.push("sit ");
		await delay(1000); // ⏳ delay

		this.push(null); // end
	},
});

stream.pipe(process.stdout);
