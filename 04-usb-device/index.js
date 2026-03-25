import { HID, devices } from "node-hid";

const _devices = devices();
console.log(_devices);

const asusMD100VendorID = 2821;
const asusMD100OProductID = 6673;

const device = new HID(asusMD100VendorID, asusMD100OProductID);

device.on("data", (data) => {
	console.log(data);

	const bytes = [...data]; // easier to inspect

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
