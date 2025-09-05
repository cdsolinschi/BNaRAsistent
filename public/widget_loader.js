// Self-executing function to avoid polluting the global scope
(function() {
  // 1. Define the URL of your deployed chat application.
  // This is your Vercel URL.
  const WIDGET_URL = "https://b-na-r-asistent-ig3y.vercel.app";

  // State to track if the chat is open
  let isChatOpen = false;

  // 2. Create the main elements
  const widgetButton = document.createElement('button');
  const widgetContainer = document.createElement('div');
  const chatIframe = document.createElement('iframe');

  // 3. Configure the chat iframe
  chatIframe.src = WIDGET_URL;
  chatIframe.id = 'bibnat-ai-iframe';
  chatIframe.style.border = 'none';
  chatIframe.style.width = '100%';
  chatIframe.style.height = '100%';

  // 4. Create the CSS styles to be injected
  const styles = `
    #bibnat-ai-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #1e3a8a; /* A darker blue, more official */
      border: none;
      border-radius: 50%;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: transform 0.2s ease-in-out, background-color 0.2s;
    }
    #bibnat-ai-button:hover {
      transform: scale(1.1);
      background-color: #1c347d;
    }
    #bibnat-ai-button svg {
      width: 32px;
      height: 32px;
      color: white;
      transition: transform 0.3s ease;
    }
    #bibnat-ai-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 90vw;
      max-width: 400px;
      height: 70vh;
      max-height: 600px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      overflow: hidden;
      display: none; /* Hidden by default */
      z-index: 9998;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
    }
    #bibnat-ai-container.open {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }
    .bibnat-ai-icon-open {
      transform: rotate(180deg);
    }
  `;

  // 5. Inject styles into the page <head>
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  // 6. Configure the widget button
  widgetButton.id = 'bibnat-ai-button';
  widgetButton.setAttribute('aria-label', 'Deschide asistentul AI');
  const chatIconSVG = `
    <svg id="bibnat-ai-chat-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2s10 4.477 10 10z" />
    </svg>
  `;
  const closeIconSVG = `
    <svg id="bibnat-ai-close-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
  widgetButton.innerHTML = chatIconSVG;

  // 7. Configure the widget container
  widgetContainer.id = 'bibnat-ai-container';
  widgetContainer.appendChild(chatIframe);

  // 8. Add click event listener to the button
  widgetButton.onclick = function() {
    isChatOpen = !isChatOpen;
    widgetContainer.classList.toggle('open');
    if (isChatOpen) {
      widgetButton.innerHTML = closeIconSVG;
      widgetButton.setAttribute('aria-label', 'Închide asistentul AI');
    } else {
      widgetButton.innerHTML = chatIconSVG;
      widgetButton.setAttribute('aria-label', 'Deschide asistentul AI');
    }
  };

  // 9. Append the elements to the body
  document.body.appendChild(widgetButton);
  document.body.appendChild(widgetContainer);

})();
