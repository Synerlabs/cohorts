# Codebase Patterns and Best Practices

This document serves as a reference guide for the codebase architecture, patterns, and best practices to maintain consistency across the application.

## Application Architecture

### Framework and Structure

- **Next.js 15**: The application is built using Next.js 15, leveraging the App Router for routing.
- **TypeScript**: All code is written in TypeScript for type safety and improved developer experience.
- **Database**: Supabase PostgreSQL is used as the primary database.

## Data Fetching Patterns

### Server Components

For page components, data can be fetched directly using services:

```tsx
// src/app/(authenticated)/[orgSlug]/(org-pages)/page.tsx
import { GroupService } from "@/services/group.service";

export default async function OrgPage({ params }: { params: { orgSlug: string } }) {
  // Fetch data directly in the page component
  const group = await GroupService.getGroupBySlug(params.orgSlug);
  
  return (
    <div>
      <h1>{group.name}</h1>
      {/* Rest of the component */}
    </div>
  );
}
```

### Service Classes

Service classes handle data fetching and business logic:

```typescript
// src/services/example.service.ts
export class ExampleService {
  // Static methods for easy access
  static async getData(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("table")
      .select("*")
      .eq("id", id)
      .single();
      
    if (error) throw error;
    return data;
  }
  
  // Instance methods when implementing interfaces
  async getData(id: string) {
    // Implementation
  }
}
```

### Server Actions

Server actions are used for form submissions and data mutations:

```typescript
// src/app/(authenticated)/[orgSlug]/(org-pages)/example/_actions/example.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/utils/supabase/server";

// Define validation schema
const exampleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function createExample(formData: FormData) {
  try {
    // Validate input
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };
    
    const validated = exampleSchema.parse(data);
    
    // Perform database operation
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("example")
      .insert(validated)
      .select()
      .single();
      
    if (error) throw error;
    
    // Revalidate paths to refresh data
    revalidatePath(`/org-slug/example`);
    
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating example:", error);
    return { 
      success: false, 
      error: error instanceof z.ZodError 
        ? error.errors 
        : "Failed to create example" 
    };
  }
}
```

## Database Migrations

### Creating and Running Migrations

Migrations are managed using the Supabase CLI:

```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations to the database
npx supabase db push
```

### Migration File Format

Migration files should follow this structure:

```sql
-- src/supabase/migrations/12345678901234_example_migration.sql
CREATE TABLE IF NOT EXISTS public.example (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX example_name_idx ON public.example(name);

-- Add RLS policies
ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.example
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for authenticated users only" ON public.example
  FOR INSERT TO authenticated USING (true);
```

## Permission Handling

### Organization Access HOC

The `withOrgAccess` HOC ensures users have access to organization pages:

```tsx
import { withOrgAccess } from "@/lib/hocs/withOrgAccess";

function OrgPage({ group }) {
  return <div>{/* Page content */}</div>;
}

// Wrap with HOC to enforce permissions
export default withOrgAccess(OrgPage);
```

### Action Middleware

Server actions should use middleware for permission checks:

```typescript
import { withActionAuth } from "@/lib/middleware/withActionAuth";
import { permissions } from "@/lib/constants/permissions";

export const createExample = withActionAuth(
  async (formData: FormData, { userId, groupId }) => {
    // Implementation
  },
  {
    permissions: [permissions.example.create],
  }
);
```

### Permission Components

Client components should use permission wrappers:

```tsx
// Client component permission check
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/constants/permissions";

function AdminButton() {
  return (
    <PermissionGuard permission={permissions.example.admin}>
      <button>Admin Action</button>
    </PermissionGuard>
  );
}

// Server component permission check
import { PermissionCheck } from "@/components/PermissionCheck";

async function AdminSection() {
  return (
    <PermissionCheck permission={permissions.example.admin}>
      {(hasPermission) => hasPermission ? <AdminContent /> : null}
    </PermissionCheck>
  );
}
```

## Component Patterns

### Directory Structure

```
src/app/(authenticated)/[orgSlug]/(org-pages)/feature/
├── page.tsx                 # Main page component
├── new/                     # Create new item page
│   └── page.tsx
├── [id]/                    # Item detail page
│   └── page.tsx
├── _components/             # Private components for this feature
│   ├── FeatureList.tsx
│   └── FeatureForm.tsx
└── _actions/                # Server actions for this feature
    └── feature.action.ts
```

### Form Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createExample } from "../_actions/example.action";

const exampleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof exampleSchema>;

export function ExampleForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(exampleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  async function onSubmit(data: FormValues) {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    
    const result = await createExample(formData);
    
    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Type System

### Base Types and Inheritance

The codebase uses a type inheritance pattern for similar entities:

```typescript
// Base interface
export interface BaseEntity {
  id: string;
  created_at: string;
}

// Inherited type
export type Example = BaseEntity & {
  name: string;
  description: string | null;
};
```

### Zod Schemas

Zod schemas should be defined for validation:

```typescript
import { z } from "zod";

export const exampleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0),
});

export type ExampleType = z.infer<typeof exampleSchema>;
```

## Error Handling

### Standard Error Response Format

```typescript
type ErrorResponse = {
  success: false;
  message: string;
  errors?: string[] | Record<string, string[]>;
};

type SuccessResponse<T> = {
  success: true;
  data: T;
};

type ActionResponse<T> = ErrorResponse | SuccessResponse<T>;
```

### Error Handling in Server Actions

```typescript
export async function exampleAction(formData: FormData): Promise<ActionResponse<ExampleType>> {
  try {
    // Implementation
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error in example action:", error);
    return {
      success: false,
      message: "Failed to perform action",
      errors: error instanceof z.ZodError ? error.errors : undefined,
    };
  }
}
```

## Testing

### Test Structure

```typescript
// __tests__/example.test.ts
import { exampleFunction } from "@/lib/utils/example";

describe("Example", () => {
  beforeEach(() => {
    // Setup
  });
  
  test("should return correct value", () => {
    const result = exampleFunction();
    expect(result).toBe(expected);
  });
});
```

## Best Practices

1. **Follow TypeScript Best Practices**
   - Use strict type checking
   - Avoid `any` types when possible
   - Use interface for public APIs and type for internal structures

2. **Server Component Data Fetching**
   - Fetch data at the component level that needs it
   - Use React Suspense for loading states

3. **Progressive Enhancement**
   - Build forms that work without JavaScript
   - Enhance with client-side validation and interactions

4. **Performance**
   - Use `React.memo` for expensive components
   - Implement pagination for large data sets
   - Use proper cache invalidation strategies

5. **Security**
   - Always validate input data with Zod
   - Apply proper permission checks
   - Use prepared statements for database queries

6. **Accessibility**
   - Use semantic HTML
   - Ensure proper keyboard navigation
   - Follow WCAG guidelines 