'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileIcon, ImageIcon, ExternalLinkIcon, CheckCircle, XCircle, Clock, User, DollarSign, Calendar, CreditCard, ShoppingBag, Eye, Download, ChevronRight, Shield, ReceiptText, Copy, ClipboardCopy, Map, MapPin, Mail, Phone, Building, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Payment } from "@/services/payment/types";
import { approvePaymentAction, rejectPaymentAction, type PaymentFormState } from "../../actions/payment.action";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { OrgAccessHOCProps } from "@/lib/hoc/org";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Check, X } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { permissions } from "@/lib/types/permissions";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Organization = OrgAccessHOCProps['org'];

interface PaymentDetailsProps {
  payment: any; // Temporarily use any to fix type issues
  org: Organization;
  user: any;
  userPermissions: string[];
}

function FilePreview({ file }: { file: { originalFilename: string; fileUrl: string; fileSize?: number } }) {
  if (!file?.originalFilename) return null;
  
  // Improved file type detection
  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return { type: 'image', icon: <ImageIcon className="h-4 w-4" /> };
    }
    
    // Document types
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
      return { type: 'document', icon: <FileIcon className="h-4 w-4" /> };
    }
    
    // Default
    return { type: 'file', icon: <FileIcon className="h-4 w-4" /> };
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  const fileInfo = getFileType(file.originalFilename);
  const isImage = fileInfo.type === 'image';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group">
        <div className="h-9 w-9 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-500">
          {fileInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.originalFilename}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {fileInfo.type.charAt(0).toUpperCase() + fileInfo.type.slice(1)}
            {file.fileSize && ` • ${formatFileSize(file.fileSize)}`}
          </p>
        </div>
        <div className="flex gap-1">
      {isImage ? (
            <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(true)} className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a href={file.fileUrl} download={file.originalFilename}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
    </div>
      </div>

      {isImage && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[70vw]">
            <DialogHeader>
              <DialogTitle>{file.originalFilename}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center overflow-hidden max-h-[80vh]">
              <img 
                src={file.fileUrl} 
                alt={file.originalFilename} 
                className="max-w-full max-h-[70vh] object-contain"
                onError={(e) => {
                  // Handle image load errors
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMTdINnYtMmg3di0ySDE2VjdINlY1aDEydjEyaC01di0wLjF6IiBmaWxsPSIjZDFkNWRiIj48L3BhdGg+PC9zdmc+';
                  (e.target as HTMLImageElement).classList.add('p-8', 'bg-gray-100', 'rounded');
                }}
              />
            </div>
            <DialogFooter>
              <Button asChild variant="outline">
                <a href={file.fileUrl} download={file.originalFilename}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

const wrapApproveAction = async (prevState: any, formData: FormData) => {
  const payload = {
    paymentId: formData.get('paymentId') as string,
    orgId: formData.get('orgId') as string,
    notes: formData.get('notes') as string
  };
  return approvePaymentAction(prevState, payload);
};

const wrapRejectAction = async (prevState: any, formData: FormData) => {
  const payload = {
    paymentId: formData.get('paymentId') as string,
    orgId: formData.get('orgId') as string,
    notes: formData.get('notes') as string
  };
  return rejectPaymentAction(prevState, payload);
};

// Format date consistently
const formatDate = (date: string) => {
  // Use a fixed string format for both server and client
  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  
  return `${month} ${day}, ${year} at ${hours}:${minutes} UTC`;
};

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch(status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'rejected':
      case 'failed':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'pending_approval':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'pending':
      default:
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="h-3.5 w-3.5 mr-1" /> };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
}

function Timeline({ payment }: { payment: any }) {
  // Define the event type
  interface TimelineEvent {
    date: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
  }

  // Construct timeline events based on payment data
  const events: TimelineEvent[] = [];
  
  // Add creation event
  events.push({
    date: payment.created_at,
    title: 'Payment Created',
    description: `${payment.type === 'manual' ? 'Manual payment' : 'Stripe payment'} created`,
    icon: <DollarSign className="h-4 w-4" />,
    iconBg: 'bg-blue-500'
  });
  
  // Add status change events if available (you'd need to add these to your database)
  if (payment.status === 'paid') {
    events.push({
      date: payment.updated_at, // Ideally would use status_changed_at from DB
      title: 'Payment Approved',
      description: payment.manual_payments?.notes || 'Payment was approved',
      icon: <CheckCircle className="h-4 w-4" />,
      iconBg: 'bg-green-500'
    });
  } else if (payment.status === 'rejected') {
    events.push({
      date: payment.updated_at, // Ideally would use status_changed_at from DB
      title: 'Payment Rejected',
      description: payment.manual_payments?.notes || 'Payment was rejected',
      icon: <XCircle className="h-4 w-4" />,
      iconBg: 'bg-red-500'
    });
  }
  
  // Sort events by date, newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, idx) => (
          <li key={idx}>
            <div className="relative pb-8">
              {idx !== events.length - 1 ? (
                <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex items-start space-x-3">
                <div>
                  <div className={`relative px-1.5 h-10 w-10 rounded-full flex items-center justify-center ${event.iconBg} text-white ring-8 ring-white`}>
                    {event.icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-1.5">
                  <div className="text-sm font-medium text-gray-900">{event.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDate(event.date)}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">{event.description}</div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// New helper function to copy text to clipboard
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast({
        description: "Copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      toast({
        description: "Failed to copy",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      disabled={copying}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ClipboardCopy className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Button>
  );
}

export default function PaymentDetails({ payment, org, user, userPermissions }: PaymentDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const permissionsHook = usePermissions();
  
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [dialogNotes, setDialogNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);

  const [approveState, approvePayment, isApproving] = useToastActionState(wrapApproveAction);
  const [rejectState, rejectPayment, isRejecting] = useToastActionState(wrapRejectAction);

  // Check if the user has permission to process payments
  const canProcess = permissionsHook.hasPermission([permissions.payments.process]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApproveClick = () => {
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', org.id);
    formData.append('notes', dialogNotes);
    
    await approvePayment(formData);
    setIsApproveDialogOpen(false);
    setNotes("");
    setDialogNotes("");
    router.refresh();
  };

  const handleReject = async () => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', org.id);
    formData.append('notes', dialogNotes);
    
    await rejectPayment(formData);
    setIsRejectDialogOpen(false);
    setNotes("");
    setDialogNotes("");
    router.refresh();
  };

  // Format currency consistently
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  // Helper to get payment method label and icon
  const getPaymentMethodInfo = () => {
    switch(payment.type) {
      case 'stripe':
        return { 
          label: 'Credit Card (Stripe)', 
          icon: <CreditCard className="h-5 w-5 text-primary" /> 
        };
      case 'manual':
        return { 
          label: 'Manual Payment', 
          icon: <ReceiptText className="h-5 w-5 text-primary" /> 
        };
      default:
        return { 
          label: payment.type, 
          icon: <DollarSign className="h-5 w-5 text-primary" /> 
        };
    }
  };

  const paymentMethod = getPaymentMethodInfo();

  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild className="flex gap-2 items-center">
          <Link href={`/@${org.slug}/payments`}>
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Payments</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Payment Summary - Enhanced with better visual design */}
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-md">
            <div className={`p-6 ${payment.status === 'paid' ? 'bg-green-50' : payment.status === 'rejected' ? 'bg-red-50' : 'bg-primary/10'}`}>
              <div className="flex items-center justify-between">
              <div>
                  <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide">
                    <span className={payment.status === 'paid' ? 'text-green-700' : payment.status === 'rejected' ? 'text-red-700' : 'text-primary'}>
                      Payment ID
                    </span>
                    <div className="flex items-center">
                      <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted">
                        {payment.id.substring(0, 12)}
                      </code>
                      <CopyButton text={payment.id} label="Copy payment ID" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold mt-3">
                  {formatCurrency(payment.amount, payment.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(payment.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={payment.status} />
                  {payment.type === 'stripe' && (
                    <Badge variant="outline" className="bg-white/80">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Stripe
                    </Badge>
                  )}
                  {payment.type === 'manual' && (
                    <Badge variant="outline" className="bg-white/80">
                      <ReceiptText className="h-3 w-3 mr-1" />
                      Manual
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-muted">
                <div className="p-4">
                  <div className="text-sm text-muted-foreground">Payment Method</div>
                  <div className="mt-1 flex items-center gap-2">
                    {paymentMethod.icon}
                    <span className="font-medium">{paymentMethod.label}</span>
                  </div>
                </div>
                
                {payment.orders && (
                  <div className="p-4">
                    <div className="text-sm text-muted-foreground">Order Reference</div>
                    <div className="mt-1 flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      <Link href={`/@${org.slug}/orders/${payment.orders.id}`} className="font-medium font-mono hover:text-primary hover:underline">
                        {payment.orders.id.substring(0, 8)}...
                      </Link>
                </div>
              </div>
                )}
            </div>
          </CardContent>
        </Card>

          {/* Tabs for different payment details */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="order">Order</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-4 space-y-4">
        {/* Payment Type Specific Details */}
        {payment.type === 'stripe' && payment.stripe_payments && (
          <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Stripe Payment Details
                    </CardTitle>
            </CardHeader>
                  <CardContent className="pt-0">
                    {/* Payment Intent */}
                    <div className="border-b pb-4 mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Payment Intent</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center">
                          <code className="text-xs px-2 py-1 bg-muted rounded font-mono block overflow-x-auto whitespace-nowrap max-w-full">
                    {payment.stripe_payments.stripe_payment_intent_id}
                          </code>
                          <CopyButton text={payment.stripe_payments.stripe_payment_intent_id} label="Copy payment intent ID" />
                  </div>
                        {payment.stripe_payments.stripe_account_id && (
                          <Button size="sm" variant="outline" className="h-7 text-xs w-fit" asChild>
                            <a 
                              href={`https://dashboard.stripe.com/${payment.stripe_payments.stripe_account_id}/payments/${payment.stripe_payments.stripe_payment_intent_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLinkIcon className="h-3 w-3 mr-1" />
                              View in Stripe
                            </a>
                          </Button>
                        )}
                </div>
                    </div>
                    
                    {/* Payment Details - Improved grid layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Account</h4>
                        <span className="text-sm text-foreground">
                          {payment.stripe_payments.stripe_account_id.startsWith('acct_') 
                            ? payment.stripe_payments.stripe_account_id.substring(0, 8) + '...' 
                            : payment.stripe_payments.stripe_account_id}
                    </span>
                  </div>
                      
                      {payment.stripe_payments.stripe_payment_method && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Payment Method</h4>
                          <Badge variant="outline" className="bg-white">
                            {payment.stripe_payments.stripe_payment_method}
                          </Badge>
                        </div>
                      )}
                </div>
                    
                    {/* Client Secret - Keep existing code */}
                    {payment.stripe_payments.stripe_payment_intent_client_secret && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Client Secret</h4>
                        <code className="text-xs px-2 py-1 bg-muted rounded font-mono block overflow-x-auto">
                          {`${payment.stripe_payments.stripe_payment_intent_client_secret.substring(0, 10)}...${payment.stripe_payments.stripe_payment_intent_client_secret.substring(payment.stripe_payments.stripe_payment_intent_client_secret.length - 10)}`}
                        </code>
                      </div>
                    )}
                    
                    {/* Security Info - Keep existing code */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span>Processed securely through Stripe's payment gateway</span>
              </div>
            </CardContent>
          </Card>
        )}

        {payment.type === 'manual' && (
          <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-primary" />
                      Manual Payment Details
                    </CardTitle>
                    <CardDescription>
                      Details of the manually recorded payment and uploaded proof
                    </CardDescription>
            </CardHeader>
                  <CardContent>
              <div className="space-y-6">
                      {/* Files Section */}
                  <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium">Proof of Payment</label>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_uploads?.length || 0} files
                          </Badge>
                        </div>
                        
                        {payment.payment_uploads && payment.payment_uploads.length > 0 ? (
                          <div className="space-y-2">
                      {payment.payment_uploads.map((pu: any) => (
                        <FilePreview 
                          key={pu.upload.id} 
                          file={{
                                  originalFilename: pu.upload.original_filename || 'Unnamed file',
                                  fileUrl: pu.upload.file_url || '#',
                                  fileSize: pu.upload.file_size
                          }} 
                        />
                      ))}
                          </div>
                        ) : (
                          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <Clock className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-amber-800">
                                  No proof of payment files
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                  Manual payments should include proof of payment files for verification.
                                  These can be receipts, screenshots, or any documentation showing the payment was made.
                                </p>
                              </div>
                    </div>
                  </div>
                )}
                      </div>
                      
                      {/* Payment Notes */}
                  <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium">Payment Notes</label>
                        </div>
                        
                        {payment.manual_payments?.notes ? (
                          <div className="p-4 rounded-md bg-gray-50 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                      {payment.manual_payments.notes}
                    </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-200 rounded-md">
                            No notes provided with this payment.
                  </div>
                )}
                      </div>
              </div>
            </CardContent>
          </Card>
        )}
            </TabsContent>

            <TabsContent value="order" className="mt-4">
        {payment.orders && (
                <>
          <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Order Information
                      </CardTitle>
            </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                            <label className="text-xs text-muted-foreground">Order ID</label>
                            <div className="text-sm font-mono mt-1 break-all">
                              <Link href={`/@${org.slug}/orders/${payment.orders.id}`} className="hover:text-primary hover:underline">
                                {payment.orders.id}
                              </Link>
                            </div>
                </div>
                <div>
                            <label className="text-xs text-muted-foreground">Order Status</label>
                  <div className="mt-1">
                              <StatusBadge status={payment.orders.status} />
                  </div>
                </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {payment.orders.created_at && (
                  <div>
                              <label className="text-xs text-muted-foreground">Order Date</label>
                              <div className="text-sm mt-1">
                                {formatDate(payment.orders.created_at)}
                              </div>
                            </div>
                          )}
                          
                          {payment.orders.total && (
                            <div>
                              <label className="text-xs text-muted-foreground">Order Total</label>
                              <div className="text-sm font-semibold mt-1">
                                {formatCurrency(payment.orders.total, payment.orders.currency || payment.currency)}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {payment.orders.payments && payment.orders.payments.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs text-muted-foreground">Payment History</label>
                              <Badge variant="outline" className="text-xs">
                                {payment.orders.payments.length} payment{payment.orders.payments.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-muted-foreground rounded-md border bg-slate-50 p-3">
                              <div className="flex justify-between items-center">
                                <span>This is {payment.id === payment.orders.payments[0]?.id ? 'the first' : 'one of multiple'} payments for this order.</span>
                                <Button variant="outline" size="sm" asChild className="ml-2">
                                  <Link href={`/@${org.slug}/orders/${payment.orders.id}`}>
                                    View All Payments
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {payment.orders.suborders && payment.orders.suborders.length > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground block mb-2">Products</label>
                            <div className="space-y-2">
                              {payment.orders.suborders.map((suborder: any, index: number) => (
                                suborder.product && (
                                  <div key={index} className="rounded-lg border border-gray-200 p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col md:flex-row justify-between">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                        <div className="font-medium">
                                            {suborder.product.id ? (
                                              <Link 
                                                href={`/@${org.slug}/products/${suborder.product.id}`}
                                                className="hover:text-primary hover:underline"
                                              >
                                                {suborder.product.name}
                                              </Link>
                                            ) : (
                                              suborder.product.name
                                            )}
                        </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2">
                                          {suborder.product.type && (
                                            <Badge variant="outline" className="text-xs">
                                              {suborder.product.type}
                                            </Badge>
                                          )}
                                          
                                          {suborder.product.id && (
                                            <Badge variant="secondary" className="text-xs font-mono">
                                              ID: {suborder.product.id.substring(0, 6)}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {suborder.product.description && (
                                          <div className="text-sm text-gray-500 line-clamp-2">
                                            {suborder.product.description}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="text-right mt-3 md:mt-0 md:ml-4 md:min-w-[120px]">
                                        <div className="font-semibold">
                          {formatCurrency(
                                            suborder.product.price,
                                            suborder.product.currency || payment.currency
                          )}
                        </div>
                                        <div className="text-xs space-y-1 mt-1">
                                          <div className="text-gray-500">
                                            Quantity: {suborder.quantity || 1}
                                          </div>
                                          
                                          {suborder.product.price_structure && (
                                            <div className="text-gray-500">
                                              {suborder.product.price_structure}
                          </div>
                        )}
                                          
                                          {suborder.product.billing_period && (
                                            <div className="text-gray-500">
                                              {suborder.product.billing_period}
                      </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
                  
                  {/* Billing Details Section - Moved to bottom */}
                  <Card className="mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Billing Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {(() => {
                        console.log("Payment object for debugging:", payment);
                        console.log("Billing details:", payment.billing_details);
                        
                        // Safeguard with extra error handling
                        try {
                          if (payment.billing_details) {
                            return (
                              <div className="space-y-4">
                                {/* Customer Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {payment.billing_details.name && (
                                    <div>
                                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer Name</h4>
                                      <div className="text-sm">{payment.billing_details.name}</div>
                                    </div>
                                  )}
                                  
                                  {payment.billing_details.email && (
                                    <div>
                                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                                      <div className="text-sm flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        <a href={`mailto:${payment.billing_details.email}`} className="hover:underline hover:text-primary">
                                          {payment.billing_details.email}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {payment.billing_details.phone && (
                                    <div>
                                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                                      <div className="text-sm flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                        <a href={`tel:${payment.billing_details.phone}`} className="hover:underline hover:text-primary">
                                          {payment.billing_details.phone}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Address if available */}
                                {payment.billing_details.address && (
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Billing Address</h4>
                                    <div className="text-sm space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <div>
                                          {payment.billing_details.address.line1 || ''}
                                          {payment.billing_details.address.line2 && `, ${payment.billing_details.address.line2}`}
                                        </div>
                                      </div>
                                      {(payment.billing_details.address.city || payment.billing_details.address.state || payment.billing_details.address.postal_code) && (
                                        <div className="ml-5">
                                          {payment.billing_details.address.city || ''}
                                          {payment.billing_details.address.state && payment.billing_details.address.city ? `, ${payment.billing_details.address.state}` : payment.billing_details.address.state || ''}
                                          {payment.billing_details.address.postal_code && ` ${payment.billing_details.address.postal_code}`}
                                        </div>
                                      )}
                                      {payment.billing_details.address.country && (
                                        <div className="ml-5">
                                          {payment.billing_details.address.country}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          } else if (payment.user) {
                            return (
                              <div className="space-y-4">
                                {/* Show basic user info from payment.user if no billing details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {payment.user.name && (
                                    <div>
                                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer Name</h4>
                                      <div className="text-sm font-medium flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs bg-primary/10">
                                            {payment.user.name ? payment.user.name.split(' ').map((n: string) => n[0]).join('') : '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        {payment.user.name}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {payment.user.email && (
                                    <div>
                                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                                      <div className="text-sm flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        <a href={`mailto:${payment.user.email}`} className="hover:underline hover:text-primary">
                                          {payment.user.email}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* User Account Link */}
                                <div className="pt-2">
                                  <Button variant="outline" size="sm" asChild className="text-xs h-7">
                                    <Link href={`/@${org.slug}/customers/${payment.user.id}`}>
                                      <User className="h-3.5 w-3.5 mr-1" />
                                      View Customer Profile
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-sm text-muted-foreground italic">
                                No billing details available for this payment.
                              </div>
                            );
                          }
                        } catch (error) {
                          console.error("Error rendering billing details section:", error);
                          return (
                            <div className="text-sm text-red-500">
                              Error displaying billing details. Please check the console for more information.
                            </div>
                          );
                        }
                      })()}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Payment Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline payment={payment} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Status/Sidebar */}
        <div className="space-y-6">
          {payment.status === 'pending' && canProcess && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This payment is awaiting your approval.</p>
                <div className="space-y-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRejectClick}
                    disabled={isRejecting}
                    className="w-full justify-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApproveClick}
                    disabled={isApproving}
                    className="w-full justify-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {payment.status === 'pending_approval' && canProcess && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This payment is awaiting your approval.</p>
                <div className="space-y-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRejectClick}
                    disabled={isRejecting}
                    className="w-full justify-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApproveClick}
                    disabled={isApproving}
                    className="w-full justify-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {payment.status === 'paid' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Payment Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This payment has been approved and marked as paid.</p>
              </CardContent>
            </Card>
          )}
          
          {payment.status === 'rejected' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-primary" />
                  Payment Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This payment has been rejected.</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <Link 
                  href={`/@${org.slug}/payments`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">All Payments</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                {payment.orders && (
                  <Link 
                    href={`/@${org.slug}/orders/${payment.orders.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium">View Order</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you want to approve this payment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="approve-notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="approve-notes"
              value={dialogNotes}
              onChange={(e) => setDialogNotes(e.target.value)}
              placeholder="Add notes about this approval..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isApproving}
              onClick={() => {
                setDialogNotes(notes);
                setIsApproveDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving || !dialogNotes.trim()}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isApproving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you want to reject this payment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="reject-notes"
              value={dialogNotes}
              onChange={(e) => setDialogNotes(e.target.value)}
              placeholder="Add notes about this rejection..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isRejecting}
              onClick={() => {
                setDialogNotes(notes);
                setIsRejectDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !dialogNotes.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {isRejecting ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
