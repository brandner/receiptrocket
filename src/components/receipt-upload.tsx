
'use client';

import { useEffect, useState, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { UploadCloud, X, FileText, CheckCircle, Camera, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processAndSaveReceiptAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ReceiptUploadProps = {
  onUploadSuccess: () => void;
};

const initialState = {
  message: '',
  error: false,
  permissionError: false,
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Process & Save
        </>
      )}
    </Button>
  );
}

export default function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [state, formAction] = useActionState(processAndSaveReceiptAction, initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [uploadMode, setUploadMode] = useState<'upload' | 'camera'>('upload');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (uploadMode === 'camera' && hasCameraPermission === null) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setCameraStream(stream);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    } else if (uploadMode === 'upload' && cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
    }
  }, [uploadMode, hasCameraPermission, toast, cameraStream]);

  const resetForm = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (formRef.current) {
        formRef.current.reset();
    }
  }

  useEffect(() => {
    if (state.message) {
        if (state.error) {
            toast({
                variant: 'destructive',
                title: state.permissionError ? 'Action Required' : 'Error',
                description: state.message,
                duration: state.permissionError ? 20000 : 9000,
            });
        } else {
            toast({
                title: 'Success!',
                description: state.message,
                action: <CheckCircle className="text-green-500" />,
            });
            onUploadSuccess();
            resetForm();
        }
    }
  }, [state, onUploadSuccess, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUri);
        fetch(dataUri)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
          });
      }
    }
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // If a file was selected via camera, it's in `selectedFile` state.
    // The regular file input is handled automatically by FormData.
    // We only need to append if the camera was used and the file input is empty.
    if (selectedFile && !formData.get('photo')) {
      formData.set('photo', selectedFile);
    }

    formAction(formData);
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Upload New Receipt</h2>

      {state.error && state.permissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required: Permission Denied</AlertTitle>
          <AlertDescription>
            {state.message}
            <br/>
            You can fix this by visiting the <a href={`https://console.cloud.google.com/iam-admin/iam?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Google Cloud IAM page</a>, finding the principal with email <code className="text-xs bg-destructive-foreground/20 p-1 rounded">{process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL}</code>, and adding the **Cloud Datastore User** and **Storage Admin** roles.
          </AlertDescription>
        </Alert>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as any)} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload"><UploadCloud className="mr-2 h-4 w-4" /> File Upload</TabsTrigger>
            <TabsTrigger value="camera"><Camera className="mr-2 h-4 w-4" /> Camera</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
              <div className="space-y-2">
              <Label htmlFor="photo-upload">Receipt Image</Label>
              <div className="relative flex justify-center items-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                  {imagePreview && uploadMode === 'upload' ? (
                  <>
                      <Image
                      src={imagePreview}
                      alt="Receipt preview"
                      fill
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
                  />
              </div>
              </div>
          </TabsContent>
          <TabsContent value="camera">
              <div className="space-y-4">
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border">
                {imagePreview && uploadMode === 'camera' ? (
                  <>
                    <Image src={imagePreview} alt="Captured receipt" fill objectFit="contain" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full"
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedFile(null);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Retake photo</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <video ref={videoRef} className={cn("w-full h-full", { 'hidden': hasCameraPermission === false })} autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === false && (
                      <Alert variant="destructive" className="m-4">
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>
                          Please enable camera permissions to use this feature.
                        </AlertDescription>
                      </Alert>
                    )}
                    {hasCameraPermission === null && (
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                       </div>
                    )}
                  </>
                )}
              </div>
              {cameraStream && !imagePreview && (
                  <Button type="button" onClick={handleTakePhoto} className="w-full">
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                  </Button>
              )}
              </div>
          </TabsContent>
        </Tabs>
        
        {/* Hidden input to carry the camera file */}
        <input 
          type="file" 
          name="photo" 
          ref={el => {
            if (el && selectedFile) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(selectedFile);
              el.files = dataTransfer.files;
            }
          }}
          className="hidden" 
          readOnly
        />

        <div className="flex justify-center">
          <SubmitButton disabled={!imagePreview && !selectedFile} />
        </div>
      </form>
    </div>
  );
}
