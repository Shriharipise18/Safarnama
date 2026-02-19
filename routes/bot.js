const { Router } = require('express');
const router = Router();

const SYSTEM_PROMPT = `
You are "Safarnama AI", a helpful and friendly travel assistant for the Safarnama blogging platform.
Your goals:
1. Help users with travel tips, destination ideas, and itinerary planning.
2. Explain how to use Safarnama (e.g., how to write a blog using templates, how to follow people, how to use the chat).
3. Be concise, polite, and enthusiastic about travel.
4. If asked about something you don't know, suggest they check the latest blogs on Safarnama.
5. Keep your responses modern and formatted with markdown if helpful.

Context about Safarnama:
- It's a travel blogging community.
- Features: Real-time chat, follower system, blog templates (Adventure, Review, Guide), and "Top Travelers" search.
`;

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.AI_API_KEY;
        const apiUrl = process.env.AI_API_URL;
        const modelName = process.env.AI_API_MODEL;

        if (!apiKey || !apiUrl || !modelName) {
            return res.status(500).json({
                success: false,
                message: "AI configuration (URL, Key, or Model) is missing in .env file."
            });
        }

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        // OpenAI-compatible request payload
        const payload = {
            model: modelName,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: message }
            ]
        };

        console.log(`[Bot Debug] Sending request to ${apiUrl} with model ${modelName}`);

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Bot Debug] API Error: ${response.status} - ${errorText}`);
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;

        if (reply) {
            return res.json({
                success: true,
                reply: reply
            });
        } else {
            throw new Error("Invalid response format from AI API");
        }

    } catch (error) {
        console.error("--- AI API Error Details ---");
        console.error("Message:", error.message);
        console.error("----------------------------");

        res.status(500).json({
            success: false,
            message: "I'm having trouble connecting to my brain right now. Please try again later.",
            actualError: error.message
        });
    }
});

module.exports = router;
