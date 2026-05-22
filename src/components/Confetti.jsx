import { useEffect, useRef } from 'react';

const COLORS = ['#0EA5A4', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#eab308', '#8b5cf6'];

export default function Confetti({ show, onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!show || !ref.current) return;
    const container = ref.current;
    container.innerHTML = '';
    const pieces = 60;
    for (let i = 0; i < pieces; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      el.style.width = (Math.random() * 8 + 4) + 'px';
      el.style.height = (Math.random() * 8 + 4) + 'px';
      el.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(el);
    }
    const timer = setTimeout(() => {
      onDone?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [show]);

  if (!show) return null;
  return <div ref={ref} className="confetti-wrapper" />;
}
