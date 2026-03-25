// Create streams from various sources

// Built-in Streams (Most Common)

// 1. File streams

import fs from "fs";
import { Readable } from "stream";

const readableStream = fs.createReadStream("file.txt");
const writeableStream = fs.createWriteStream("output.txt");

// 2. Network streams - Examples in http-streams folder

// 3. Process streams
process.stdin;
process.stdout;
process.stderr;

// From Iterables / Generators

const arrayStream = Readable.from([1, 2, 3, 4, 5]);
arrayStream.on("data", console.log);

// Generator functions

function* generate() {
	yield "a";
	yield "b";
	yield "c";
}

const generatorStream = Readable.from(generate());

// Async generators

async function* generate() {
	yield "a";
	await new Promise((r) => setTimeout(r, 1000));
	yield "b";
}

const asyncGeneratorStream = Readable.from(generate());

// From event sources

const stream = new Readable({
	read() {},
});

stream.on("data", console.log);

stream.push("hello");
stream.push("world");
stream.push(null);

// Transform streams - Examples in http-streams folder
