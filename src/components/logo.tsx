import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary',
        className
      )}
    >
      <Rocket className="h-8 w-8" />
    </div>
  );
}
