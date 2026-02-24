import { useEffect, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-[0_-8px_40px_rgba(0,0,0,0.08)]">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-3xl px-5 pt-3 pb-3">
          <div className="w-9 h-1 bg-warm-300 rounded-full mx-auto mb-4" />
          <h2 className="text-[17px] font-semibold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="px-5 pt-1 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
