// Temporary export helper; runs only for the requested Figma capture URL.
if (location.hash.includes('figmacapture=')) {
  (async () => {
    await document.fonts.ready;
    document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
    const style = document.createElement('style');
    style.textContent = '.personal-banking__version-bar,.gh-controls,.studio-controls-toggle{display:none!important}';
    document.head.append(style);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    for (const section of document.querySelectorAll('main > section')) {
      section.scrollIntoView();
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }
    window.scrollTo(0, 0);
    await Promise.all(Array.from(document.images, (img) => img.decode().catch(() => {})));
    const script = document.createElement('script');
    script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    document.head.append(script);
  })();
}
