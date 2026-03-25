# Stream Fundamentals in Node.js

This section introduces the foundational concepts of streams. Every example here runs independently and demonstrates a different way to create and consume streams.

## What Is a Stream?

A stream is an abstraction for sequential data. Instead of loading an entire dataset into memory, a stream processes it piece by piece — one **chunk** at a time.

This matters when:

- The data is **large** (a 5 GB file should not be loaded into RAM)
- The data is **continuous** (HTTP responses, user input, sensor data)
- The data needs **transformation** (compression, parsing, encoding)

## The Four Stream Types

Node.js provides four base stream classes in the `stream` module:

| Type | Purpose | Example |
|---|---|---|
| **Readable** | Source of data | `fs.createReadStream()`, `process.stdin` |
| **Writable** | Destination for data | `fs.createWriteStream()`, `process.stdout` |
| **Transform** | Modifies data as it passes through | `zlib.createGzip()` |
| **Duplex** | Both Readable and Writable | TCP socket |

All streams are EventEmitters. Readable streams emit `data`, `end`, and `error` events. Writable streams respond to `write()` and `end()` calls.

## Node Streams vs Web Streams

Node.js supports two stream APIs:

| | Node Streams | Web Streams |
|---|---|---|
| **Module** | `stream` | Global (`ReadableStream`, `WritableStream`, `TransformStream`) |
| **Origin** | Node.js core | WHATWG spec (browser-compatible) |
| **Consumer** | `.pipe()`, `.on("data")` | `.getReader()`, `.pipeThrough()` |
| **Interop** | `Readable.toWeb()` / `Readable.fromWeb()` | — |

Both APIs appear in this repository. The basics section uses Node streams; the `tee.js` example uses the Web Streams API.

---

## Examples

### 1. Basic Readable Stream — `index.js`

This example demonstrates two ways to create Readable streams.

**Creating a stream from an array:**

```js
Readable.from(["Hello ", "World", "\n"]).pipe(process.stdout);
```

`Readable.from()` accepts any iterable and wraps it in a Readable stream. `pipe()` connects it to `process.stdout`, which is a Writable stream.

**Creating a stream with a custom `read()` implementation:**

```js
const stream = new Readable({
  async read() {
    if (!printOnce) printOnce = true;
    else return;

    this.push("Lorem ");
    await delay(1000);

    this.push("Ipsum ");
    await delay(1000);

    this.push("Dolor ");
    await delay(1000);

    this.push("sit ");
    await delay(1000);

    this.push(null); // signals end of stream
  },
});

stream.pipe(process.stdout);
```

Key points:
- `this.push(chunk)` enqueues data into the stream's internal buffer
- `this.push(null)` signals that no more data will be produced (end of stream)
- `read()` is called by the stream infrastructure when the consumer is ready for more data
- The delays simulate a slow data source (database query, API call, etc.)

**Run it:**

```bash
node 01-basics/index.js
```

You will see "Hello World" printed immediately, followed by "Lorem Ipsum Dolor sit" appearing one word per second.

---

### 2. File System Streams — `file-system.js`

The most common use of streams: reading and writing files.

```js
import fs from "fs";

const reader = fs.createReadStream(filePath);
const writer = fs.createWriteStream("/tmp/output.txt");

// Event-based consumption
reader.on("data", function (chunk) {
  console.log(chunk.toString());
});

// Direct writing
writer.write("Writing to a writeable stream");

// Piping: connect reader output → writer input
reader.pipe(writer);
```

**How file streams work internally:**

1. Node opens a **file descriptor** (an integer) via the OS kernel
2. The stream requests data in chunks, sized by its `highWaterMark` (default: 64 KB for file streams)
3. The OS reads from disk into its **page cache** (kernel memory), then copies the chunk into a Node.js `Buffer` (user-space memory)
4. The stream emits a `data` event with the chunk
5. This repeats until the file is fully read (EOF)

Memory usage stays bounded regardless of file size. A 5 GB file uses ~64 KB of memory at any given moment.

**Run it:**

```bash
node 01-basics/file-system.js
```

> **Note:** This example reads `test.txt` from the repo root and writes the output to `/tmp/output.txt`.

---

### 3. Streams from Iterables and Generators — `iterables.js`

`Readable.from()` converts any iterable into a Readable stream. This is the most modern and concise way to create streams.

**From an array:**

```js
const arrayStream = Readable.from([1, 2, 3, 4, 5]);
arrayStream.on("data", console.log);
```

**From a synchronous generator:**

```js
function* generatorSync() {
  yield "a";
  yield "b";
  yield "c";
}

const generatorStream = Readable.from(generatorSync());

for await (const value of generatorStream) {
  console.log("sync generator value is: ", value);
}
```

**From an async generator:**

```js
async function* asyncGenerator() {
  yield "a";
  await new Promise((r) => setTimeout(r, 1000));
  yield "b";
}

const asyncGeneratorStream = Readable.from(asyncGenerator());

for await (const value of asyncGeneratorStream) {
  console.log("async generator value is: ", value);
}
```

The `for await...of` loop is the **pull model** of consumption. The loop requests the next value, the generator yields it, and the loop processes it before requesting the next one. This means backpressure is implicit — the producer cannot outrun the consumer.

**Quick reference:**

| Source | Method |
|---|---|
| Array | `Readable.from(array)` |
| Sync generator | `Readable.from(generator())` |
| Async generator | `Readable.from(asyncGenerator())` |
| String | `Readable.from("hello")` |
| Buffer | `Readable.from(Buffer.from("hello"))` |

**Run it:**

```bash
node 01-basics/iterables.js
```

---

### 4. Process Streams — `process-streams.js`

Node.js exposes three global streams on the `process` object:

| Stream | Type | Purpose |
|---|---|---|
| `process.stdin` | Readable | Standard input (keyboard, piped input) |
| `process.stdout` | Writable | Standard output |
| `process.stderr` | Writable | Standard error |

This example reads from `stdin`, transforms the input to uppercase, and writes the result to `stdout`:

```js
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  const input = chunk.trim();

  if (!input) {
    process.stderr.write("ERROR: Empty input\n");
    return;
  }

  try {
    const result = chunk.toUpperCase();
    process.stdout.write(`OUTPUT: ${result}`);
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
  }
});

process.stdin.on("end", () => {
  process.stdout.write("\nDone processing\n");
});
```

This is the foundation of Unix-style stream pipelines in Node.js. You can pipe data into this script from the shell:

```bash
echo "hello world" | node 01-basics/process-streams.js
```

Or run it interactively and type input:

```bash
node 01-basics/process-streams.js
```

---

### 5. Tee — Splitting a Stream — `tee.js`

`tee()` creates two independent branches from a single stream. Both branches receive every chunk produced by the source.

This example uses the **Web Streams API** (`ReadableStream`), not Node's `stream` module:

```js
const stream = new ReadableStream({
  start(controller) {
    let count = 1;

    const interval = setInterval(() => {
      console.log("Producing:", count);
      controller.enqueue(count++);

      if (count > 6) {
        clearInterval(interval);
        controller.close();
      }
    }, 500);
  },
});

const [stream1, stream2] = stream.tee();
```

The source produces values 1–6 at 500ms intervals. `tee()` splits it into two independent `ReadableStream` instances:

```js
async function readStream(name, stream) {
  const reader = stream.getReader();

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      console.log(`${name}: done`);
      break;
    }

    console.log(`${name} got:`, value);
    await new Promise((r) => setTimeout(r, Math.random() * 1000));
  }
}

readStream("Reader A", stream1);
readStream("Reader B", stream2);
```

Key points:
- Each reader consumes at its own pace (notice the random delay)
- Reader A finishing does not affect Reader B
- `getReader()` locks the stream — only one reader can hold the lock at a time
- `reader.releaseLock()` should be called when done (happens implicitly when the loop exits here)

**Web Streams API pattern:**

| Operation | Method |
|---|---|
| Create | `new ReadableStream({ start(controller) {} })` |
| Enqueue data | `controller.enqueue(value)` |
| Close stream | `controller.close()` |
| Read data | `stream.getReader().read()` |
| Split stream | `stream.tee()` |

**Run it:**

```bash
node 01-basics/tee.js
```

---

## Ways to Create Streams — Summary

| # | Source | Method | Example |
|---|---|---|---|
| 1 | File | `fs.createReadStream()` | `file-system.js` |
| 2 | Array / Iterable | `Readable.from()` | `iterables.js` |
| 3 | Sync generator | `Readable.from(gen())` | `iterables.js` |
| 4 | Async generator | `Readable.from(asyncGen())` | `iterables.js` |
| 5 | Custom producer | `new Readable({ read() {} })` | `index.js` |
| 6 | Process I/O | `process.stdin` / `process.stdout` | `process-streams.js` |
| 7 | Web Streams API | `new ReadableStream({ start() {} })` | `tee.js` |
| 8 | Events / Manual push | `stream.push(data)` | `index.js` |

## Libraries That Use Streams

Streams are pervasive across the Node.js ecosystem:

| Category | Libraries / APIs |
|---|---|
| File I/O | `fs`, `readline` |
| HTTP | `http`, `https`, `fetch`, Axios, Got |
| Compression | `zlib`, `archiver` |
| Crypto | `crypto.createHash()`, `crypto.createCipher()` |
| Data Processing | `csv-parser`, `JSONStream` |
| Uploads | Multer, Busboy |
| Cloud SDKs | AWS S3, Google Cloud Storage |
| Build Tools | Gulp, Webpack |
| Databases | pg (query streaming), Mongoose (cursors) |

The universal pattern is:

```
source.pipe(transform1).pipe(transform2).pipe(destination)
```

This is the Unix pipe philosophy applied to JavaScript.
