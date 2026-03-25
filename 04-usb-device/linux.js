import fs from "fs";

const stream = fs.createReadStream("/dev/input/mice");

stream.on("data", (chunk) => {
	console.log(chunk);
});
