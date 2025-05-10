"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { OrderType } from "@/lib/types/order";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Plus, Search, Check, UserCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  
  console.log("Component rendered with users:", users.length);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "one_time" as OrderType,
      suborders: [{ productId: "", amount: 0, currency: "USD" }],
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
    if (selectedProduct) {
      const currentSuborders = form.getValues("suborders");
      currentSuborders[index].amount = selectedProduct.price;
      currentSuborders[index].currency = selectedProduct.currency;
      
      form.setValue(`suborders.${index}.amount`, selectedProduct.price);
      form.setValue(`suborders.${index}.currency`, selectedProduct.currency);
      
      // Set order type based on the product type
      if (selectedProduct.type === "membership_tier") {
        form.setValue("type", "membership");
      } else if (selectedProduct.type === "subscription") {
        form.setValue("type", "subscription");
      } else {
        form.setValue("type", "one_time");
      }
      
      calculateOrderTotal();
    }
  };

  const addProduct = () => {
    append({ productId: "", amount: 0, currency: "USD" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Order</CardTitle>
        <CardDescription>Add one or more products to the order</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Selection with Search */}
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

            {/* Order Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select order type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Products</h3>
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
              
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/30">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Product Selection */}
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`suborders.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleProductChange(value, index);
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`suborders.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (cents)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => {
                                field.onChange(e);
                                calculateOrderTotal();
                              }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Currency */}
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`suborders.${index}.currency`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Remove button */}
                    <div className="col-span-1 flex items-end justify-end">
                      {fields.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {form.formState.errors.suborders?.message && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.suborders?.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Order Total:</span>
                <span>{new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: form.watch("suborders")[0]?.currency || "USD",
                  minimumFractionDigits: 2
                }).format(orderTotal / 100)}</span>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Order"}
        </Button>
      </CardFooter>
    </Card>
  );
} 