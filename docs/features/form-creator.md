# Form Creator Feature Specification

## Overview
A dynamic form creation system similar to Google Forms that allows users to create, manage, and collect responses through customizable forms. Forms can be organized into multiple sections presented as a multi-step wizard interface.

## Core Features

### Form Template Management
- Create, edit, and delete form templates
- Templates stored in JSON format
- Support for form sections/steps
- Drag-and-drop form builder interface
- Form preview functionality
- Form publishing and status management (draft/published)

### Form Components
1. Basic Input Types:
   - Short Text
   - Long Text (Textarea)
   - Email
   - Number
   - Phone
   - Date
   - Time
   - Single Select (Radio)
   - Multiple Select (Checkbox)
   - Dropdown
   - File Upload

2. Advanced Components:
   - Repeatable Groups (e.g., Work Experience, Education History)
   - Conditional Fields (Show/Hide based on other field values)
   - Rich Text Editor
   - Rating/Scale
   - Grid/Matrix Questions

### Form Response Management
- Collect and store form submissions
- View individual responses
- Export responses to CSV/Excel
- Basic analytics and response summaries

## Database Schema

### FormTemplate
```sql
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- Stores the form structure and validation rules
    settings JSONB, -- Form-wide settings (e.g., submission limits, notifications)
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

### FormResponse
```sql
CREATE TABLE form_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES form_templates(id),
    response_data JSONB NOT NULL, -- Stores the actual form responses
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

## Form Schema Structure
```typescript
interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  settings: FormSettings;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  helpText?: string;
  validation?: ValidationRule[];
  options?: FieldOption[]; // For select, radio, checkbox
  repeatable?: boolean;
  repeatableConfig?: RepeatableConfig;
  conditional?: ConditionalRule;
}

type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'phone'
  | 'date'
  | 'time'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'file'
  | 'richtext'
  | 'rating'
  | 'matrix';
```

## Implementation Phases

### Phase 1: Core Foundation
1. Database schema setup
2. Basic form template CRUD operations
3. Simple form builder with basic input types
4. Form response storage

### Phase 2: Enhanced Features
1. Multi-step wizard implementation
2. Repeatable groups
3. File upload handling
4. Form validation

### Phase 3: Advanced Features
1. Conditional logic
2. Response analytics
3. Export functionality
4. Rich text editor integration

## Technical Considerations

### Frontend
- Next.js for the application framework
- React Hook Form for form handling
- Drag-and-drop library (react-beautiful-dnd)
- Step wizard component
- JSON schema validation (Zod/Yup)

### Backend
- API endpoints for template and response management
- File storage integration for uploads
- Response data validation
- Rate limiting and security measures

### Security
- Input sanitization
- File upload restrictions
- CSRF protection
- Rate limiting
- Access control based on organization/user permissions

## API Endpoints

### Form Templates
```typescript
// Create template
POST /api/organizations/:orgId/form-templates

// Get templates
GET /api/organizations/:orgId/form-templates

// Get single template
GET /api/organizations/:orgId/form-templates/:templateId

// Update template
PUT /api/organizations/:orgId/form-templates/:templateId

// Delete template
DELETE /api/organizations/:orgId/form-templates/:templateId
```

### Form Responses
```typescript
// Submit response
POST /api/form-templates/:templateId/responses

// Get responses
GET /api/form-templates/:templateId/responses

// Get single response
GET /api/form-templates/:templateId/responses/:responseId

// Export responses
GET /api/form-templates/:templateId/responses/export
```

## Testing Strategy
1. Unit tests for form validation and data transformation
2. Integration tests for API endpoints
3. E2E tests for form creation and submission flows
4. Performance testing for large forms and file uploads

## Future Enhancements
- Form templates library/marketplace
- Advanced analytics and reporting
- Form versioning
- Response workflows and notifications
- API access for external integrations
- Mobile-responsive form builder 