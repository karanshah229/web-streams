// 1. File streams

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "../test.txt");

const reader = fs.createReadStream(filePath);
const writer = fs.createWriteStream("/tmp/output.txt");

reader.on("data", function (chunk) {
	console.log(chunk.toString());
});

writer.write("Writing to a writeable stream");

reader.pipe(writer);
