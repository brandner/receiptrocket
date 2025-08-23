'use client';

import Image from 'next/image';
import { Eye, ReceiptText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Receipt } from '@/types';

type ReceiptListProps = {
  receipts: Receipt[];
};

export default function ReceiptList({ receipts }: ReceiptListProps) {
  if (receipts.length === 0) {
    return (
      <Card className="text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
            <ReceiptText className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>No Receipts Yet</CardTitle>
          <CardDescription>Upload a receipt to see it appear here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatCurrency = (amount: string) => {
    const number = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
    return isNaN(number) ? amount : `$${number.toFixed(2)}`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Processed Receipts</CardTitle>
        <CardDescription>Here is a list of all your scanned receipts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right hidden md:table-cell">GST</TableHead>
                <TableHead className="text-right hidden md:table-cell">PST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map(receipt => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.companyName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{receipt.description}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(receipt.date)}</TableCell>
                  <TableCell className="text-right font-mono hidden md:table-cell">{receipt.gst ? formatCurrency(receipt.gst) : 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono hidden md:table-cell">{receipt.pst ? formatCurrency(receipt.pst) : 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(receipt.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Receipt</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{receipt.companyName}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                          <div className="relative w-full h-96 rounded-lg overflow-hidden border">
                              <Image
                                src={receipt.image}
                                alt={`Receipt from ${receipt.companyName}`}
                                layout="fill"
                                objectFit="contain"
                                data-ai-hint="receipt document"
                              />
                          </div>
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Extracted Details</h3>
                            <div className="space-y-2 text-sm">
                               <div className="flex justify-between"><span>Company:</span> <span className="font-medium">{receipt.companyName}</span></div>
                               <div className="flex justify-between"><span>Description:</span> <span className="font-medium">{receipt.description}</span></div>
                               <div className="flex justify-between"><span>GST/HST:</span> <Badge variant="secondary">{receipt.gst ? formatCurrency(receipt.gst) : 'N/A'}</Badge></div>
                               <div className="flex justify-between"><span>PST:</span> <Badge variant="secondary">{receipt.pst ? formatCurrency(receipt.pst) : 'N/A'}</Badge></div>
                               <div className="flex justify-between text-base font-bold pt-2 border-t mt-2"><span>Total:</span> <span>{formatCurrency(receipt.totalAmount)}</span></div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
