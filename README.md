# ☁️ Cloud5 AI
**A High-Availability, Multi-Modal AI Assistant Built with Next.js**
Use in - https://cloud5-personalized-ai-chat-bot.vercel.app/

Cloud5 is a cutting-edge, highly resilient web application that seamlessly blends text generation, image creation, and visual question answering (VQA). Engineered with enterprise-grade "Fallback Cascades," Cloud5 guarantees near 100% uptime by dynamically routing requests across 5 different state-of-the-art AI models.

## ✨ Core Features

### 🧠 5-Layer Text Generation Cascade
Cloud5 doesn't rely on a single brain. If the primary model experiences downtime, the backend API automatically catches the error and seamlessly routes the user's prompt to the next available model in milliseconds.
1. **Primary:** OpenAI GPT-4.1
2. **Fallback 1:** Google Gemma-3 (4B)
3. **Fallback 2:** Mistral-7B Instruct
4. **Fallback 3:** Meta Llama-3 (8B)
5. **Fallback 4:** IBM Granite (258M)

### 🎭 Dynamic AI Personas
Users can switch Cloud5's core personality on the fly using a custom System Prompt injector:
* **Default:** Standard, factual assistant.
* **Coding Mentor:** Guides users through C, C++, Java, and Data Structures without just giving away the answer.
* **Sustainability Expert:** Brainstorms gamified green tech and social impact projects.
* **Creative Writer:** Crafts engaging narratives inspired by K-dramas and deep gaming lore.

### 🎨 Resilient Image Generation
Generates high-fidelity images using **Stable Diffusion XL**, with automatic fallbacks to **DALL-E 2** and **SD v1.4**. Generated raw binary data is processed into Base64 and permanently stored using **Cloudinary Unsigned Uploads** to bypass standard database size limitations.

### 👁️ Visual Question Answering (VQA)
Users can upload images directly into the chat. Cloud5 uses **Salesforce BLIP-VQA** (falling back to **CQI Document Reader**) to "see" the image and answer specific questions about its contents.

### 🛡️ Security & Rate Limiting
* **Firebase Google Authentication:** Secure user login and session management.
* **Firestore Database:** Real-time chat history saving.
* **Smart Throttling:** Unauthenticated users get 2 free preview messages. Logged-in users are dynamically limited to 1 image generation and 3 vision uploads per day to protect API bandwidth.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons
* **Backend:** Next.js Serverless Route Handlers
* **AI Provider:** Bytez.js API
* **Database & Auth:** Google Firebase / Firestore
* **Image Hosting:** Cloudinary
* **Markdown Parsing:** React-Markdown, Remark-GFM

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/cloud5-app.git](https://github.com/YOUR_GITHUB_USERNAME/cloud5-app.git)
cd cloud5-app