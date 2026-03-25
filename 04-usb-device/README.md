# Hardware Streams — Reading a USB Device

Streams are not limited to files and networks. Any continuous source of data can be modeled as a stream — including hardware devices.

This section demonstrates reading raw data from a USB HID (Human Interface Device) mouse using Node.js streams. The data arrives as a continuous stream of byte arrays, each representing a snapshot of the device's state (button presses, movement, scroll).

## Concepts

### What Is HID?

HID (Human Interface Device) is a USB protocol designed for devices that interact directly with humans: mice, keyboards, game controllers, and similar peripherals. HID devices send small, frequent data packets that describe the device's current state.

### Why Streams?

A mouse generates data **continuously** while in use. This is a textbook stream use case:

- Data is small and frequent (a few bytes per event)
- Data is unbounded (the stream has no natural end)
- Each packet is independent and can be processed immediately
- No buffering of the entire dataset is needed or possible

### The Data Format

A typical USB HID mouse sends 3–4 bytes per report:

| Byte | Content |
|---|---|
| `bytes[0]` | Button state (bit flags) |
| `bytes[1]` | X movement (signed, -128 to 127) |
| `bytes[2]` | Y movement (signed, -128 to 127) |
| `bytes[3]` | Scroll wheel (signed, optional) |

Button bits:
- Bit 0 (`0x01`): Left button
- Bit 1 (`0x02`): Right button
- Bit 2 (`0x04`): Middle button

Movement values are **signed 8-bit integers** (two's complement). Values above 127 represent negative movement. The `toSigned()` helper handles this conversion.

---

## Examples

### 1. USB HID Mouse Reader — `index.js`

Uses the [`node-hid`](https://www.npmjs.com/package/node-hid) package to open a connection to a specific USB device and stream its data.

```js
import { HID, devices } from "node-hid";

const _devices = devices();
console.log(_devices);

const asusMD100VendorID = 2821;
const asusMD100OProductID = 6673;

const device = new HID(asusMD100VendorID, asusMD100OProductID);

device.on("data", (data) => {
  console.log(data);

  const bytes = [...data];

  // --- Raw bytes ---
  console.log("RAW:", bytes);

  // --- Buttons ---
  const buttons = bytes[0] || 0;

  const left = (buttons & 0x01) !== 0;
  const right = (buttons & 0x02) !== 0;
  const middle = (buttons & 0x04) !== 0;

  // --- Movement ---
  const moveX = toSigned(bytes[1] || 0);
  const moveY = toSigned(bytes[2] || 0);

  // --- Scroll (if present) ---
  const wheel = bytes.length > 3 ? toSigned(bytes[3]) : 0;

  console.log({
    left,
    right,
    middle,
    moveX,
    moveY,
    wheel,
  });

  console.log("----");
});

function toSigned(val) {
  return val > 127 ? val - 256 : val;
}
```

#### How It Works

1. `devices()` lists all connected HID devices with their vendor/product IDs
2. `new HID(vendorId, productId)` opens a connection to the specific device
3. The `HID` instance emits `"data"` events — it behaves as a Node.js Readable stream
4. Each `data` callback receives a `Buffer` containing the raw HID report
5. The bytes are parsed into human-readable button states and movement values

#### Adapting to Your Device

The Vendor ID and Product ID in the example (`2821` / `6673`) correspond to a specific ASUS MD100 mouse. To use a different device:

1. Run `devices()` and inspect the output
2. Find your device's `vendorId` and `productId`
3. Replace the constants in the code

#### Prerequisites

- A USB HID device must be physically connected
- On macOS, you may need to grant input monitoring permissions
- On Linux, you may need to set up udev rules or run with elevated privileges

**Run it:**

```bash
node 04-usb-device/index.js
```

Move your mouse — you will see raw byte arrays and parsed data logged in real time.

---

### 2. Raw Linux Device File — `linux.js`

On Linux, input devices are exposed as files under `/dev/input/`. This example reads the mouse aggregate device directly as a file stream.

```js
import fs from "fs";

const stream = fs.createReadStream("/dev/input/mice");

stream.on("data", (chunk) => {
  console.log(chunk);
});
```

This works because **everything is a file** in Linux. `/dev/input/mice` is a special device file that aggregates all mouse input. Reading it produces a continuous stream of 3-byte packets in the same format described above.

No third-party packages are needed — `fs.createReadStream()` on a device file produces a standard Node.js Readable stream.

> **Note:** This example only works on Linux. It requires read permissions on `/dev/input/mice` (typically requires root or membership in the `input` group).

**Run it (Linux only):**

```bash
sudo node 04-usb-device/linux.js
```

---

## Key Takeaway

Streams are a **universal interface** for sequential data. The same patterns used for reading files and HTTP responses apply identically to hardware I/O:

| Source | Stream API | Event |
|---|---|---|
| File | `fs.createReadStream()` | `"data"` |
| HTTP response | `resp.body` / `res.on("data")` | `"data"` |
| USB device | `new HID(...)` | `"data"` |
| Linux device file | `fs.createReadStream("/dev/...")` | `"data"` |

The consumer code is the same regardless of where the data comes from. This is the power of the stream abstraction.
