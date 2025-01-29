import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileIcon, ImageIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Payment, Upload } from "@/services/payment/types";

interface PaymentDetailsProps extends OrgAccessHOCProps {
  params: {
    slug: string;
    paymentId: string;
  };
}

function FilePreview({ file }: { file: { originalFilename: string; fileUrl: string } }) {
  if (!file?.originalFilename) return null;
  
  const isImage = file.originalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  return (
    <a
      href={file.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors group"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      )}
      <span className="text-sm text-blue-600 group-hover:text-blue-700 hover:underline flex-1 truncate">
        {file.originalFilename}
      </span>
      <ExternalLinkIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
    </a>
  );
}

async function PaymentDetailsPage({ org, user, params: _params }: PaymentDetailsProps) {
  const params = await _params;
  
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const supabase = await createServiceRoleClient();

  // Get payment details
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      stripe_payments(*),
      manual_payments(*),
      payment_uploads(
        upload:uploads(*)
      ),
      orders(
        *,
        suborders(
          *,
          product:products(*)
        )
      )
    `)
    .eq('id', params.paymentId)
    .eq('group_id', org.id)
    .single();

  if (error || !payment) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/@${org.slug}/payments`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Payment Overview */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1 text-lg font-semibold">
                  {(payment.amount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: payment.currency
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payment.status === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                    payment.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                    'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1">
                  {new Date(payment.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <div className="mt-1 capitalize">{payment.type}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Type Specific Details */}
        {payment.type === 'stripe' && payment.stripe_payments && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Stripe Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Intent ID</label>
                  <div className="mt-1 font-mono text-sm">
                    {payment.stripe_payments.stripe_payment_intent_id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stripe Status</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {payment.stripe_payments.stripe_status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {payment.type === 'manual' && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Manual Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {payment.payment_uploads && payment.payment_uploads.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proof of Payment
                    </label>
                    <div className="rounded-lg border border-gray-200 divide-y">
                      {payment.payment_uploads.map((pu: any) => (
                        <FilePreview 
                          key={pu.upload.id} 
                          file={{
                            originalFilename: pu.upload.original_filename,
                            fileUrl: pu.upload.file_url
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                )}
                {payment.manual_payments?.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {payment.manual_payments.notes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {payment.orders && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order ID</label>
                  <div className="mt-1 font-mono text-sm">{payment.orders.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.orders.status === 'completed' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                      payment.orders.status === 'failed' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                      'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}>
                      {payment.orders.status}
                    </span>
                  </div>
                </div>
                {payment.orders.suborders?.[0]?.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <div className="mt-2 rounded-lg border border-gray-100 p-4 bg-gray-50">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {payment.orders.suborders[0].product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(payment.orders.suborders[0].product.price / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: payment.orders.suborders[0].product.currency || payment.currency
                          })}
                        </div>
                        {payment.orders.suborders[0].product.description && (
                          <div className="text-sm text-gray-500">
                            {payment.orders.suborders[0].product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentDetailsPage); 
