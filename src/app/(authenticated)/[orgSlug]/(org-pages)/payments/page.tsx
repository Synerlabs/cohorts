import { createClient } from "@/lib/utils/supabase/server";
import { ManualPaymentForm } from "./_components/manual-payment-form";
import { PaymentManagement } from "./_components/payment-management";
import { useToastStateAction } from "@/hooks/use-toast-action-state";

export default async function PaymentsPage({
  params: { orgSlug },
}: {
  params: { orgSlug: string };
}) {
  useToastStateAction();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("group_id", orgSlug)
    .eq("user_id", user?.id)
    .single();

  const isAdmin = member?.role === "admin";

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      {isAdmin ? (
        <PaymentManagement orderId={orgSlug} userId={user?.id || ""} />
      ) : (
        <ManualPaymentForm paymentId={orgSlug} />
      )}
    </div>
  );
} 