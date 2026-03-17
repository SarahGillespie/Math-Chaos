import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
let db;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db("mathchaos");
  console.log("Connected to MongoDB");
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected. Call connectDB() first.");
  return db;
}
