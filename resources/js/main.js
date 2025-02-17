function onWindowClose() {
  Neutralino.app.exit();
}

Neutralino.init();

Neutralino.events.on("windowClose", onWindowClose);

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  const imagePanel = new ImagePanel();
  const controlPanel = new ControlPanel(imagePanel);
});
