import Fastify from "fastify";

const fastify = Fastify({
	logger: true,
});

fastify.get("/events", async (request, reply) => {
	const res = reply.raw;

	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	let counter = 1;

	const interval = setInterval(() => {
		const data = {
			time: new Date().toISOString(),
			value: counter++,
		};

		res.write(`data: ${JSON.stringify(data)}\n\n`);
	}, 1000);

	request.raw.on("close", () => {
		clearInterval(interval);
		res.end();
	});
});

try {
	await fastify.listen({ port: 3000 });
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
