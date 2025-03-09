import { ReactNode } from 'react';

interface PaymentTwoColumnLayoutProps {
  children: ReactNode;
}

export default function PaymentTwoColumnLayout({ children }: PaymentTwoColumnLayoutProps) {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Render the content without container constraints to allow full-width columns */}
      {children}
    </div>
  );
} 