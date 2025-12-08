(function() {
  'use strict';
  
  // Suppress known WebView warnings
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out known warnings that don't affect functionality
    const suppressedWarnings = [
      'Mixed Content',
      'WebView',
      'Cordova',
      'file://',
      'blocked:mixed-content',
      'shouldInterceptRequestFromNative',
      'chromium-TrichromeWebView',
      'AwContentsBackgroundThreadClient'
    ];
    
    const shouldSuppress = suppressedWarnings.some(warning => 
      message.toLowerCase().includes(warning.toLowerCase())
    );
    
    if (shouldSuppress) {
      return; // Suppress these warnings
    }
    
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };
  
  // Font loading error fallback
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.catch(function(error) {
      console.warn('Font loading error, using system fonts:', error);
      document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    });
  }
  
  // Global image error handler - be less aggressive
  document.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG') {
      const defaultImg = (window.CONFIG && window.CONFIG.UPLOADS_URL) 
        ? window.CONFIG.UPLOADS_URL + 'default.png'
        : '/uploads/default.png';
      
      // Only replace if:
      // 1. It's not already the default image
      // 2. We haven't already tried to fix it
      // 3. It's not a data URL or blob URL (those are local previews)
      if (e.target.src !== defaultImg && 
          !e.target.dataset.errorHandled && 
          !e.target.src.startsWith('data:') && 
          !e.target.src.startsWith('blob:')) {
        
        // Mark as handled to prevent multiple attempts
        e.target.dataset.errorHandled = 'true';
        
        // Wait longer before replacing (some images load slowly)
        setTimeout(function() {
          // Double-check if image still failed
          if (!e.target.complete || e.target.naturalHeight === 0) {
            console.warn('Image failed to load after timeout, using default:', e.target.src);
            // Only replace if still not loaded
            if (e.target.src !== defaultImg) {
              e.target.src = defaultImg;
            }
          }
        }, 2000); // Wait 2 seconds for slow connections
      }
    }
  }, true);
})();

