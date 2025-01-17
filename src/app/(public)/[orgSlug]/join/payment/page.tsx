import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { withOrgAccess } from "@/lib/hoc/org";

function PaymentPage() {
  return (
    <Card className="w-[600px]">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>
          This page will be implemented to handle membership payments.
        </CardDescription>
      </CardHeader>
    </Card>
  );
} 

export default withOrgAccess(PaymentPage);