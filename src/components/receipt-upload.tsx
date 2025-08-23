'use client';

import { useEffect, useState, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { UploadCloud, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processReceiptAction } from '@/app/actions';
import type { Receipt } from '@/types';
import { useToast } from '@/hooks/use-toast';

type ReceiptUploadProps = {
  onReceiptProcessed: (receipt: Receipt) => void;
};

const initialState = {
  message: '',
  data: null,
  error: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Extracting...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Extract Data
        </>
      )}
    </Button>
  );
}

export default function ReceiptUpload({ onReceiptProcessed }: ReceiptUploadProps) {
  const [state, formAction] = useActionState(processReceiptAction, initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      if (state.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: state.message,
        });
      } else if (state.data) {
        toast({
          title: 'Success!',
          description: state.message,
          action: <CheckCircle className="text-green-500" />,
        });
        const newReceipt: Receipt = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          ...state.data,
        };
        onReceiptProcessed(newReceipt);
      }
    }
  }, [state, onReceiptProcessed, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Upload New Receipt</h2>
      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Receipt Image</Label>
          <div className="relative flex justify-center items-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
            {imagePreview ? (
              <>
                <Image
                  src={imagePreview}
                  alt="Receipt preview"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg p-2"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove image</span>
                </Button>
              </>
            ) : (
              <div className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
            <Input
              id="photo-upload"
              name="photo"
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              ref={fileInputRef}
              required
            />
          </div>
        </div>
        <div className="flex justify-center">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
