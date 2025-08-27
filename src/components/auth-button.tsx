
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogIn, LogOut, User as UserIcon, Gem } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export default function AuthButton() {
  const { user, userProfile, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (!user) {
    return (
      <Button onClick={signInWithGoogle}>
        <LogIn className="mr-2 h-4 w-4" /> Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
            <AvatarFallback>
              <UserIcon />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userProfile && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center">
                 <Gem className="mr-2 h-4 w-4 text-primary" />
                <span className="capitalize">{userProfile.subscription} Plan</span>
            </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
