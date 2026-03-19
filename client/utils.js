export function delay(time = 2000) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
