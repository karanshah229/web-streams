import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function binaryRoutes(fastify) {
	fastify.get("/image", async (req, reply) => {
		const filePath = path.join(__dirname, "../../../test.png");

		const slowStream = new TransformStream({
			transform(chunk, controller) {
				// simulate slow network with a small delay
				return new Promise((resolve) => {
					setTimeout(() => {
						controller.enqueue(chunk);
						resolve();
					}, 0);
				});
			},
		});

		const stat = fs.statSync(filePath);

		reply
			.header("Content-Type", "image/png")
			.header("content-length", stat.size);

		const nodeReadable = fs.createReadStream(filePath, { highWaterMark: 1024 });
		const webReadable = Readable.toWeb(nodeReadable);

		return reply.send(webReadable.pipeThrough(slowStream));
	});
}
