const resp = await fetch("http://localhost:3000");

console.log(resp);
// console.log(typeof resp.body);

const body = resp.body;

// Direct - async iterator
for await (const chunk of body) {
	console.log(JSON.parse(new TextDecoder().decode(chunk)));
}

// Low level reader
const reader = body.getReader();

while (true) {
	const { done, value } = await reader.read();

	if (done) {
		reader.releaseLock();
		break;
	}

	const chunk = JSON.parse(new TextDecoder().decode(value));
	console.log("chunk", chunk);
}

console.log(resp);
