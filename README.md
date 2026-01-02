🛒 Lumina E-Shop & AI Chatbot
A modern, responsive e-commerce landing page featuring an intelligent customer support chatbot powered by Google Gemini AI. The project includes a persistent session system, message rate-limiting, and automatic chat history retrieval.

🌟 Features
Responsive Layout: Professional e-commerce design with a hero section, product grid, and integrated search bar.

Persistent AI Chat: Anonymous session tracking using sessionStorage (resets on tab close) or localStorage (permanent).

Smart History: Automatically retrieves previous messages from the database when the chat is opened or the page reloads.

Safe Interaction:

Rate Limiting: Restricts users to 6 messages per minute to prevent API abuse.

Total Message Cap: Limits users to 20 messages per session, directing them to official contact details thereafter.

Auto-Scroll: Smoothly scrolls to the latest message whenever the chat updates.

🛠️ Tech Stack
Frontend:

React (TypeScript): UI logic and state management.

CSS3: Custom styles with Flexbox/Grid for a professional look.

Lucide-React/Icons: For UI elements like shopping carts and search icons.

Backend:

Node.js & Express: API development.

Prisma ORM: Database management and querying.

Google Gemini AI SDK: Generative AI for chatbot responses.

MySQLL: Relational database for storing chat history.

1. Prerequisites
Node.js (v18+)

Gemini API Key (from Google AI Studio)

A running SQL Database

codes to run: npm install, node build/index.js

Note:check (chat_frontend repo for frontend implementation of the same)
