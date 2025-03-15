// Listen for keyboard events
document.addEventListener('keydown', (event) => {
  // Send the event to background script to check if it matches the shortcut
  chrome.runtime.sendMessage({
    type: 'checkShortcut',
    event: {
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      key: event.key
    }
  });
});
