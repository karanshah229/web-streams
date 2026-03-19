// HTTP streams client

import { delay } from "./utils.js";

const resp = await fetch("http://localhost:3000");

console.log(resp);
// console.log(typeof resp.body);

const body = resp.body;

const [body2, body3] = body.tee();
const reader = body2.getReader();
const reader2 = body3.getReader();

async function readAndLog(reader, slowReader = false) {
	const { done, value } = await reader.read();

	if (done) {
		reader.releaseLock();
		return;
	}

	const chunk = JSON.parse(new TextDecoder().decode(value));
	console.log("chunk", "slowReader ? ", slowReader, chunk);

	if (slowReader) await delay(2000);

	await readAndLog(reader, slowReader);
}

const reader1Promise = readAndLog(reader);
const reader2Promise = readAndLog(reader2, true);

await Promise.allSettled([reader1Promise, reader2Promise]);

console.log(resp);
