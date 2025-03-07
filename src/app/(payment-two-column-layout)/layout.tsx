import { ReactNode } from 'react';

interface PaymentTwoColumnLayoutProps {
  children: ReactNode;
}

export default function PaymentTwoColumnLayout({ children }: PaymentTwoColumnLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* We'll render the actual content from the page component */}
        {children}
      </div>
    </div>
  );
} 