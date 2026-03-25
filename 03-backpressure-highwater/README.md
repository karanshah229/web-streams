# Backpressure & highWaterMark

This section covers the two most critical flow-control concepts in Node.js streams: **highWaterMark** (the buffer threshold) and **backpressure** (the mechanism that prevents producers from overwhelming consumers).

## What Is highWaterMark?

`highWaterMark` is the maximum amount of data a stream will buffer internally before it stops requesting more from the source.

**Mental model:** Think of a stream as a bucket. `highWaterMark` is the bucket's capacity. When the bucket is full, the faucet (data source) turns off until the bucket is drained.

### Defaults

| Stream Type | Default highWaterMark |
|---|---|
| File streams (`fs.createReadStream`) | 64 KB |
| Generic `Readable` | 16 KB |
| Object mode streams | 16 objects |

### What It Controls

`highWaterMark` is a **threshold**, not a strict chunk size. It determines when the stream should stop pulling data, not the exact size of each chunk. In practice, for file streams, chunk sizes closely match the `highWaterMark` value.

### Effects of Tuning

| Small highWaterMark | Large highWaterMark |
|---|---|
| Lower memory per stream | Higher memory per stream |
| More syscalls (overhead) | Fewer syscalls |
| Lower latency (data arrives sooner) | Higher throughput (more data per read) |
| Better for real-time processing | Better for batch processing |

> **Note:** `highWaterMark` is a per-stream setting. Ten concurrent streams with a 1 MB `highWaterMark` means ~10 MB of buffer memory across those streams.

## What Is Backpressure?

Backpressure is the mechanism by which a consumer tells a producer to **slow down**. Without it, a fast producer paired with a slow consumer would flood memory until the process crashes.

**Example:** A 5 GB file being read and piped to a slow network connection. Without backpressure, the entire file would be buffered in memory. With backpressure, only a few chunks are held in memory at any time.

### How Backpressure Works

The internal flow when using `pipe()`:

```
ReadStream reads data
       ↓
Transform processes slowly
       ↓
Internal buffer fills up
       ↓
Buffer reaches highWaterMark
       ↓
writable.write() returns false
       ↓
ReadStream pauses automatically
       ↓
Consumer drains (writable emits "drain")
       ↓
ReadStream resumes
```

The key signals:

| Signal | Meaning |
|---|---|
| `writable.write(chunk)` returns `false` | Buffer is full — stop writing |
| `writable` emits `"drain"` | Buffer has drained — safe to resume |
| `readable.pause()` | Manually stop reading |
| `readable.resume()` | Manually resume reading |

When using `pipe()`, this coordination happens **automatically**. When writing manually, you must handle these signals yourself.

### How _read() and the Internal Buffer Interact

When you create a Readable stream with a custom `read()` method:

```js
new Readable({
  highWaterMark: 3,
  read() {
    this.push("A");
  }
});
```

The internal loop is:

1. Buffer is empty
2. Node sees `buffer < highWaterMark` → calls `_read()`
3. You call `this.push(chunk)` → buffer fills
4. Once `buffer ≥ highWaterMark` → Node **stops** calling `_read()`
5. Consumer reads data → buffer drains
6. Node calls `_read()` again

`_read()` is **pull-based**: the stream infrastructure decides when to call it, based on the buffer level and the consumer's consumption rate.

## Push vs Pull: Two Models of Backpressure

### Pull Model (Async Iterators)

```js
for await (const chunk of stream) {
  await slowOperation(chunk);
}
```

- Consumer controls when the next value is requested
- Producer cannot outrun consumer
- Backpressure is **implicit** — the loop does not call `reader.read()` until the current chunk is processed

### Push Model (Event-Based)

```js
stream.on("data", (chunk) => {
  process(chunk);
});
```

- Producer pushes data as fast as it can
- Consumer must explicitly signal when it is overwhelmed
- Backpressure requires **explicit coordination**: `pause()`, `resume()`, `drain`

### pipe() — Hybrid

```js
readable.pipe(writable);
```

- Uses the push model internally
- Implements backpressure automatically
- The writable buffer fills → `write()` returns `false` → readable pauses → writable drains → readable resumes

### Summary

| Model | Backpressure Style | Example |
|---|---|---|
| Pull | Automatic (consumer controls flow) | `for await...of` |
| Push | Explicit signals (`pause`, `drain`) | `.on("data")` |
| `pipe()` | Automatic (handles signals internally) | `readable.pipe(writable)` |

> **Core insight:** Backpressure is about **rate matching** between producer and consumer. It exists in both push and pull models — just implemented differently.

## The Unification: Streams, Generators, and Async Iterators

A Node.js Readable stream is essentially an **async iterator with buffering and backpressure built in**.

```
Generator (sync pull)
         ↓
Async Generator (async pull)
         ↓
Node Stream = Async Generator + Buffer (highWaterMark) + Backpressure + Push mode
```

Conversions:

| Direction | Method |
|---|---|
| Generator → Stream | `Readable.from(generator())` |
| Async generator → Stream | `Readable.from(asyncGenerator())` |
| Stream → Async iterator | `for await (const chunk of stream)` |

If you understand `for await (const chunk of source) { await process(chunk); }`, you understand streams, backpressure, and `highWaterMark` — the buffer is just an optimization happening behind the scenes.

---

## Example — `index.js`

This example reads a large file through a `Transform` stream that processes chunks at **variable speed**, demonstrating backpressure in action.

```js
import fs from "fs";
import { Transform } from "stream";
import { delay } from "../utils.js";

let chunkCount = 0;

const slowProcessor = new Transform({
  async transform(chunk, encoding, callback) {
    chunkCount++;

    let processingTime =
      chunkCount < 5 ? 350 : chunkCount < 10 ? 750 : 1500;

    console.log(
      `Chunk #${chunkCount} | Delay: ${processingTime}ms | Chunk Length: ${chunk.length}`,
    );

    await delay(processingTime);

    callback(null, chunk); // pass chunk forward
  },
});

console.log("Stream outputted to /tmp/output.txt");
console.log("Run `tail -f /tmp/output.txt` to watch the file grow");

fs.createReadStream(filePath, {
  highWaterMark: 128 * 1024, // 128KB blocks
})
  .pipe(slowProcessor)
  .pipe(fs.createWriteStream("/tmp/output.txt"));
```

### What This Demonstrates

**Pipeline:**

```
fs.createReadStream (128 KB chunks)
       ↓
slowProcessor (Transform — variable delay)
       ↓
fs.createWriteStream ("/tmp/output.txt")
```

**Speed schedule:**

| Chunk Range | Processing Time | Simulates |
|---|---|---|
| Chunks 1–4 | 350ms | Fast processing |
| Chunks 5–9 | 750ms | Moderate load |
| Chunks 10+ | 1500ms | Heavy bottleneck (API calls, DB writes) |

**Backpressure behavior:**

- When `slowProcessor` is fast (350ms), `createReadStream` reads at full speed
- As `slowProcessor` slows down, its internal buffer fills toward `highWaterMark`
- Once full, `pipe()` pauses the read stream automatically
- When the transform catches up, `pipe()` resumes reading

You do not write any `pause()` / `resume()` / `drain` code. The `pipe()` call handles all of it.

### Observing the Output

Run in one terminal:

```bash
node 03-backpressure-highwater/index.js
```

In another terminal, watch the output file grow:

```bash
tail -f /tmp/output.txt
```

You will see the chunks logged with increasing delays. The output file grows in bursts — fast at first, then slowing as the simulated processing bottleneck kicks in. This is backpressure in action: the file system reader adapts its pace to match the consumer's capacity.

### Why Transform Streams Are Preferred

The same behavior could be achieved with manual `pause()` / `resume()`:

```js
stream.on("data", async (chunk) => {
  stream.pause();
  await process(chunk);
  stream.resume();
});
```

But `pipe()` with a `Transform` is superior because:

| Manual pause/resume | Transform + pipe() |
|---|---|
| Learning / experimental use | Production-grade |
| You manage flow control | Backpressure is automatic |
| Error handling is your responsibility | `pipeline()` handles errors |
| Easy to introduce memory leaks | Safe by design |

For production code, use `stream.pipeline()` instead of `.pipe()` — it adds proper error propagation and cleanup.
