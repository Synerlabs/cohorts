'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile, FileUploadResult } from '@/services/file-upload.service';

interface FileUploadProps {
  id?: string;
  accept?: string;
  maxSize?: number; // in bytes
  onUpload: (file: File) => void;
  onError: (error: string) => void;
  className?: string;
  uploading?: boolean;
  value?: {
    name: string;
    size: number;
    type: string;
    path?: string;
    url: string;
  } | null;
  onRemove?: () => void;
}

export function FileUpload({
  id,
  accept = '*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  onUpload,
  onError,
  className,
  uploading = false,
  value,
  onRemove,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }

    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map((type) => type.trim());
      const fileType = file.type || '';
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return fileType.match(new RegExp(type.replace('*', '.*')));
      });

      if (!isAccepted) {
        return 'File type not accepted';
      }
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    onUpload(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn('w-full', className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        id={id}
      />

      {value ? (
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <div className="flex-1 truncate">
            <span className="text-sm font-medium">{value.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({Math.round(value.size / 1024)}KB)
            </span>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors',
            isDragging && 'border-primary bg-primary/5',
            'hover:border-primary hover:bg-primary/5'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <UploadCloud
              className={cn(
                'h-8 w-8',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div className="text-sm">
              <span className="font-semibold text-primary">
                Click to upload
              </span>{' '}
              or drag and drop
            </div>
            {accept !== '*' && (
              <div className="text-xs text-muted-foreground">
                Accepted formats: {accept}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Max size: {maxSize / 1024 / 1024}MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 