/* ═══════════════════════════════════════════════════
   MODULE — CopilotKit Launcher (AI Hub)
   ═══════════════════════════════════════════════════ */

export function initVchat() {
  const toggle = document.getElementById('vchatToggle');
  const modal = document.getElementById('chat-modal');
  const frame = document.getElementById('chat-frame');
  if (!toggle || !modal || !frame) return;

  const copilotUrl = '/?copilot=open&from=ai-hub';

  const openCopilot = () => {
    frame.src = copilotUrl;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    toggle.classList.add('active');
  };

  const resetButtonState = () => {
    if (modal.style.display === 'none') {
      toggle.classList.remove('active');
    }
  };

  toggle.onclick = openCopilot;

  const closeBtn = document.querySelector('.chat-modal-close');
  closeBtn?.addEventListener('click', () => {
    setTimeout(resetButtonState, 0);
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      setTimeout(resetButtonState, 0);
    }
  });
}
