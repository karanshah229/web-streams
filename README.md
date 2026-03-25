# Web Streams — Understanding Streams in JavaScript

A hands-on repository for learning streams in Node.js from the ground up. Each directory contains runnable examples and an accompanying article that explains the concepts in depth.

By the end of this repository, you will understand:

- What streams are and why they exist
- The four stream types: Readable, Writable, Duplex, and Transform
- How to create streams from files, iterables, generators, and custom sources
- How HTTP responses, Server-Sent Events, and binary data are streamed
- What backpressure is, how `highWaterMark` controls it, and why it matters
- How streams relate to async iterators and generators
- How streams extend to hardware I/O (USB devices)

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v24+ |
| pnpm | ≥ 10 |

## Setup

```bash
git clone https://github.com/karanshah229/web-streams.git
cd web-streams
pnpm install
```

## Repository Structure

```
web-streams/
├── 01-basics/             # Stream fundamentals
│   ├── README.md          # Article: Stream Fundamentals
│   ├── index.js           # Basic Readable streams
│   ├── file-system.js     # File read/write streams
│   ├── iterables.js       # Streams from arrays and generators
│   ├── process-streams.js # stdin, stdout, stderr
│   └── tee.js             # Splitting a stream with tee()
│
├── 02-http-streams/       # Streaming over HTTP
│   ├── README.md          # Article: HTTP Streaming
│   ├── server/            # Fastify server with streaming routes
│   │   ├── index.js
│   │   └── routes/
│   │       ├── index.js       # JSON chunk streaming
│   │       ├── generators.js  # Async generator route
│   │       ├── binary.js      # Binary image streaming
│   │       └── events.js      # Server-Sent Events
│   └── client/            # Client-side consumers
│       ├── simple-reader.js   # Async iteration + getReader()
│       ├── binary-reader.js   # Binary download with progress bar
│       ├── sse.js             # SSE consumption
│       ├── tee.js             # Tee over HTTP response
│       └── transform.js       # TransformStream + pipeThrough + zip
│
├── 03-backpressure-highwater/ # Backpressure & highWaterMark
│   ├── README.md              # Article: Backpressure & highWaterMark
│   └── index.js               # Transform stream with variable delay
│
├── 04-usb-device/         # Hardware streams
│   ├── README.md          # Article: Reading USB Devices
│   ├── index.js           # USB HID mouse reading (node-hid)
│   └── linux.js           # Raw /dev/input/mice reading
│
├── 05-new-streams/        # The New Streams API proposal
│   ├── ARTICLE.md         # Article: Redesigning the Web Streams API
│   ├── README.md          # Original proposal README
│   ├── API.md             # Complete API reference
│   ├── SLIDES.md          # Presentation deck
│   ├── docs/              # Design docs, migration guides
│   ├── src/               # TypeScript reference implementation
│   ├── samples/           # 17 runnable sample files
│   └── benchmarks/        # Performance comparisons
│
├── chat.txt               # Full Q&A reference on stream theory
├── utils.js               # Shared delay utility
└── package.json
```

## How to Use This Repository

### Recommended Reading Order

1. **[01-basics](./01-basics/README.md)** — Start here. Understand what streams are, how to create them, and the different stream sources available in Node.js.
2. **[02-http-streams](./02-http-streams/README.md)** — See streams in a real-world network context: HTTP chunked responses, binary streaming, SSE, and transform pipelines.
3. **[03-backpressure-highwater](./03-backpressure-highwater/README.md)** — Understand the critical flow-control mechanism that prevents memory overflow in stream pipelines.
4. **[04-usb-device](./04-usb-device/README.md)** — See how streams extend to hardware. A USB mouse is just another data source.
5. **[05-new-streams](./05-new-streams/ARTICLE.md)** — A proposal to redesign the entire API. Understand the flaws of current streams and what a modern alternative could look like.

### Running Examples

Every example is a standalone script. Run with:

```bash
node <path-to-example>
```

For example:

```bash
# Basics
node 01-basics/index.js
node 01-basics/file-system.js
node 01-basics/iterables.js
node 01-basics/process-streams.js
node 01-basics/tee.js

# HTTP (start server first, then run a client)
node 02-http-streams/server/index.js
node 02-http-streams/client/simple-reader.js

# Backpressure
node 03-backpressure-highwater/index.js
```

> **Note:** The `02-http-streams` examples require the Fastify server to be running. Start the server in one terminal before running any client script in another.

> **Note:** The `04-usb-device` examples require a physical USB HID device connected to your machine. The `linux.js` example only works on Linux.

## Key Concepts at a Glance

| Concept | What It Means |
|---|---|
| **Stream** | An abstraction for sequential data that can be consumed piece by piece, rather than all at once |
| **Readable** | A source of data (file, HTTP response, generator) |
| **Writable** | A destination for data (file, HTTP request body, stdout) |
| **Transform** | A stream that modifies data as it passes through |
| **Duplex** | A stream that is both Readable and Writable |
| **Pipe** | Connecting a Readable to a Writable: `readable.pipe(writable)` |
| **Backpressure** | The mechanism that slows the producer when the consumer cannot keep up |
| **highWaterMark** | The buffer threshold that triggers backpressure |
| **Tee** | Splitting one stream into two independent copies |
| **Batched Chunks** | Yielding `Uint8Array[]` per iteration to amortize async overhead (new streams proposal) |

## Reference

The [`chat.txt`](./chat.txt) file contains the full Q&A conversation that was used while building these examples. It covers theory, mental models, and comparisons (Node streams vs RxJS, push vs pull, etc.) in detail.

## License

ISC
