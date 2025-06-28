# Suborder Processors & Registry

## Overview

Suborder processors are modular functions responsible for handling the business logic of different suborder types (e.g., membership, product, event) in the system. The suborder processor registry maps each suborder type to its corresponding processor, enabling flexible and extensible order fulfillment workflows.

## Why Use Suborder Processors?
- **Separation of concerns:** Each suborder type can have its own processing logic.
- **Extensibility:** New suborder types can be added without modifying core order processing code.
- **Maintainability:** Business logic for each suborder type is isolated and easier to test.

## How It Works
- When an order is processed, each suborder is dispatched to its processor via the registry.
- The registry is a mapping of suborder type strings to processor functions.
- Each processor receives the suborder data and is responsible for updating its status and performing any side effects (e.g., activating a membership, delivering a product).

## Example: Registry and Processor
```ts
// src/services/suborder-processors/registry.ts
import { membershipSuborderProcessor } from './membership';
import { productSuborderProcessor } from './product';

export const suborderProcessorRegistry = {
  membership: membershipSuborderProcessor,
  product: productSuborderProcessor,
  // Add more as needed
};
```

## Example: Implementing membershipSuborderProcessor (with Hooks)

We recommend implementing the `membershipSuborderProcessor` using pre- and post-processing hooks. This approach allows you to add logging, notifications, analytics, or other custom logic before and after the core membership activation logic.

### Example Implementation
```ts
import { MembershipActivationService } from '@/services/membership-activation.service';

export const membershipSuborderProcessor = async (suborder) => {
  // Pre-processing hook (e.g., logging, validation)
  console.log(`[MembershipSuborderProcessor] Starting processing for suborder`, suborder.id);
  if (!suborder.metadata?.application_id) {
    throw new Error('Membership suborder is missing application_id');
  }

  // Main processing: activate membership
  await MembershipActivationService.processFromSuborder(
    suborder.metadata.application_id,
    suborder.order_id
  );

  // Post-processing hook (e.g., send notification, analytics)
  console.log(`[MembershipSuborderProcessor] Completed processing for suborder`, suborder.id);
  // You could add notification logic here
};
```

### Rationale
- **Extensible:** Easily add custom logic before or after the main processing step.
- **Traceable:** Logging at each step helps with debugging and monitoring.
- **Maintainable:** Keeps the core business logic clear and focused.

You can further expand the hooks as your requirements grow (e.g., error handling, retries, notifications, analytics, etc.).

## Implementing a New Processor
1. **Create a processor function** in `src/services/suborder-processors/` for your suborder type.
2. **Implement the business logic** for that suborder type (e.g., activate membership, deliver product).
3. **Update the registry** in `registry.ts` to include your new processor.
4. **Test** your processor with various suborder scenarios.

## Checklist for Implementing a Processor
- [ ] Processor function created in `suborder-processors/`
- [ ] Handles all required business logic for the suborder type
- [ ] Updates suborder status (`processing`, `completed`, `failed`, etc.)
- [ ] Handles errors and updates status accordingly
- [ ] Registered in `suborderProcessorRegistry`
- [ ] Unit/integration tests written

## Best Practices
- Keep processor functions focused and single-purpose
- Use clear logging for traceability
- Handle all possible suborder statuses and errors
- Write tests for edge cases and failure scenarios

## Current Status
- Most processors are placeholders and must be implemented for full order fulfillment automation.
- Membership activation is handled by the `membershipSuborderProcessor` (see membership activation docs for details).

## Best Practice: Use suborder.process() in Processors

If your registry and processors receive actual Suborder class instances (not just plain data objects), you should call the suborder's `process()` method directly in your processor. This leverages all the business logic, status checks, and error handling already implemented in the class.

### Example
```ts
// In your registry
import { MembershipSuborder } from '@/lib/types/suborder';

export const membershipSuborderProcessor = async (suborder: MembershipSuborder) => {
  await suborder.process();
};
```

### Why?
- **DRY:** Avoids duplicating complex activation and status logic.
- **Robust:** Uses all the checks and transitions already implemented in the class.
- **Maintainable:** Any future changes to activation logic only need to be made in one place.

### What to Check
- The registry and dispatch logic must pass actual Suborder class instances (e.g., created via `SuborderFactory.create(...)`), not just plain data objects.
- If you need to support both, add a type check and instantiate as needed.

### Summary
> **Whenever possible, call `suborder.process()` in your processor for maximum correctness and maintainability.**

---
For more information, see `docs/membership-activation.md` and `docs/features/payment-gateways.md`. 