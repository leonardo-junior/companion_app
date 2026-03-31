import { createRealtimeServer } from "./server";

const server = createRealtimeServer();
console.log(`Realtime server listening on ws://localhost:${server.port}/ws`);
