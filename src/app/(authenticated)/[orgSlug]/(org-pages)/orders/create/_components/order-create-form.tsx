"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import * as z from "zod";
import { OrderType } from "@/lib/types/order";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Plus, Search, Check, UserCircle2, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MembershipOverridesSlideover } from "./membership-overrides-slideover";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
}

interface GroupUser {
  id: string;
  user_id: string;
  user_data: {
    id: string;
    email: string;
    full_name: string;
  };
}

interface OrderCreateFormProps {
  products: Product[];
  users: GroupUser[];
  createOrder: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

// Form schema
const suborderSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  currency: z.string().min(1, "Currency is required"),
  membershipIdOverride: z.string().optional(),
  membershipStartDate: z.string().optional(),
  membershipEndDate: z.string().optional(),
});

const formSchema = z.object({
  userId: z.string().min(1, "User is required"),
  type: z.enum(["membership", "subscription", "one_time"] as const),
  suborders: z.array(suborderSchema).min(1, "At least one product is required"),
});

export default function OrderCreateForm({ products, users, createOrder }: OrderCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<GroupUser[]>(users.slice(0, 10));
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [isMembershipProductSelected, setIsMembershipProductSelected] = useState(false);
  const [editingSuborderIndex, setEditingSuborderIndex] = useState<number | null>(null);
  const [isMembershipSlideoverOpen, setIsMembershipSlideoverOpen] = useState(false);
  
  console.log("Component rendered with users:", users.length);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "one_time" as OrderType,
      suborders: [{ 
        productId: "", 
        amount: 0, 
        currency: "USD",
        membershipIdOverride: "",
        membershipStartDate: "",
        membershipEndDate: "",
      }],
    },
  });

  // Initialize filtered users
  useEffect(() => {
    console.log("Users array length:", users.length);
    setFilteredUsers(users.slice(0, 10));
  }, [users]);

  // Filter users when search query changes
  useEffect(() => {
    console.log("Search query:", userSearchQuery);
    console.log("All users count:", users.length);
    
    if (!userSearchQuery) {
      const initialUsers = users.slice(0, 10);
      console.log("Setting initial users:", initialUsers.length);
      setFilteredUsers(initialUsers);
      return;
    }
    
    const query = userSearchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const fullName = user.user_data.full_name?.toLowerCase() || "";
      const email = user.user_data.email.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    }).slice(0, 10);
    
    console.log("Filtered users:", filtered.length);
    setFilteredUsers(filtered);
  }, [userSearchQuery, users]);

  // Field array for dynamic suborders
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "suborders",
  });

  // Calculate order total when suborders change
  const calculateOrderTotal = () => {
    const suborders = form.watch("suborders");
    const total = suborders.reduce((acc, item) => acc + (item.amount || 0), 0);
    setOrderTotal(total);
    return total;
  };

  // Watch for changes in suborders
  form.watch(() => {
    calculateOrderTotal();
  });

  const handleOpenMembershipOverrides = (index: number) => {
    setEditingSuborderIndex(index);
    setIsMembershipSlideoverOpen(true);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("userId", data.userId);
      formData.append("type", data.type);
      
      // Add suborders data
      const totalAmount = calculateOrderTotal();
      const mainCurrency = data.suborders[0]?.currency || "USD";
      
      formData.append("amount", totalAmount.toString());
      formData.append("currency", mainCurrency);
      formData.append("subordersData", JSON.stringify(data.suborders));

      const result = await createOrder(formData);
      
      if (!result.success) {
        toast({
          title: "Error creating order",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Order created",
          description: "The order has been created successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error creating order",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // When product changes, update the amount and currency
  const handleProductChange = (value: string, index: number) => {
    const selectedProduct = products.find(p => p.id === value);
    let isAnyMembershipTierSelected = false;

    if (selectedProduct) {
      form.setValue(`suborders.${index}.amount`, selectedProduct.price);
      form.setValue(`suborders.${index}.currency`, selectedProduct.currency);
      if (selectedProduct.type !== "membership_tier") {
        form.setValue(`suborders.${index}.membershipIdOverride`, "");
        form.setValue(`suborders.${index}.membershipStartDate`, "");
        form.setValue(`suborders.${index}.membershipEndDate`, "");
      }
    } else {
      form.setValue(`suborders.${index}.membershipIdOverride`, "");
      form.setValue(`suborders.${index}.membershipStartDate`, "");
      form.setValue(`suborders.${index}.membershipEndDate`, "");
    }

    // Check all current suborders for a membership tier
    const currentSuborders = form.getValues("suborders");
    currentSuborders.forEach((suborder, i) => {
      // If this is the suborder being changed, use the new selectedProduct
      const productToCheck = (i === index && selectedProduct) ? selectedProduct : products.find(p => p.id === suborder.productId);
      if (productToCheck && productToCheck.type === "membership_tier") {
        isAnyMembershipTierSelected = true;
      }
    });
    
    setIsMembershipProductSelected(isAnyMembershipTierSelected);

    if (isAnyMembershipTierSelected) {
      form.setValue("type", "membership");
    } else {
      // If no membership tiers are selected, default to one_time or allow user selection
      // For now, let's reset to one_time if no specific product dictates the type.
      // Or, you might want to preserve user's explicit choice if they changed it.
      // For simplicity, if the currently selected product (if any for this index) isn't subscription,
      // set to one_time. This logic might need refinement based on desired UX.
      const currentProductForIndex = products.find(p => p.id === form.getValues(`suborders.${index}.productId`));
      if (currentProductForIndex && currentProductForIndex.type === 'subscription'){
        form.setValue("type", "subscription");
      } else if (!isAnyMembershipTierSelected) {
        form.setValue("type", "one_time"); 
      }
    }
      
    calculateOrderTotal();
  };

  const addProduct = () => {
    append({ productId: "", amount: 0, currency: "USD", membershipIdOverride: "", membershipStartDate: "", membershipEndDate: "" });
  };

  // Get user display name (full name or email)
  const getUserDisplayName = (userId: string) => {
    const selectedUser = users.find(u => u.user_id === userId);
    if (!selectedUser) return "Select a user";
    return selectedUser.user_data.full_name || selectedUser.user_data.email;
  };

  // Handle user selection from command menu
  const handleUserSelect = (currentValue: string) => {
    console.log("Selected value:", currentValue);
    form.setValue("userId", currentValue);
    setUserPopoverOpen(false);
  };

  // Fallback handler for direct clicks
  const handleDirectUserSelect = (userId: string) => {
    console.log("Direct select:", userId);
    form.setValue("userId", userId);
    setUserPopoverOpen(false);
  };

  // Handle clearing a product selection
  const handleClearProduct = (index: number) => {
    form.setValue(`suborders.${index}.productId`, "");
    form.setValue(`suborders.${index}.amount`, 0);
    form.setValue(`suborders.${index}.currency`, "USD");
    // Trigger re-evaluation of membership status and order type
    handleProductChange("", index); 
  };

  return (
    <FormProvider {...form}>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Create New Order</CardTitle>
          <CardDescription>Create a new order with one or more products</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Customer Info & Order Type */}
                <div className="md:col-span-1 space-y-6 pb-6 md:border-r md:pr-8">
                  <h3 className="text-lg font-medium">Customer Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the user who will be charged for this order and the order type.
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>User</FormLabel>
                        <div className="text-xs text-muted-foreground mb-1">
                          {users.length} users available ({filteredUsers.length} shown)
                        </div>
                        <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={userPopoverOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <UserCircle2 className="h-4 w-4" />
                                  <span className="truncate">{field.value ? getUserDisplayName(field.value) : "Select a user"}</span>
                                </div>
                                <Search className="h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <div className="max-h-[300px] overflow-y-auto">
                              <div className="flex items-center border-b px-3">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <input
                                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                  placeholder="Search users..."
                                  value={userSearchQuery}
                                  onChange={(e) => setUserSearchQuery(e.target.value)}
                                />
                              </div>
                              
                              {filteredUsers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No users found
                                </div>
                              ) : (
                                <div className="p-1">
                                  {filteredUsers.map((user) => (
                                    <div
                                      key={user.user_id}
                                      className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        field.value === user.user_id ? "bg-accent text-accent-foreground" : ""
                                      )}
                                      onClick={() => {
                                        console.log("User selected:", user.user_id);
                                        handleDirectUserSelect(user.user_id);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            field.value === user.user_id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{user.user_data.full_name || user.user_data.email}</span>
                                          {user.user_data.full_name && (
                                            <span className="text-xs text-muted-foreground">{user.user_data.email}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isMembershipProductSelected}
                        >
                          <FormControl>
                            <SelectTrigger className={isMembershipProductSelected ? "opacity-70 cursor-not-allowed bg-muted" : ""}>
                              <SelectValue placeholder="Select order type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="membership">Membership</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="one_time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isMembershipProductSelected 
                            ? "Order type set to 'Membership' due to product selection."
                            : "This determines how the order will be processed."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column: Products section */}
                <div className="md:col-span-2 space-y-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium">Order Items</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add one or more products to this order
                    </p>
                    <div className="flex justify-end mb-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addProduct}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-0 overflow-hidden border-border">
                        <div className="bg-muted px-4 py-2 border-b border-border flex justify-between items-center">
                          <h4 className="text-sm font-medium">Item {index + 1}</h4>
                          {fields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span>Remove</span>
                            </Button>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-12 gap-4">
                            {/* Product Selection */}
                            <div className="col-span-12 md:col-span-5">
                              <FormField
                                control={form.control}
                                name={`suborders.${index}.productId`}
                                render={({ field }) => {
                                  const selectedProduct = products.find(p => p.id === field.value);
                                  const isMembershipProduct = selectedProduct?.type === "membership_tier";
                                  return (
                                    <FormItem>
                                      <FormLabel>Product</FormLabel>
                                      <div className="flex gap-2 items-start">
                                        <Select 
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            handleProductChange(value, index);
                                          }} 
                                          value={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select a product" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {products.map((product) => (
                                              <SelectItem key={product.id} value={product.id}>
                                                {product.name} ({product.type}) - {new Intl.NumberFormat('en-US', { 
                                                  style: 'currency', 
                                                  currency: product.currency,
                                                }).format(product.price / 100)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <div className="flex flex-col gap-1 items-center shrink-0">
                                          {field.value && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleClearProduct(index)}
                                              title="Clear product selection"
                                              className="h-9 w-9"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                          {isMembershipProduct && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleOpenMembershipOverrides(index)}
                                              title="Configure Membership Overrides"
                                              className="h-9 w-9"
                                            >
                                              <Settings className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                            </div>

                            {/* Amount */}
                            <div className="col-span-6 md:col-span-4">
                              <FormField
                                control={form.control}
                                name={`suborders.${index}.amount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Amount (cents)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        {...field} 
                                        onChange={(e) => {
                                          field.onChange(e);
                                          calculateOrderTotal();
                                        }}
                                        readOnly={!!form.getValues(`suborders.${index}.productId`)}
                                        disabled={!!form.getValues(`suborders.${index}.productId`)}
                                        className={
                                          !!form.getValues(`suborders.${index}.productId`) 
                                            ? "opacity-70 cursor-not-allowed bg-muted" 
                                            : ""
                                        }
                                      />
                                    </FormControl>
                                    {!!form.getValues(`suborders.${index}.productId`) && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Price from selected product
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Currency */}
                            <div className="col-span-6 md:col-span-3">
                              <FormField
                                control={form.control}
                                name={`suborders.${index}.currency`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                      disabled={!!form.getValues(`suborders.${index}.productId`)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className={
                                          !!form.getValues(`suborders.${index}.productId`) 
                                            ? "opacity-70 cursor-not-allowed bg-muted" 
                                            : ""
                                        }>
                                          <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                        <SelectItem value="CAD">CAD</SelectItem>
                                        <SelectItem value="AUD">AUD</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {!!form.getValues(`suborders.${index}.productId`) && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Currency from selected product
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {form.formState.errors.suborders?.message && (
                      <p className="text-sm font-medium text-destructive">{form.formState.errors.suborders?.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Totals and Actions - Spanning full width below columns */}
              <div className="pt-6 border-t border-border">
                <div className="flex flex-col gap-2 md:w-1/2 md:ml-auto">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: form.watch("suborders")[0]?.currency || "USD",
                      minimumFractionDigits: 2
                    }).format(orderTotal / 100)}</span>
                  </div>

                  <div className="flex justify-between items-center text-lg font-medium">
                    <span>Order Total:</span>
                    <span>{new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: form.watch("suborders")[0]?.currency || "USD",
                      minimumFractionDigits: 2
                    }).format(orderTotal / 100)}</span>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between gap-4 border-t bg-muted/50 px-6 py-4">
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? "Creating..." : "Create Order"}
          </Button>
        </CardFooter>
        <MembershipOverridesSlideover 
          isOpen={isMembershipSlideoverOpen}
          onOpenChange={setIsMembershipSlideoverOpen}
          suborderIndex={editingSuborderIndex}
        />
      </Card>
    </FormProvider>
  );
} 