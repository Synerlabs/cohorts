import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h1>
      <p className="text-muted-foreground mb-6">
        There was a problem verifying your login link or authentication code. 
        It might have expired or already been used.
      </p>
      <Link href="/login" className="text-primary hover:underline">
        Please try logging in again.
      </Link>
    </div>
  );
} 