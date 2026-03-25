export async function indexRoutes(fastify, options) {
	fastify.get("/", async function handler(request, reply) {
		const res = reply.raw;

		res.writeHead(200, {
			"Content-Type": "application/json",
		});

		let i = 1;

		const interval = setInterval(() => {
			const chunk = JSON.stringify({ chunk: i });
			res.write(chunk + "\n");

			i++;

			if (i > 6) {
				clearInterval(interval);
				res.end();
			}
		}, 1000);
	});
}
