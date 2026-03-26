const mongoose = require("mongoose");
const { getConfig } = require("../config");

let isConnected = false;

/**
 * Ensures reasonable defaults for Mongoose behavior.
 * Keeping strictQuery enabled (default in newer versions) is fine for this app.
 */
function configureMongoose() {
  mongoose.set("strictQuery", true);
}

// PUBLIC_INTERFACE
async function connectMongo() {
  /**
   * Connects to MongoDB using Mongoose.
   * Uses config.mongo.uri and optional config.mongo.dbName.
   *
   * Returns: mongoose.Connection
   */
  if (isConnected) return mongoose.connection;

  const config = getConfig();
  if (!config.mongo?.uri) {
    throw new Error(
      "MongoDB not configured. Please set REACT_APP_MONGODB_URI in the backend environment."
    );
  }

  configureMongoose();

  await mongoose.connect(config.mongo.uri, {
    dbName: config.mongo.dbName || undefined,
    // Note: serverSelectionTimeoutMS keeps startup from hanging too long in CI environments.
    serverSelectionTimeoutMS: 10_000,
  });

  isConnected = true;
  return mongoose.connection;
}

// PUBLIC_INTERFACE
async function disconnectMongo() {
  /**
   * Disconnects MongoDB connection (mainly useful for tests or graceful shutdown).
   */
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = { connectMongo, disconnectMongo };
