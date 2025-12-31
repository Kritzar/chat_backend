import dotenv from "dotenv";
import 'dotenv/config';
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import express from 'express';
import helmet from "helmet";
import cors from "cors";
import MainController from "./controller/main.js";
//import { prisma } from "";
import cron from 'node-cron';
dotenv.config({ path: '././.env' });
const PORT = process.env.PORT || 8080;
const app = express();
//middlewhare
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());
app.use(helmet());
const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST || '47.129.54.96',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'test',
    password: process.env.DATABASE_PASSWORD || 'Kriti1234',
    database: process.env.DATABASE_NAME || 'chat',
});
const prisma = new PrismaClient({ adapter });
app.get("/", (req, res) => {
    res.send("welcome to my note application");
});
app.post("/chat", MainController.handleGeminiChat);
app.get("/history/:sessionId", MainController.getChatHistory);
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});
cron.schedule('0 0 * * *', async () => {
    console.log(' Midnight Database Cleanup ');
    try {
        const deletedMessages = await prisma.message.deleteMany({
            where: {
                createdAt: {
                    lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
                }
            }
        });
        const deletedSessions = await prisma.conversation.deleteMany({
            where: {
                messages: {
                    none: {}
                }
            }
        });
        console.log(`Cleanup Successful: Removed ${deletedMessages.count} messages.`);
    }
    catch (error) {
        console.error('Cleanup Failed:', error);
    }
});
export { prisma };
