import { useEffect, useState } from 'react';

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 && 'ontouchstart' in window;
}

export function useDeviceType(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobileDevice());
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
