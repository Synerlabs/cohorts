import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrganizationTierEnrollDialog } from "./OrganizationTierEnrollDialog";
import { OrganizationTierDialog } from "./OrganizationTierDialog";
import { CalendarClock, Coins, Building2 } from "lucide-react";

interface OrganizationTierCardProps {
  tier: {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration_months: number;
    relationship_type: string;
    activation_type: string;
    host_organization_name: string;
  };
  currentGroupId: string;
  isHost?: boolean;
}

export function OrganizationTierCard({ tier, currentGroupId, isHost = false }: OrganizationTierCardProps) {
  const {
    id,
    name,
    description,
    price,
    duration_months,
    relationship_type,
    activation_type,
    host_organization_name,
  } = tier;

  // Format currency manually if the import is unavailable
  const formatCurrencyFallback = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant={relationship_type === "parent" ? "default" : "secondary"}>
            {relationship_type === "parent" ? "Parent" : "Child"}
          </Badge>
        </div>
        <CardDescription>
          {description || `Affiliation tier by ${host_organization_name}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center">
            <Coins className="mr-2 h-4 w-4" />
            Price
          </span>
          <span className="font-medium">
            {price > 0 ? formatCurrencyFallback(price) : "Free"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center">
            <CalendarClock className="mr-2 h-4 w-4" />
            Duration
          </span>
          <span className="font-medium">
            {duration_months} {duration_months === 1 ? "month" : "months"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            Activation
          </span>
          <span className="font-medium capitalize">
            {activation_type.replace(/_/g, " ")}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        {isHost ? (
          <div className="w-full grid grid-cols-2 gap-2">
            <OrganizationTierDialog 
              hostGroupId={currentGroupId}
              trigger={<button className="w-full px-4 py-2 border rounded">Edit Tier</button>}
            />
            <OrganizationTierEditButton tierId={id} />
          </div>
        ) : (
          <OrganizationTierEnrollDialog 
            tierId={id}
            tierName={name}
            groupId={currentGroupId}
          />
        )}
      </CardFooter>
    </Card>
  );
}

function OrganizationTierEditButton({ tierId }: { tierId: string }) {
  return (
    <div className="w-full">
      {/* Placeholder for a future edit button */}
      <span>{/* Future edit functionality */}</span>
    </div>
  );
} 