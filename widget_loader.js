
(function () {
  // This is the URL where your chat application is deployed.
  // **IMPORTANT**: Replace this with your actual deployment URL.
  const WIDGET_URL = "https://your-deployment-url.com";

  // Create a container for the widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'bibnat-ai-widget-container';
  document.body.appendChild(widgetContainer);

  const style = document.createElement('style');
  style.innerHTML = `
    #bibnat-ai-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }
    #bibnat-chat-button {
      background-color: #2563EB; /* blue-600 */
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease-in-out;
    }
    #bibnat-chat-button:hover {
      transform: scale(1.1);
    }
    #bibnat-chat-button.open svg.chat-icon {
      display: none;
    }
    #bibnat-chat-button.open svg.close-icon {
      display: block;
    }
    #bibnat-chat-button svg.close-icon {
      display: none;
    }
    #bibnat-chat-frame-container {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 90vw;
      max-width: 400px;
      height: 70vh;
      max-height: 600px;
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      border-radius: 16px;
      overflow: hidden;
      display: none; /* Initially hidden */
      flex-direction: column;
      background-color: white;
    }
    #bibnat-chat-frame-container.open {
      display: flex;
    }
    #bibnat-chat-frame {
      width: 100%;
      height: 100%;
      border: none;
    }
  `;
  document.head.appendChild(style);

  // --- Button ---
  const chatButton = document.createElement('button');
  chatButton.id = 'bibnat-chat-button';
  chatButton.setAttribute('aria-label', 'Open chat');
  chatButton.innerHTML = `
    <svg class="chat-icon h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <svg class="close-icon h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;

  // --- Iframe Container ---
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'bibnat-chat-frame-container';

  let iframe;
  let isIframeLoaded = false;

  function loadIframe() {
    if (!isIframeLoaded) {
      iframe = document.createElement('iframe');
      iframe.id = 'bibnat-chat-frame';
      iframe.src = WIDGET_URL;
      iframeContainer.appendChild(iframe);
      isIframeLoaded = true;
    }
  }

  chatButton.addEventListener('click', () => {
    loadIframe();
    iframeContainer.classList.toggle('open');
    chatButton.classList.toggle('open');
    const isChatOpen = iframeContainer.classList.contains('open');
    chatButton.setAttribute('aria-label', isChatOpen ? 'Close chat' : 'Open chat');
  });

  widgetContainer.appendChild(iframeContainer);
  widgetContainer.appendChild(chatButton);
})();
