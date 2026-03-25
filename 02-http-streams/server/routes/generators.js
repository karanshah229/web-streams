import { Readable } from "stream";

async function* numberGenerator() {
	for (let i = 1; i <= 10; i++) {
		await new Promise((r) => setTimeout(r, 1000));
		yield i + "\n";
	}
}

export async function generatorRoutes(fastify, options) {
	fastify.get("/", async (request, reply) => {
		const stream = Readable.from(numberGenerator());

		reply.header("Content-Type", "text/plain");

		return reply.send(stream);
	});
}
