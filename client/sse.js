const eventSource = new EventSource("http://localhost:3000/events");

eventSource.addEventListener("message", (event) => {
	console.log("Received data:", event.data);
});

eventSource.addEventListener("open", () => {
	console.log("SSE connection opened.");
});

eventSource.addEventListener("error", (err) => {
	console.error("EventSource failed:", err);
	eventSource.close();
});
