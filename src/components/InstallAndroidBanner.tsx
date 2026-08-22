import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export const InstallAndroidBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone PWA / Android mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install on Android:\n1. Open Chrome menu (⋮)\n2. Tap "Add to Home screen" or "Install app"');
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="mx-3 sm:mx-4 my-2 p-2.5 sm:p-3 rounded-2xl glass-card border-indigo-400/30 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-xl glass-button text-indigo-400 shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Install Dharshu App</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">PWA</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            Add to Home screen for full-screen offline mode and faster responses
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1 shadow-md transition cursor-pointer border border-white/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl glass-button text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
