import dotenv from "dotenv";
dotenv.config();
import {
  getShard1Client,
  getShard2Client,
  closePrismaClients,
} from "./shared/database/prisma-client.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

//Intialise prisma clients
async function initializeDatabase(): Promise<void> {
  try {
    await Promise.all([
      getShard1Client().$connect(),
      getShard2Client().$connect(),
    ]);

    console.log('Successfully connected to all database shards.');
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received");
  await closePrismaClients();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received");
  await closePrismaClients();
  process.exit(0);
});
