'use client';

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IMembershipTierProduct } from "@/lib/types/product";
import { FileText, PlusCircle, Check, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { MembershipActivationType } from "@/lib/types/membership";

interface EditMembershipTierFormProps {
  tier: IMembershipTierProduct;
  groupId: string;
  onSuccess?: () => void;
}

export function EditMembershipTierForm({ tier, groupId, onSuccess }: EditMembershipTierFormProps) {
  // Step 1: Initialize name and description from tier prop
  const [name, setName] = useState(tier.name || "Premium Membership");
  const [description, setDescription] = useState(tier.description || "This premium tier offers exclusive benefits to members.");
  
  // Step 2: Initialize price and duration from tier prop
  const [price, setPrice] = useState(tier.price ? (tier.price / 100).toString() : "99.99"); // Convert cents to dollars
  const [duration, setDuration] = useState(tier.membership_tier?.duration_months?.toString() || "12");
  
  // Step 3: Initialize activation settings based on activation_type
  const activationType = tier.membership_tier?.activation_type || MembershipActivationType.AUTOMATIC;
  const [requiresForm, setRequiresForm] = useState(
    activationType === MembershipActivationType.FORM_REQUIRED ||
    activationType === MembershipActivationType.FORM_THEN_PAYMENT ||
    activationType === MembershipActivationType.FORM_THEN_REVIEW ||
    activationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW
  );
  const [requiresReview, setRequiresReview] = useState(
    activationType === MembershipActivationType.REVIEW_REQUIRED ||
    activationType === MembershipActivationType.REVIEW_THEN_PAYMENT ||
    activationType === MembershipActivationType.FORM_THEN_REVIEW ||
    activationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW
  );
  
  // Step 4: Initialize member ID format from tier data
  const [memberIdFormat, setMemberIdFormat] = useState(tier.membership_tier?.member_id_format || "MEM-{YYYY}-{SEQ:3}");

  // Log tier data to help debug
  useEffect(() => {
    console.log("Tier data:", tier);
    console.log("Activation type:", activationType);
  }, [tier, activationType]);

  // Monitor for layout anomalies
  useEffect(() => {
    // Function to check for potential layout issues
    const checkForLayoutIssues = () => {
      const mainContainer = document.querySelector('.grid.grid-cols-3');
      if (mainContainer) {
        const height = mainContainer.clientHeight;
        console.log("Main container height:", height);
        
        // Check for unusually large heights which might indicate layout issues
        if (height > 2000) {
          console.warn("Potential layout anomaly detected: Container height is unusually large");
        }
        
        // Check for overflow issues
        const hasOverflow = Array.from(mainContainer.children).some(child => {
          const styles = window.getComputedStyle(child);
          return styles.overflow === 'visible' && child.scrollHeight > child.clientHeight;
        });
        
        if (hasOverflow) {
          console.warn("Potential layout anomaly detected: Overflow issues found");
        }
      }
    };
    
    // Run the check after the component has rendered
    const timeoutId = setTimeout(checkForLayoutIssues, 500);
    
    return () => clearTimeout(timeoutId);
  }, [name, description, price, duration, requiresForm, requiresReview, memberIdFormat]);

  return (
    <div className="space-y-8">
      {/* Status Bar */}
      <div>
        <div className="flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold">Edit Membership Tier</h1>
        </div>
        <Separator />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Main Content - Col 1-2 */}
        <div className="col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground">
                  Configure the core details of your membership tier.
                </p>
              </div>
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="e.g., Basic Membership"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe what this membership tier offers..."
                    className="min-h-[100px] resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing & Duration */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Pricing & Duration</h2>
                <p className="text-sm text-muted-foreground">
                  Set the price and duration for this membership tier.
                </p>
              </div>
              <Separator />
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  <span className="text-muted-foreground">months</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Activation Settings */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Activation Process</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how members are activated for this tier.
                </p>
              </div>
              <Separator />

              <div className="space-y-4">
                <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                  <Switch 
                    checked={requiresForm} 
                    onCheckedChange={setRequiresForm}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Application Form</label>
                    <p className="text-sm text-muted-foreground">
                      Require members to complete an application form before joining
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                  <Switch 
                    checked={requiresReview} 
                    onCheckedChange={setRequiresReview}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Admin Review</label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval before membership is granted
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">Current Activation Flow</h3>
                <div className="flex items-center gap-2">
                  {requiresForm && (
                    <>
                      <Badge variant="secondary" className="h-7">Complete Form</Badge>
                      <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6"/>
                      </svg>
                    </>
                  )}
                  {requiresReview && (
                    <>
                      <Badge variant="secondary" className="h-7">Admin Review</Badge>
                      <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6"/>
                      </svg>
                    </>
                  )}
                  <Badge variant="secondary" className="h-7">Membership Granted</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - Col 3 */}
        <div className="space-y-6">
          {/* Member ID Format */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Member ID Format</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how member IDs are generated.
                </p>
              </div>
              <Separator />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Format Pattern</label>
                <Input
                  value={memberIdFormat}
                  onChange={(e) => setMemberIdFormat(e.target.value)}
                />
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium">Available tokens:</p>
                  <div className="space-y-1">
                    {[
                      { token: '{SEQ:n}', desc: 'Sequential number' },
                      { token: '{YYYY}', desc: '4-digit year' },
                      { token: '{YY}', desc: '2-digit year' },
                      { token: '{MM}', desc: 'Month' },
                      { token: '{DD}', desc: 'Day' }
                    ].map(({ token, desc }) => (
                      <div key={token} className="flex items-center gap-2 text-sm">
                        <code className="px-1 py-0.5 rounded bg-muted">{token}</code>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Form Template Selection */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Application Form</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the form template for applications.
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Change
                </Button>
              </div>
              <Separator />

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">Standard Application</p>
                    <p className="text-sm text-muted-foreground">
                      Basic information collection form
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Member Roles */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Member Roles</h2>
                  <p className="text-sm text-muted-foreground">
                    Assign roles to members in this tier.
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </div>
              <Separator />

              <div className="flex flex-wrap gap-2">
                <Badge className="flex items-center gap-1 px-3 py-1">
                  <span>Member</span>
                  <button className="ml-1 text-muted-foreground hover:text-foreground">×</button>
                </Badge>
                <Badge className="flex items-center gap-1 px-3 py-1">
                  <span>Contributor</span>
                  <button className="ml-1 text-muted-foreground hover:text-foreground">×</button>
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
} 