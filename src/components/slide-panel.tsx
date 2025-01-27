'use client';

import { createContext, useContext, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SlidePanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
}

const SlidePanelContext = createContext<SlidePanelContextValue | undefined>(undefined);

export function SlidePanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);

  return (
    <SlidePanelContext.Provider value={{ open, setOpen, content, setContent }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(
          "fixed right-0 top-0 h-full w-full max-w-lg rounded-l-lg",
          "transform transition-all duration-300",
          "data-[state=open]:animate-slide-in-right",
          "data-[state=closed]:animate-slide-out-right"
        )}>
          {content}
        </DialogContent>
      </Dialog>
    </SlidePanelContext.Provider>
  );
}

export function useSlidePanel() {
  const context = useContext(SlidePanelContext);
  if (!context) {
    throw new Error('useSlidePanel must be used within a SlidePanelProvider');
  }

  function open(content: React.ReactNode) {
    context.setContent(content);
    context.setOpen(true);
  }

  function close() {
    context.setOpen(false);
  }

  return {
    open,
    close,
    isOpen: context.open
  };
} 