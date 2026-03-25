import Fastify from "fastify";

import { indexRoutes } from "./routes/index.js";
import { generatorRoutes } from "./routes/generators.js";
import { binaryRoutes } from "./routes/binary.js";
import { eventRoutes } from "./routes/events.js";

const fastify = Fastify({
	logger: true,
});

fastify.register(indexRoutes, { prefix: "/" });
fastify.register(generatorRoutes, { prefix: "/generators" });
fastify.register(binaryRoutes, { prefix: "/binary" });
fastify.register(eventRoutes, { prefix: "/events" });

try {
	await fastify.listen({ port: 3000 });
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
