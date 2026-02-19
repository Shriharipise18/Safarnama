document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat initialization starting...');
    console.log('Current User ID:', window.currentUserId);

    const socket = io();
    const conversationList = document.getElementById('conversationList');
    const chatWindow = document.getElementById('chatWindow');

    let currentConversationId = null;
    let onlineUsers = new Set();

    if (!window.currentUserId) {
        console.error('window.currentUserId is MISSING. Check chat.ejs template.');
        if (conversationList) conversationList.innerHTML = '<div class="alert alert-danger m-3">Authentication error. Please sign in again.</div>';
        return;
    }

    // Initial load
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user');

    if (targetUserId) {
        console.log('Initiating chat with user:', targetUserId);
        initChatWithUser(targetUserId);
    } else {
        console.log('Loading conversation list...');
        loadConversations();
    }

    async function initChatWithUser(userId) {
        try {
            const response = await fetch(`/chat/api/conversation/user/${userId}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const conv = await response.json();
            console.log('Conversation initiated/found:', conv);

            await loadConversations();

            const participant = conv.participants.find(p => p._id.toString() !== window.currentUserId.toString()) || conv.participants[0];
            selectConversation(conv._id, participant);
        } catch (err) {
            console.error('Error initiating chat:', err);
            loadConversations();
        }
    }

    async function loadConversations() {
        try {
            const response = await fetch('/chat/api/conversations');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const conversations = await response.json();
            console.log('Loaded conversations:', conversations.length);
            renderConversationList(conversations);
        } catch (err) {
            console.error('Error loading conversations:', err);
            if (conversationList) conversationList.innerHTML = '<div class="text-center p-4 text-danger">Failed to load conversations. <button onclick="location.reload()" class="btn btn-sm btn-link">Retry</button></div>';
        }
    }

    function renderConversationList(conversations) {
        if (!conversationList) return;
        conversationList.innerHTML = '';

        if (conversations.length === 0) {
            conversationList.innerHTML = '<div class="text-center p-4 text-muted">No conversations yet</div>';
            return;
        }

        conversations.forEach(conv => {
            try {
                // Find the participant that is NOT the current user
                const participant = conv.participants.find(p => p._id.toString() !== window.currentUserId.toString());

                if (!participant) {
                    console.warn('No other participant found for conversation:', conv._id);
                    return;
                }

                const item = document.createElement('div');
                item.className = `conversation-item ${conv._id === currentConversationId ? 'active' : ''}`;
                item.dataset.id = conv._id;

                item.innerHTML = `
                    <div class="avatar-container">
                        <img src="${participant.fullName.includes('Safarnama AI') ? '/images/ai-avatar.svg' : (participant.profileImageURL || '/images/default.png')}" class="profile-img-sm" style="width: 45px; height: 45px;" onerror="this.src='/images/default.png'">
                        <div class="status-dot ${participant.fullName.includes('Safarnama AI') || onlineUsers.has(participant._id) ? 'online' : ''}" id="status-${participant._id}"></div>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between">
                            <h6 class="mb-0 text-truncate">${participant.fullName}</h6>
                            <small class="text-muted">${conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                        </div>
                        <small class="text-muted text-truncate d-block">${conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}</small>
                    </div>
                `;

                item.onclick = () => selectConversation(conv._id, participant);
                conversationList.appendChild(item);
            } catch (err) {
                console.error('Error rendering conversation item:', err, conv);
            }
        });
    }

    async function selectConversation(id, participant) {
        console.log('Selecting conversation:', id, participant);
        currentConversationId = id;

        // UI updates
        document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.conversation-item[data-id="${id}"]`)?.classList.add('active');

        // Show chat window on mobile
        const chatLayout = document.querySelector('.chat-layout');
        if (chatLayout) chatLayout.classList.add('chat-open');

        // Setup Chat Window
        chatWindow.innerHTML = `
            <div class="chat-header">
                <button class="back-btn" id="backToList">
                    <i data-lucide="chevron-left"></i>
                </button>
                <img src="${participant.fullName.includes('Safarnama AI') ? '/images/ai-avatar.svg' : (participant.profileImageURL || '/images/default.png')}" class="profile-img-sm" style="width: 40px; height: 40px;" onerror="this.src='/images/default.png'">
                <div>
                    <h6 class="mb-0">${participant.fullName}</h6>
                    <small class="${participant.fullName.includes('Safarnama AI') || onlineUsers.has(participant._id) ? 'text-success' : 'text-muted'}" id="presence-${participant._id}">
                        ${participant.fullName.includes('Safarnama AI') ? 'AI Assistant' : (onlineUsers.has(participant._id) ? 'Online' : 'Offline')}
                    </small>
                </div>
            </div>
            <div class="messages-container" id="messagesContainer">
                <div class="text-center p-4"><div class="spinner-border text-primary"></div></div>
            </div>
            <div id="typingIndicator" class="typing-indicator" style="display: none;">${participant.fullName} is typing...</div>
            <div class="chat-footer">
                <form class="message-form" id="messageForm">
                    <input type="file" id="imageInput" accept="image/*" style="display: none;">
                    <button type="button" class="chat-action-btn attach-btn" id="attachBtn" title="Attach image">
                        <i data-lucide="paperclip"></i>
                    </button>
                    <input type="text" class="message-input" id="messageInput" placeholder="Type a message..." autocomplete="off">
                    <button type="submit" class="chat-action-btn send-btn" id="sendBtn" title="Send message">
                        <i data-lucide="send"></i>
                    </button>
                </form>
            </div>
        `;

        // Handle back button
        const backBtn = document.getElementById('backToList');
        if (backBtn) {
            backBtn.onclick = () => {
                chatLayout.classList.remove('chat-open');
                currentConversationId = null;
                // Optional: remove active class from list
                document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
            };
        }

        // Re-initialize Lucide icons for the new HTML
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        const messagesContainer = document.getElementById('messagesContainer');
        const messageForm = document.getElementById('messageForm');
        const messageInput = document.getElementById('messageInput');
        const attachBtn = document.getElementById('attachBtn');
        const imageInput = document.getElementById('imageInput');

        // Image attach logic
        attachBtn.onclick = () => imageInput.click();

        imageInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload-image', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.location) {
                    socket.emit('send_message', {
                        conversationId: id,
                        content: data.location,
                        messageType: 'image'
                    });
                }
            } catch (err) {
                console.error('Error uploading image:', err);
            }
            e.target.value = '';
        };

        // Join socket room
        socket.emit('join_conversation', id);

        // Load messages
        try {
            const response = await fetch(`/chat/api/messages/${id}`);
            const messages = await response.json();
            renderMessages(messages);
        } catch (err) {
            console.error('Error loading messages:', err);
        }

        // Handle Send
        messageForm.onsubmit = (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();
            if (!content) return;

            socket.emit('send_message', {
                conversationId: id,
                content: content
            });

            messageInput.value = '';
            socket.emit('typing', { conversationId: id, isTyping: false });
        };

        // Typing indicator logic
        let typingTimeout;
        messageInput.oninput = () => {
            socket.emit('typing', { conversationId: id, isTyping: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit('typing', { conversationId: id, isTyping: false });
            }, 2000);
        };
    }

    function renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        container.innerHTML = '';
        messages.forEach(msg => appendMessage(msg));
        container.scrollTop = container.scrollHeight;
    }

    function linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${url}</a>`;
        });
    }

    function appendMessage(msg) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        const isSent = msg.sender._id.toString() === window.currentUserId.toString();

        const div = document.createElement('div');
        div.className = `message-bubble ${isSent ? 'message-sent' : 'message-received'}`;

        let contentHtml = '';
        if (msg.messageType === 'image') {
            contentHtml = `<img src="${msg.content}" class="img-fluid rounded mb-1" style="max-width: 100%; cursor: pointer;" onclick="window.open('${msg.content}', '_blank')">`;
        } else {
            contentHtml = `<div class="content">${linkify(msg.content)}</div>`;
        }

        div.innerHTML = `
            ${contentHtml}
            <div class="text-end mt-1">
                <small class="time opacity-75" style="font-size: 0.7rem;">
                    ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
            </div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // Socket listeners
    socket.on('new_message', (msg) => {
        if (msg.conversationId === currentConversationId) {
            appendMessage(msg);
        }
        loadConversations();
    });

    socket.on('user_typing', (data) => {
        const indicator = document.getElementById('typingIndicator');
        if (data.conversationId === currentConversationId && indicator) {
            indicator.style.display = data.isTyping ? 'block' : 'none';
        }
    });

    socket.on('online_users', (userIds) => {
        onlineUsers = new Set(userIds);
        userIds.forEach(uid => {
            const dot = document.getElementById(`status-${uid}`);
            const presence = document.getElementById(`presence-${uid}`);
            if (dot) dot.classList.add('online');
            if (presence) {
                presence.innerText = 'Online';
                presence.classList.remove('text-muted');
                presence.classList.add('text-success');
            }
        });
    });

    socket.on('user_status', (data) => {
        const dot = document.getElementById(`status-${data.userId}`);
        const presence = document.getElementById(`presence-${data.userId}`);

        if (data.status === 'online') {
            onlineUsers.add(data.userId);
            if (dot) dot.classList.add('online');
            if (presence) {
                presence.innerText = 'Online';
                presence.classList.remove('text-muted');
                presence.classList.add('text-success');
            }
        } else {
            onlineUsers.delete(data.userId);
            if (dot) dot.classList.remove('online');
            if (presence) {
                presence.innerText = 'Offline';
                presence.classList.remove('text-success');
                presence.classList.add('text-muted');
            }
        }
    });
});
