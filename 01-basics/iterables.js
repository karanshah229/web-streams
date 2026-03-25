import { Readable } from "stream";

// From Iterables / Generators

const arrayStream = Readable.from([1, 2, 3, 4, 5]);
arrayStream.on("data", console.log);

// Generator functions

function* generatorSync() {
	yield "a";
	yield "b";
	yield "c";
}

const generatorStream = Readable.from(generatorSync());

for await (const value of generatorStream) {
	console.log("sync generator value is: ", value);
}

// Async generators

async function* asyncGenerator() {
	yield "a";
	await new Promise((r) => setTimeout(r, 1000));
	yield "b";
}

const asyncGeneratorStream = Readable.from(asyncGenerator());

for await (const value of asyncGeneratorStream) {
	console.log("async generator value is: ", value);
}
