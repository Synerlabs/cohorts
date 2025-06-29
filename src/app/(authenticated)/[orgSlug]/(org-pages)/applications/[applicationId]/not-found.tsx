import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ApplicationNotFound() {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <FileX className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Application Not Found</h2>
      <p className="text-muted-foreground">
        The application you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Button asChild variant="outline">
        <Link href="./applications">Back to Applications</Link>
      </Button>
    </div>
  );
} 