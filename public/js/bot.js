/**
 * Safarnama AI Chatbot Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const botToggleBtn = document.getElementById('botToggleBtn');
    const botCloseBtn = document.getElementById('botCloseBtn');
    const botContainer = document.getElementById('botContainer');
    const botForm = document.getElementById('botForm');
    const botInput = document.getElementById('botInput');
    const botMessages = document.getElementById('botMessages');
    const botTyping = document.getElementById('botTyping');

    let chatHistory = [];

    // Toggle Chat visibility
    botToggleBtn.addEventListener('click', () => {
        botContainer.classList.toggle('d-none');
        if (!botContainer.classList.contains('d-none')) {
            botInput.focus();
            scrollToBottom();
        }
    });

    botCloseBtn.addEventListener('click', () => {
        botContainer.classList.add('d-none');
    });

    // Handle form submission
    botForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = botInput.value.trim();
        if (!message) return;

        // Add user message to UI
        appendMessage('user', message);
        botInput.value = '';

        // Show typing indicator
        botTyping.classList.remove('d-none');
        scrollToBottom();

        try {
            const response = await fetch('/api/bot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatHistory
                })
            });

            const data = await response.json();
            botTyping.classList.add('d-none');

            if (data.success) {
                appendMessage('assistant', data.reply);
                // Update history for context
                chatHistory.push({ role: 'user', parts: [{ text: message }] });
                chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
            } else {
                appendMessage('assistant', data.message || "Oops, I hit a snag. Try again?");
            }
        } catch (error) {
            console.error("Bot API Error:", error);
            botTyping.classList.add('d-none');
            appendMessage('assistant', "I'm having trouble connecting to my brain. Please check your internet!");
        }
    });

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `bot-message ${role}`;

        // Use simple markdown-like formatting for links and bold
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');

        if (role === 'assistant') {
            msgDiv.innerHTML = `
                <img src="/images/ai-avatar.svg" alt="Bot" class="bot-avatar-sm">
                <div class="msg-content">${formattedText}</div>
            `;
        } else {
            msgDiv.innerHTML = `<div class="msg-content">${formattedText}</div>`;
        }

        botMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        botMessages.scrollTop = botMessages.scrollHeight;
    }
});
