# Streaming over HTTP

This section demonstrates how streams operate in an HTTP context. It includes a Fastify server that exposes four streaming endpoints and five client scripts that consume them using different techniques.

## Overview

| Component | Purpose |
|---|---|
| `server/` | Fastify server with 4 streaming routes |
| `client/simple-reader.js` | Consume a stream via async iteration and `getReader()` |
| `client/binary-reader.js` | Download binary data with a live progress bar |
| `client/sse.js` | Consume Server-Sent Events |
| `client/tee.js` | Split an HTTP response into two readers |
| `client/transform.js` | Transform and zip streams using `TransformStream` |

## Running the Examples

Start the server first:

```bash
node 02-http-streams/server/index.js
```

Then, in a separate terminal, run any client script:

```bash
node 02-http-streams/client/simple-reader.js
```

---

## Server

The server is built with Fastify and registers four route groups:

```js
import Fastify from "fastify";

const fastify = Fastify({ logger: true });

fastify.register(indexRoutes, { prefix: "/" });
fastify.register(generatorRoutes, { prefix: "/generators" });
fastify.register(binaryRoutes, { prefix: "/binary" });
fastify.register(eventRoutes, { prefix: "/events" });

await fastify.listen({ port: 3000 });
```

### Route: `GET /` — JSON Chunk Streaming

Sends 6 JSON chunks at 1-second intervals using raw Node.js response:

```js
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
```

This bypasses Fastify's reply abstraction and writes directly to the underlying Node HTTP response (`reply.raw`). Each `res.write()` call sends a chunk to the client without waiting for the entire response to be assembled.

### Route: `GET /generators` — Async Generator Stream

Serves numbers 1–10 using a `Readable` stream created from an async generator:

```js
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
```

Fastify natively supports sending a `Readable` stream as a response. The framework handles piping the stream to the HTTP response and closing the connection when the stream ends.

### Route: `GET /binary/image` — Binary Image Streaming

Streams a PNG image file using the Web Streams API with a simulated slow network:

```js
export async function binaryRoutes(fastify) {
  fastify.get("/image", async (req, reply) => {
    const filePath = path.join(__dirname, "../../../test.png");

    const slowStream = new TransformStream({
      transform(chunk, controller) {
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
```

Key points:
- `Readable.toWeb()` converts a Node Readable stream into a Web `ReadableStream`
- `pipeThrough()` connects the readable to a `TransformStream`
- `highWaterMark: 1024` sets the chunk size to 1 KB, creating many small chunks (useful for demonstrating streaming progress)
- The `Content-Length` header is set so clients can calculate download progress

### Route: `GET /events` — Server-Sent Events (SSE)

Implements the SSE protocol by writing formatted event data to the raw response:

```js
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
        // unnamed event
      } else {
        reply.raw.write(`event: greeting\n`);
      }
      reply.raw.write(`data: ${data}\n\n`);
    }, 1000);

    request.raw.on("close", () => {
      clearInterval(interval);
      reply.raw.end();
    });
  });
}
```

**SSE protocol rules:**
- Content-Type must be `text/event-stream`
- Each message is prefixed with `data: ` and terminated with `\n\n`
- Named events use `event: <name>\n` before the data line
- The connection is long-lived; cleanup happens when the client disconnects

SSE uses TCP streaming, not the Node.js stream API. The server writes directly to the HTTP response socket.

---

## Client Examples

### 1. Simple Reader — `client/simple-reader.js`

Demonstrates two ways to consume an HTTP response stream.

**Async iteration (recommended):**

```js
const resp = await fetch("http://localhost:3000");
const body = resp.body;

for await (const chunk of body) {
  console.log(JSON.parse(new TextDecoder().decode(chunk)));
}
```

`resp.body` is a Web `ReadableStream`. The `for await...of` loop consumes it one chunk at a time with natural backpressure.

**Low-level reader:**

```js
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
```

`getReader()` returns a `ReadableStreamDefaultReader` that gives fine-grained control. The `{ done, value }` pattern matches the iterator protocol. `releaseLock()` must be called when finished so the stream can be used by other readers.

> **Note:** Both approaches in this file cannot run sequentially in a single execution because the first loop consumes and closes the stream. The second block is included for reference. Comment out one approach to run the other.

**Run it:**

```bash
node 02-http-streams/client/simple-reader.js
```

---

### 2. Binary Reader with Progress Bar — `client/binary-reader.js`

Downloads a PNG image from the server and shows a live progress bar in the terminal. This is a practical example of `tee()` — one branch tracks progress, the other collects the image data.

```js
const resp = await fetch("http://localhost:3000/binary/image");
const total = Number(resp.headers.get("content-length"));

const [imageStream, progressStream] = resp.body.tee();
```

**Progress tracking branch:**

```js
async function showProgress(stream) {
  let received = 0;
  const barLength = 30;
  const startTime = Date.now();

  for await (const chunk of stream) {
    received += chunk.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = received / elapsed;
    const speedKB = (speed / 1024).toFixed(1);

    const percent = received / total;
    const filled = Math.floor(percent * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

    const remaining = total - received;
    const etaSeconds = remaining / speed;
    const eta = etaSeconds > 0 ? `${etaSeconds.toFixed(1)}s` : "0s";

    process.stdout.write(
      `\rDownloading: ${bar} ${(percent * 100).toFixed(1)}% (${speedKB} KB/s) ETA ${eta}`,
    );
  }
  process.stdout.write("\n");
}
```

**Data collection branch:**

```js
async function collectImage(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
```

Both branches run **concurrently**:

```js
const progressPromise = showProgress(progressStream);
const imagePromise = collectImage(imageStream);

await progressPromise;

const buffer = await imagePromise;
```

This demonstrates a real-world use of `tee()`: the same data stream is consumed independently for two different purposes without requiring the data to be buffered entirely before processing.

**Run it:**

```bash
node 02-http-streams/client/binary-reader.js
```

---

### 3. Server-Sent Events — `client/sse.js`

Two approaches to consuming SSE.

**Raw HTTP (Node `http` module):**

```js
import http from "http";

function parseRawChunk(str) {
  if (!str.includes("data: ")) return {};
  const [_prefix, JSONStr] = str.split("data: ");
  return JSON.parse(JSONStr);
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
```

The HTTP response (`res`) is a standard Node `Readable` stream. SSE data arrives as text chunks in the format `data: {...}\n\n`. The client must parse this format manually.

**EventSource API (via `eventsource` package):**

```js
import { EventSource } from "eventsource";

const es = new EventSource("http://localhost:3000/events");

es.onmessage = (event) => {
  console.log("Received:", event.data);
};

es.addEventListener("greeting", (event) => {
  console.log("Custom event:", event.data);
});
```

The `EventSource` API handles SSE protocol parsing, automatic reconnection, and named event routing. It is the standard browser API; the `eventsource` npm package provides a Node.js implementation.

> **Note:** The `EventSource` example is commented out in the source file. Uncomment it and comment the raw HTTP example to try it.

**Run it:**

```bash
node 02-http-streams/client/sse.js
```

Press `Ctrl+C` to disconnect.

---

### 4. Tee over HTTP — `client/tee.js`

Splits an HTTP response body into two readers: one fast, one artificially slow. This demonstrates that `tee()` branches are independent — a slow consumer on one branch does not block the other.

```js
const resp = await fetch("http://localhost:3000");
const body = resp.body;

const [body2, body3] = body.tee();
const reader = body2.getReader();
const reader2 = body3.getReader();

async function readAndLog(reader, slowReader = false) {
  const { done, value } = await reader.read();

  if (done) {
    reader.releaseLock();
    return;
  }

  const chunk = JSON.parse(new TextDecoder().decode(value));
  console.log("chunk", "slowReader ? ", slowReader, chunk);

  if (slowReader) await delay(2000);

  await readAndLog(reader, slowReader);
}

const reader1Promise = readAndLog(reader);
const reader2Promise = readAndLog(reader2, true);

await Promise.allSettled([reader1Promise, reader2Promise]);
```

The fast reader finishes well before the slow reader. The stream buffers data internally so the slow reader can catch up at its own pace.

**Run it:**

```bash
node 02-http-streams/client/tee.js
```

---

### 5. Transform Streams & Zipping — `client/transform.js`

The most advanced example. Fetches a stream of numbers from the server, tees it, applies different transformations to each branch, and then zips the two branches back into a single stream.

**Pipeline:**

```
Server (/generators) → numbers 1–10
        │
        ├── Branch 1 → TextDecoderStream → prefixStream()  → "The square of 5 is:"
        │
        └── Branch 2 → TextDecoderStream → toSquareStream() → "25"
                                                    │
                                              zipStreams() → "The square of 5 is: 25"
```

**Custom TransformStreams:**

```js
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
```

**Zipping two streams:**

```js
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
```

**Consumption:**

```js
const resp = await fetch("http://localhost:3000/generators");
const [body, body2] = resp.body.tee();

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
```

Key concepts:
- `pipeThrough()` connects a `ReadableStream` to a `TransformStream` and returns the transformed `ReadableStream`
- `TextDecoderStream` is a built-in `TransformStream` that converts bytes to strings
- Multiple `pipeThrough()` calls chain to form a pipeline
- `zipStreams()` creates a new `ReadableStream` that reads from two sources in lockstep using `Promise.all`

**Run it:**

```bash
node 02-http-streams/client/transform.js
```

---

## Web Streams API — Quick Reference

| Operation | Method |
|---|---|
| Create a readable | `new ReadableStream({ start(controller) {} })` |
| Create a transform | `new TransformStream({ transform(chunk, controller) {} })` |
| Decode bytes → text | `new TextDecoderStream()` |
| Chain a transform | `readable.pipeThrough(transformStream)` |
| Split a stream | `readable.tee()` |
| Low-level read | `readable.getReader().read()` |
| Iterate | `for await (const chunk of readable)` |

## Node ↔ Web Stream Conversion

| Direction | Method |
|---|---|
| Node → Web | `Readable.toWeb(nodeReadable)` |
| Web → Node | `Readable.fromWeb(webReadable)` |

These conversions are useful when mixing Node-native APIs (like `fs.createReadStream`) with Web Stream consumers (like `pipeThrough()`), as demonstrated in the binary streaming route.
