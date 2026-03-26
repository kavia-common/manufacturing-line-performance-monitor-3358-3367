const { EventEmitter } = require("events");

const bus = new EventEmitter();
bus.setMaxListeners(1000);

// PUBLIC_INTERFACE
function publish(event) {
  /** Publish a realtime event to all subscribers. */
  bus.emit("event", event);
}

// PUBLIC_INTERFACE
function subscribe(handler) {
  /** Subscribe to realtime events; returns an unsubscribe function. */
  bus.on("event", handler);
  return () => bus.off("event", handler);
}

module.exports = { publish, subscribe };
