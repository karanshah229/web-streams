export async function eventRoutes(fastify, options) {
	fastify.get("/", async (request, reply) => {
		reply.raw.setHeader("Content-Type", "text/event-stream");
		reply.raw.setHeader("Cache-Control", "no-cache");
		reply.raw.setHeader("Connection", "keep-alive");

		reply.raw.flushHeaders();

		let count = 0;

		const interval = setInterval(() => {
			count++;

			const data = JSON.stringify({ message: `Hello ${count}` });

			if (count % 2 == 0) {
				// reply.raw.write(`data: ${data}\n\n`);
			} else {
				reply.raw.write(`event: greeting\n`);
			}
			reply.raw.write(`data: ${data}\n\n`);
		}, 1000);

		// Cleanup on client disconnect
		request.raw.on("close", () => {
			clearInterval(interval);
			reply.raw.end();
		});
	});
}
