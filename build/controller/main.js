import { prisma } from "../index.js";
import dotenv from "dotenv";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
//import { OpenAI } from "openai";
import crypto from "crypto";
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
// const model = genAI.getGenerativeModel({ 
//   model: "gemini-1.5-flash"},{apiVersion: "v1"});
//   systemInstruction:{
//     role: "system",
//     parts: [{ text: "You are the AI assistant for 'Lumina Electronics'. Support Hours: 9AM - 6PM EST. Shipping: Free over $50 worth of order. We ship to USA and Canada. Returns: 14-day no-questions-asked policy. Current Sale: 10% off with code SAVE10. If the user says something off-topic, politely tell them you can only help with store-related questions, then steer back to the topic.""}]
// }}, {apiVersion: "v1"});
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // Ensure this is in your .env
// });
// const SYSTEM_PROMPT = "You are the AI assistant for 'Lumina Electronics'. Support Hours: 9 AM - 6 PM EST. Shipping: Free over $50. We ship to USA and Canada. Returns: 14-day policy. Current Sale: 10% off with code SAVE10. If asked about CDs, polaroid cameras, or calculator watches, say we are updating our catalog. Stay store-related and avoid politics/religion or any other irrelevant topics.";
class MainController {
    static handleGeminiChat = async (req, res) => {
        const { message, sessionId } = req.body;
        if (!message || message.length > 1000) {
            return res.status(400).json({ error: "Invalid message length" });
        }
        else if (message.trim().length < 2) {
            return res.status(400).json({ error: "Please type a valid message" });
        }
        else {
            try {
                const uuid = sessionId || crypto.randomUUID();
                // 3. Ensure Conversation exists (Upsert is cleaner than find + create)
                await prisma.conversation.upsert({
                    where: { id: uuid },
                    update: {}, // Do nothing if it exists
                    create: { id: uuid }
                });
                // 4. Save User Message
                await prisma.message.create({
                    data: {
                        conversationId: uuid,
                        sender: 'user',
                        content: message
                    }
                });
                // 5. Fetch History & Format for Gemini (CRITICAL: role must be 'model')
                const rows = await prisma.message.findMany({
                    where: { conversationId: uuid },
                    orderBy: { createdAt: 'asc' },
                    take: 3
                });
                // Remove the very last message from history because it's sent in sendMessage()
                const history = rows.slice(0, -1).map((msg) => ({
                    role: msg.sender === 'user' ? 'user' : 'model', // FIXED: 'ai' -> 'model'
                    parts: [{ text: msg.content }],
                }));
                // 6. Gemini API Call
                console.log("--- OUTGOING API CALL AT:", new Date().toISOString());
                const chat = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash-lite",
                    systemInstruction: "You are the AI assistant for 'Lumina Electronics'. Support Hours: 9AM - 6PM EST. Shipping: Free over $50 worth of order. We ship to USA and Canada. Returns: 14-day no-questions-asked policy. Current Sale: 10% off with code SAVE10. If asked about specific products introduced before 2000, say we are updating our catalog. If the user says something off-topic, politely tell them you can only help with store-related questions, then steer back to the topic.(1 line answers only).If the conversation resumes after a pause, look at the history to continue where the user left off"
                }).startChat({
                    history: history,
                });
                async function callGeminiWithRetry(chat, message, maxRetries = 3) {
                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            // Attempt the message
                            const result = await chat.sendMessage(message);
                            return result.response.text();
                        }
                        catch (error) {
                            // Check if it's a 429 (Rate Limit) error
                            if (error.status === 429 || error.message?.includes('429')) {
                                // Try to extract the retryDelay from the error object
                                const delayStr = error.response?.errorDetails?.find((d) => d['@type']?.includes('RetryInfo'))?.retryDelay;
                                // Convert '23s' to 23000ms, or fallback to 30s
                                const waitTime = delayStr ? parseInt(delayStr) * 1000 : 30000;
                                console.warn(`Rate limit hit. Waiting ${waitTime / 1000} seconds before retry ${i + 1}...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                continue; // Try again after waiting
                            }
                            // If it's not a 429, throw the error normally
                            throw error;
                        }
                    }
                    return null;
                }
                //const result = await chat.sendMessage(message); 
                const aiReply = await callGeminiWithRetry(chat, message);
                // const aiReply = response.text;
                console.log("--- OUTGOING API CALL AT:", new Date().toISOString());
                // 7. Save AI Response
                if (aiReply) {
                    await prisma.message.create({
                        data: {
                            conversationId: uuid,
                            sender: 'model', // Matches Gemini role for consistency
                            content: aiReply
                        }
                    });
                    // 8. Return response AND the uuid so the frontend can save it
                    res.json({ reply: aiReply, sessionId: uuid });
                }
            }
            catch (error) {
                console.error("Backend Error:", error);
                res.status(500).json({
                    error: "Internal Server Error",
                    details: error.message
                });
            }
        }
    };
    static getChatHistory = async (req, res) => {
        const { sessionId } = req.params;
        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }
        try {
            const rows = await prisma.message.findMany({
                where: {
                    conversationId: sessionId
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            const formattedHistory = rows.map((row) => ({
                text: row.content,
                sender: row.sender === 'model' ? 'bot' : 'user'
            }));
            res.json({ history: formattedHistory });
        }
        catch (error) {
            res.status(500).json({ error: "Could not load history" });
        }
    };
}
export default MainController;
