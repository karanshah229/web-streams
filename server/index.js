// HTTP streams server

import Fastify from "fastify";

const fastify = Fastify({
	logger: true,
});

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

async function* numberGenerator() {
	for (let i = 1; i <= 10; i++) {
		await new Promise((r) => setTimeout(r, 1000));
		yield i + "\n";
	}
}

fastify.get("/numbers", async (request, reply) => {
	const stream = Readable.from(numberGenerator());

	reply.header("Content-Type", "text/plain");

	return reply.send(stream);
});

try {
	await fastify.listen({ port: 3000 });
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
