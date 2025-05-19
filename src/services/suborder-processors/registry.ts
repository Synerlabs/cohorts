import { Suborder, MembershipSuborder } from "@/lib/types/suborder";

export type SuborderProcessor = (suborder: Suborder) => Promise<void>;

// Membership handler
export const membershipSuborderProcessor: SuborderProcessor = async (suborder) => {
  // Type guard: ensure this is a MembershipSuborder
  if (suborder instanceof MembershipSuborder) {
    await suborder.process();
  } else {
    throw new Error("membershipSuborderProcessor expects a MembershipSuborder instance");
  }
};

// Placeholder for product handler
export const productSuborderProcessor: SuborderProcessor = async (suborder) => {
  // TODO: Implement product-specific processing logic
  console.log("Processing product suborder", suborder.id);
};

// The registry expects Suborder class instances, not plain data objects
export const suborderProcessorRegistry: Record<string, SuborderProcessor> = {
  membership: membershipSuborderProcessor,
  product: productSuborderProcessor,
  // Add more as needed
}; 