import React, { useState, useEffect } from 'react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isIosPrompt, setIsIosPrompt] = useState(false);

  useEffect(() => {
    // Service Worker registration (enabled for all environments to ensure offline support in PWA)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('PWA ServiceWorker registered with scope:', registration.scope);
          },
          (err) => {
            console.log('PWA ServiceWorker registration failed:', err);
          }
        );
      });
    }

    // Detect iOS for specific install instructions
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIos && !isInStandaloneMode) {
      if (!sessionStorage.getItem('pwa_banner_dismissed')) {
        setIsIosPrompt(true);
        setShowBanner(true);
      }
    }

    // Capture install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user has dismissed previously in this session
      if (!sessionStorage.getItem('pwa_banner_dismissed')) {
        setShowBanner(true);
      }
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User PWA install response: ${outcome}`);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Offline Alert Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-xs font-bold py-1 px-4 text-center z-50 flex items-center justify-center gap-2 shadow-md">
          <span className="material-symbols-outlined text-sm">wifi_off</span>
          <span>You are currently offline. BabyJat is running in cached offline mode.</span>
        </div>
      )}

      {/* PWA Install Floating Banner */}
      {showBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-surface-container-high/95 backdrop-blur-md border border-primary/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-bounce-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
              B
            </div>
            <div>
              <h4 className="font-headline-md text-sm font-bold text-on-surface">Install BabyJat App</h4>
              {isIosPrompt ? (
                <p className="font-body-md text-[10px] md:text-xs text-secondary leading-tight mt-1">Tap <span className="material-symbols-outlined text-[12px] align-middle">ios_share</span> Share then <strong>Add to Home Screen</strong> to install.</p>
              ) : (
                <p className="font-body-md text-xs text-secondary">Add to home screen for fast offline booking &amp; updates</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isIosPrompt && (
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-label-caps font-bold hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 text-secondary hover:text-on-surface transition-colors"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
