import { useEffect, useRef } from 'react';

const __modalStack = [];

export default function Modal({ open, onClose, title, children, size }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const close = () => onCloseRef.current && onCloseRef.current();
    __modalStack.push(close);
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (__modalStack[__modalStack.length - 1] === close) close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const idx = __modalStack.indexOf(close);
      if (idx !== -1) __modalStack.splice(idx, 1);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card ${size ? `modal-card-${size}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
