import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

async function dbConnect() {
  try {
    await mongoose.connect(MONGODB_URI!);
    return mongoose;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export default dbConnect;
