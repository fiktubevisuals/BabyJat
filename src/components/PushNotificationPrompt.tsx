import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isPushNotificationSupported, requestAndSavePushToken, setupForegroundPushListener } from '../lib/pushNotifications';

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (!isPushNotificationSupported()) return;

    // Listen for foreground push messages
    const unsub = setupForegroundPushListener((title, body) => {
      addToast(`${title}: ${body}`, 'info');
    });

    // Check if permission is default and user hasn't dismissed it in this session
    const isDismissed = sessionStorage.getItem('push_prompt_dismissed') === 'true';
    if (Notification.permission === 'default' && !isDismissed && user) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500); // polite delay after page loads
      return () => clearTimeout(timer);
    }

    return () => unsub();
  }, [user, addToast]);

  const handleEnable = async () => {
    setIsEnabling(true);
    const token = await requestAndSavePushToken(user?.uid);
    setIsEnabling(false);
    setShowPrompt(false);

    if (token) {
      addToast('🔔 Push Notifications Enabled! You will receive live appointment & order alerts.', 'success');
    } else {
      if (Notification.permission === 'denied') {
        addToast('Notification permission was blocked in browser settings.', 'warning');
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('push_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <aside aria-label="Notification Preferences" className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-surface/95 dark:bg-surface-container-high/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-primary/20 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-xl">notifications_active</span>
        </div>
        <div className="flex-1 pr-2">
          <h4 className="text-xs font-bold text-on-surface font-headline-md">Live Salon Notifications</h4>
          <p className="text-[11px] text-secondary mt-0.5 leading-snug">
            Get instant alerts when your stylist is ready, appointments are confirmed, or exclusive offers drop.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
          title="Dismiss"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div className="flex gap-2 mt-3 pt-2 border-t border-outline/10">
        <button
          onClick={handleDismiss}
          className="flex-1 py-1.5 px-3 rounded-xl border border-outline/20 text-[11px] font-label-caps text-secondary hover:bg-surface-container transition-colors"
        >
          Not Now
        </button>
        <button
          onClick={handleEnable}
          disabled={isEnabling}
          className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-on-primary text-[11px] font-label-caps font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
        >
          {isEnabling ? (
            <span className="w-3.5 h-3.5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined text-xs">notifications</span>
              <span>Enable Alerts</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
