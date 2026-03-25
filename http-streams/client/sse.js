// SSE does not use Node stream API, it uses TCP streaming

import http from "http";
import { EventSource } from "eventsource";

// Native HTTP Example

function parseRawChunk(str) {
	if (!str.includes("data: ")) return {};

	const [_prefix, JSONStr] = str.split("data: ");
	const dataJSON = JSON.parse(JSONStr);

	return dataJSON;
}

http.get("http://localhost:3000/events", (res) => {
	res.setEncoding("utf8");

	res.on("data", (chunk) => {
		const parsedChunk = parseRawChunk(chunk);
		console.log("SSE Chunk:", parsedChunk);
	});

	res.on("end", () => {
		console.log("SSE Connection closed");
	});
});

// Node Package

// const es = new EventSource("http://localhost:3000/events");

// es.onmessage = (event) => {
// 	console.log("Received:", event.data);
// };

// es.addEventListener("greeting", (event) => {
// 	console.log("Custom event:", event.data);
// });

// es.onerror = (err) => {
// 	console.error("Error:", err);
// };
