# Forms Feature

The forms feature allows organizations to create, manage, and collect responses from customizable forms. Forms can be used for various purposes such as applications, surveys, registrations, and data collection.

## Form Builder

The form builder provides a drag-and-drop interface for creating and editing forms with various field types and configurations.

### Field Types

1. **Basic Fields**
   - Short Text: Single line text input for short responses
   - Long Text: Multi-line text input for longer responses
   - Email: Input field with email validation
   - Number: Input field for numeric values
   - Phone: Input field for phone numbers
   - Date: Date picker field
   - Time: Time picker field

2. **Choice Fields**
   - Single Select (Radio): Radio buttons for selecting one option
   - Multiple Select (Checkbox): Checkboxes for selecting multiple options
   - Dropdown: Select menu for selecting one option

3. **Special Fields**
   - File Upload: Allow users to upload files with configurable:
     - Accepted file types
     - Maximum file size
     - Preview functionality

4. **Structural Fields**
   - Section: Group fields into logical sections with:
     - Optional title and description
     - Can be converted into wizard steps
     - Configurable visibility of section title
     - Can contain any type of field (basic, choice, special, or other sections)
     - Supports nested sections for complex form hierarchies
   
   - Repeatable Section: Group of fields that can be repeated, ideal for:
     - Work experience entries
     - Education history
     - References
     - Portfolio items
     - Configurable minimum and maximum number of repetitions
     - Can contain any type of field, including sections and other repeatable sections

### Field Properties

Each field can be configured with:
- Label: The field's display name
- Help Text: Additional instructions or context
- Required/Optional status
- Type-specific configurations (e.g., file types for file uploads)

### Form Organization

Forms can be organized using:
1. **Sections**
   - Group related fields together
   - Add descriptions for context
   - Show/hide section titles
   - Convert sections into wizard steps for multi-step forms

2. **Repeatable Groups**
   - Create groups of fields that users can repeat
   - Set minimum required entries
   - Set maximum allowed entries (optional)
   - Ideal for collecting multiple instances of the same type of information

3. **Wizard Steps**
   - Convert sections into steps for a multi-step form
   - Provide a better user experience for long forms
   - Guide users through the form completion process

### Field Management

The form builder supports:
- Drag and drop reordering of fields with advanced capabilities:
  - Move fields up and down within the same level
  - Drag fields between different sections
  - Drag fields in and out of repeatable sections
  - Drag sections into other sections for nesting
  - Drag fields across any level of the form hierarchy
- Adding new fields through an intuitive dialog:
  - Add fields at the root level
  - Add fields directly into any section
  - Add fields into repeatable sections
- Editing existing fields
- Deleting fields (with cascade deletion for sections)
- Nesting fields within sections and repeatable groups
- Visual indicators for valid drop targets during drag operations
- Automatic scrolling during drag operations for long forms

### Form Hierarchy

Forms support a flexible hierarchical structure:
1. **Root Level**
   - Can contain any type of field
   - Main organizational level of the form

2. **Section Level**
   - Can contain any type of field
   - Can be nested within other sections
   - No limit on nesting depth (within reasonable bounds)
   - Supports drag-and-drop between any levels

3. **Repeatable Section Level**
   - Can contain any type of field
   - Can include sections and other repeatable sections
   - Supports drag-and-drop between instances and other levels

## Form Templates

Forms are saved as templates that can be:
- Created from scratch
- Edited at any time
- Published for use
- Deleted when no longer needed

### Template Status

Templates can have different statuses:
- Draft: Still being worked on
- Published: Ready for use
- Archived: No longer in use but preserved

### Template Management

Organizations can:
- View all their form templates
- Create new templates
- Edit existing templates
- Delete templates
- Publish templates for use

## Form Responses

When published, forms can collect responses that are:
- Stored securely in the database
- Associated with the form template
- Linked to the submitting user (if authenticated)
- Timestamped and tracked

### Response Data

Each response includes:
- Form field values
- Submission timestamp
- Submitter information (if authenticated)
- IP address
- User agent information

## Security

The forms feature implements several security measures:

### Access Control
- Only organization members can create and manage forms
- Form templates are organization-scoped
- Responses are protected and only accessible to authorized users

### File Upload Security
- File uploads are stored in a secure bucket
- File types are validated
- File sizes are limited
- Public access is controlled through storage policies

### Data Protection
- Form data is stored in the database with proper RLS policies
- File uploads are stored in a dedicated storage bucket
- Access to form responses is controlled through organization membership

## Database Schema

The feature uses the following tables:

### form_templates
- id: UUID (Primary Key)
- org_id: UUID (Foreign Key to organizations)
- title: VARCHAR(255)
- description: TEXT
- schema: JSONB (Stores form structure)
- settings: JSONB (Form-wide settings)
- status: VARCHAR(20)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- created_by: UUID
- updated_by: UUID

### form_responses
- id: UUID (Primary Key)
- template_id: UUID (Foreign Key to form_templates)
- response_data: JSONB
- submitted_by: UUID
- submitted_at: TIMESTAMP
- ip_address: VARCHAR(45)
- user_agent: TEXT

## Storage

Form file uploads are stored in a dedicated 'form-uploads' bucket with:
- Public access controls
- User-specific upload permissions
- Proper file organization
- Automatic file cleanup (optional) 