import app from "./app";
import { connectDB, env } from "./config";
import { logger } from "./utils/logger";

const startServer = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error(`❌ Failed to start server: ${(error as Error).message}`);
    process.exit(1);
  }
};

startServer();