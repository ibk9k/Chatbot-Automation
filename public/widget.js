(function () {
  // 1. Identify the script and read configuration
  const currentScript = document.currentScript || document.querySelector('script[data-client-id]');
  if (!currentScript) {
    console.error('RemotelyBot Widget error: Script tag not found or missing client identifier.');
    return;
  }

  const clientId = currentScript.getAttribute('data-client-id');
  if (!clientId) {
    console.error('RemotelyBot Widget error: data-client-id attribute is missing on the script tag.');
    return;
  }

  // 2. Resolve API Endpoint from script source (dynamic host mapping)
  const scriptSrc = currentScript.getAttribute('src') || '';
  let apiHost = '';
  if (scriptSrc.startsWith('http')) {
    try {
      const url = new URL(scriptSrc);
      apiHost = `${url.protocol}//${url.host}`;
    } catch (e) {
      console.error('RemotelyBot Widget: Failed to parse script URL', e);
    }
  }
  const apiUrl = `${apiHost}/api/chat`;

  // 3. Create host container and mount Shadow DOM to insulate styles
  const container = document.createElement('div');
  container.id = 'remotelybot-chat-widget-root';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // 4. Inject styles and markup
  shadow.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

      * {
        box-sizing: border-box;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      /* Floating Action Button */
      .chat-trigger {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        outline: none;
      }

      .chat-trigger:hover {
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 12px 30px rgba(79, 70, 229, 0.6);
      }

      .chat-trigger:active {
        transform: scale(0.95);
      }

      .chat-trigger svg {
        width: 28px;
        height: 28px;
        fill: white;
        transition: transform 0.3s ease;
      }

      .chat-trigger.open svg {
        transform: rotate(90deg);
      }

      /* Chat Window Panel */
      .chat-panel {
        position: absolute;
        bottom: 75px;
        right: 0;
        width: 380px;
        height: 580px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .chat-panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* Header */
      .chat-header {
        padding: 20px;
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .chat-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chat-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 16px;
        position: relative;
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
      }

      .chat-avatar::after {
        content: '';
        position: absolute;
        bottom: 1px;
        right: 1px;
        width: 10px;
        height: 10px;
        background-color: #22c55e;
        border: 2px solid white;
        border-radius: 50%;
      }

      .chat-title-container {
        display: flex;
        flex-direction: column;
      }

      .chat-title {
        font-size: 16px;
        font-weight: 600;
        color: #1e1b4b;
      }

      .chat-subtitle {
        font-size: 12px;
        color: #6b7280;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .chat-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      }

      .chat-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .chat-close svg {
        width: 18px;
        height: 18px;
        fill: #4b5563;
      }

      /* Messages Log Area */
      .chat-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        scroll-behavior: smooth;
      }

      .chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      .chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .chat-messages::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }

      .message-wrapper {
        display: flex;
        flex-direction: column;
        max-width: 80%;
      }

      .message-wrapper.user {
        align-self: flex-end;
      }

      .message-wrapper.assistant {
        align-self: flex-start;
      }

      .message-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
      }

      .user .message-bubble {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
        border-bottom-right-radius: 4px;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
      }

      .assistant .message-bubble {
        background: #f1f5f9;
        color: #1f2937;
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.03);
      }

      .message-time {
        font-size: 10px;
        color: #9ca3af;
        margin-top: 4px;
        padding: 0 4px;
      }

      .user .message-time {
        align-self: flex-end;
      }

      .assistant .message-time {
        align-self: flex-start;
      }

      /* Typing/Loading Indicator */
      .typing-indicator {
        display: none;
        align-items: center;
        gap: 4px;
        padding: 12px 18px;
        background: #f1f5f9;
        border-radius: 18px;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
      }

      .typing-dot {
        width: 6px;
        height: 6px;
        background-color: #6b7280;
        border-radius: 50%;
        animation: typingBounce 1.4s infinite ease-in-out both;
      }

      .typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .typing-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
      }

      /* Input Form */
      .chat-input-form {
        padding: 16px 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        display: flex;
        gap: 10px;
        background: rgba(255, 255, 255, 0.95);
        align-items: center;
      }

      .chat-textarea {
        flex: 1;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 10px 14px;
        font-size: 14px;
        outline: none;
        resize: none;
        height: 42px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        line-height: 20px;
      }

      .chat-textarea:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .chat-send-btn {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
        transition: all 0.2s ease;
      }

      .chat-send-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(79, 70, 229, 0.3);
      }

      .chat-send-btn:active {
        transform: translateY(0);
      }

      .chat-send-btn svg {
        width: 18px;
        height: 18px;
        fill: white;
        margin-left: 2px;
      }

      .watermark {
        font-size: 10px;
        text-align: center;
        color: #9ca3af;
        padding-bottom: 8px;
        background: rgba(255, 255, 255, 0.95);
      }
      
      .watermark a {
        color: #4f46e5;
        text-decoration: none;
        font-weight: 500;
      }

      /* Responsive Styling */
      @media (max-width: 480px) {
        .chat-panel {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
          bottom: 75px;
          right: 0;
        }
      }
    </style>

    <button class="chat-trigger" id="chatTrigger">
      <svg id="triggerIcon" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
      </svg>
    </button>

    <div class="chat-panel" id="chatPanel">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">AI</div>
          <div class="chat-title-container">
            <span class="chat-title" id="chatTitle">Virtual Assistant</span>
            <span class="chat-subtitle">
              Online
            </span>
          </div>
        </div>
        <button class="chat-close" id="chatClose">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="chat-messages" id="chatMessages">
        <div class="message-wrapper assistant">
          <div class="message-bubble">
            Hello! How can I help you today?
          </div>
          <span class="message-time">Just now</span>
        </div>
      </div>

      <div class="typing-indicator" id="typingIndicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>

      <div class="chat-input-form">
        <textarea class="chat-textarea" id="chatInput" placeholder="Type a message..." rows="1"></textarea>
        <button class="chat-send-btn" id="chatSend">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
      <div class="watermark">
        Powered by <a href="${apiHost || '#'}" target="_blank">RemotelyBot</a>
      </div>
    </div>
  `;

  // 5. DOM References inside Shadow Root
  const chatTrigger = shadow.getElementById('chatTrigger');
  const chatPanel = shadow.getElementById('chatPanel');
  const chatClose = shadow.getElementById('chatClose');
  const triggerIcon = shadow.getElementById('triggerIcon');
  const chatMessages = shadow.getElementById('chatMessages');
  const chatInput = shadow.getElementById('chatInput');
  const chatSend = shadow.getElementById('chatSend');
  const typingIndicator = shadow.getElementById('typingIndicator');
  const chatTitle = shadow.getElementById('chatTitle');

  // Resolve bot initial title based on client ID
  if (clientId) {
    const formattedTitle = clientId
      .replace(/[-_]+/g, ' ')
      .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    chatTitle.textContent = formattedTitle + ' Support';
  }

  // 6. Action Handlers
  let isOpen = false;

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chatPanel.classList.add('open');
      chatTrigger.classList.add('open');
      // Set close icon SVG inside the trigger button
      triggerIcon.innerHTML = `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`;
      
      // Auto focus input on desktop
      if (window.innerWidth > 768) {
        setTimeout(() => chatInput.focus(), 100);
      }
    } else {
      chatPanel.classList.remove('open');
      chatTrigger.classList.remove('open');
      // Set chat bubble icon SVG inside trigger button
      triggerIcon.innerHTML = `<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>`;
    }
  }

  chatTrigger.addEventListener('click', toggleChat);
  chatClose.addEventListener('click', toggleChat);

  // Resize textarea dynamically
  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight - 4) + 'px';
  });

  // Handle enter key press
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatSend.addEventListener('click', sendMessage);

  // Helper to format time
  function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // 7. Message Streaming & Sending Logic
  async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // Reset input field
    chatInput.value = '';
    chatInput.style.height = '42px';

    // Append User Message to UI
    appendMessage(messageText, 'user');
    
    // Show Typing Indicator
    typingIndicator.style.display = 'flex';
    scrollToBottom();

    // Create placeholder for Assistant Response
    const responseWrapper = document.createElement('div');
    responseWrapper.className = 'message-wrapper assistant';
    
    const responseBubble = document.createElement('div');
    responseBubble.className = 'message-bubble';
    responseBubble.innerHTML = ''; // Start empty for streaming
    
    const responseTime = document.createElement('span');
    responseTime.className = 'message-time';
    responseTime.textContent = formatTime();
    
    responseWrapper.appendChild(responseBubble);
    responseWrapper.appendChild(responseTime);

    try {
      // API request to Next.js route
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          clientId: clientId,
        }),
      });

      // Hide typing indicator once we get headers back
      typingIndicator.style.display = 'none';

      if (!response.ok) {
        let errMessage = 'An error occurred. Please try again.';
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        
        responseBubble.textContent = `Error: ${errMessage}`;
        responseBubble.style.color = '#ef4444';
        chatMessages.appendChild(responseWrapper);
        scrollToBottom();
        return;
      }

      // Read response stream
      if (!response.body) {
        responseBubble.textContent = 'Error: Readable stream not supported by server response.';
        chatMessages.appendChild(responseWrapper);
        scrollToBottom();
        return;
      }

      // Add wrapper to messages container before reading chunks
      chatMessages.appendChild(responseWrapper);
      scrollToBottom();

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let textBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        textBuffer += chunk;
        
        // Append streamed text and sanitize line breaks
        responseBubble.textContent = textBuffer;
        scrollToBottom();
      }

    } catch (error) {
      typingIndicator.style.display = 'none';
      responseBubble.textContent = 'Could not connect to the chat server. Please verify your internet connection.';
      responseBubble.style.color = '#ef4444';
      chatMessages.appendChild(responseWrapper);
      scrollToBottom();
      console.error('Chatbot Widget error:', error);
    }
  }

  function appendMessage(text, sender) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime();

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
})();
