// Generator api
// Body
// tee
// 1st stream - string - The square of {num} is:
// 2nd stream - number - {square}
// Zip streams

function prefixStream() {
	return new TransformStream({
		transform(chunk, controller) {
			const str = `The square of ${chunk.trim()} is:`;
			controller.enqueue(str);
		},
	});
}

function toSquareStream() {
	return new TransformStream({
		transform(chunk, controller) {
			const number = parseInt(chunk, 10);
			const square = number ** 2;
			controller.enqueue(square.toString());
		},
	});
}

function zipStreams(stream, stream2) {
	return new ReadableStream({
		async start(controller) {
			const reader = stream.getReader();
			const reader2 = stream2.getReader();

			while (true) {
				const [{ done, value }, { done: done2, value: value2 }] =
					await Promise.all([reader.read(), reader2.read()]);

				if (done && done2) {
					reader.releaseLock();
					reader2.releaseLock();
					controller.close();
					break;
				}

				const mergedValue = `${value} ${value2}`;
				controller.enqueue(mergedValue);
			}
		},
	});
}

const resp = await fetch("http://localhost:3000/generators");
console.log(resp);

const respBody = resp.body;
const [body, body2] = respBody.tee();

const transformedBody = body
	.pipeThrough(new TextDecoderStream())
	.pipeThrough(prefixStream());

const transformedBody2 = body2
	.pipeThrough(new TextDecoderStream())
	.pipeThrough(toSquareStream());

const zippedStream = zipStreams(transformedBody, transformedBody2);

for await (const chunk of zippedStream) {
	console.log(chunk);
}

console.log(resp);
