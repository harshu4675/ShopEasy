const mongoose = require("mongoose");

/**
 * MongoDB connection.
 *
 * The defaults are tuned for a free-tier host that idles the process: after a
 * cold start the first request pays for the whole handshake, and Mongoose's
 * 30s default server-selection timeout turns a transient blip into a request
 * that appears to hang. Failing fast and retrying is a much better experience
 * than a 30s stall.
 *
 * `bufferCommands: false` is deliberate: without it, queries issued before the
 * connection is ready queue silently and then all time out together with an
 * opaque "buffering timed out" error.
 */
const CONNECT_OPTIONS = {
  // Reused across the process; a free instance handles few concurrent requests
  // but the pool must survive bursts after a wake-up.
  maxPoolSize: 10,
  minPoolSize: 1,
  // Keep a warm socket so the next request after an idle period does not pay
  // for a fresh TCP + TLS handshake.
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 8_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
  compressors: ["zlib"],
};

let connecting = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  // Fail loudly at boot rather than on the first query.
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  connecting = mongoose
    .connect(process.env.MONGO_URI, CONNECT_OPTIONS)
    .then((conn) => {
      console.log("MongoDB connected");
      return conn;
    })
    .catch((error) => {
      connecting = null;
      console.error("MongoDB connection error:", error.message);
      throw error;
    });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
    connecting = null;
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
  });

  return connecting;
};

module.exports = connectDB;
