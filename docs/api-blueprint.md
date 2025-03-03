# API Blueprint

This document outlines the core API endpoints that need to be implemented for the Organization Membership Management SaaS platform. The API is structured around the key resources and operations needed to support the platform's functionality.

## Authentication Endpoints

### `/auth/signup`
- **Method**: POST
- **Description**: Register a new user
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "first_name": "string",
    "last_name": "string"
  }
  ```
- **Response**: User object with token

### `/auth/signin`
- **Method**: POST
- **Description**: Authenticate a user
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: User object with token

## Organizations/Groups Endpoints

### `/groups`
- **Method**: GET
- **Description**: List all groups the authenticated user has access to
- **Query Parameters**:
  - `type_code`: Filter by organization type
  - `parent_id`: Filter by parent organization
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of group objects

### `/groups`
- **Method**: POST
- **Description**: Create a new group/organization
- **Request Body**:
  ```json
  {
    "name": "string",
    "slug": "string",
    "description": "string",
    "type_code": "string",
    "metadata": "object (optional, specific to type)"
  }
  ```
- **Response**: Created group object

### `/groups/{id}`
- **Method**: GET
- **Description**: Get a specific group by ID
- **Response**: Group object with full details

### `/groups/{id}`
- **Method**: PUT
- **Description**: Update a group
- **Request Body**: Group object with fields to update
- **Response**: Updated group object

### `/groups/{id}`
- **Method**: DELETE
- **Description**: Delete a group
- **Response**: Success message

### `/groups/{id}/children`
- **Method**: GET
- **Description**: Get all child organizations of a group
- **Response**: Array of group objects

## Organization Types Endpoints

### `/organization-types`
- **Method**: GET
- **Description**: List all organization types
- **Response**: Array of organization type objects

### `/organization-types`
- **Method**: POST
- **Description**: Create a new organization type (admin only)
- **Request Body**:
  ```json
  {
    "code": "string",
    "name": "string",
    "description": "string",
    "metadata_schema": "object (JSON Schema for validation)"
  }
  ```
- **Response**: Created organization type object

### `/organization-types/{code}`
- **Method**: GET
- **Description**: Get a specific organization type
- **Response**: Organization type object with full details

### `/organization-types/{code}`
- **Method**: PUT
- **Description**: Update an organization type (admin only)
- **Request Body**: Organization type object with fields to update
- **Response**: Updated organization type object

### `/organization-types/{code}`
- **Method**: DELETE
- **Description**: Delete an organization type (admin only)
- **Response**: Success message

## Organization Relationships Endpoints

### `/relationship-types`
- **Method**: GET
- **Description**: List all relationship types
- **Response**: Array of relationship type objects

### `/relationship-types`
- **Method**: POST
- **Description**: Create a new relationship type (admin only)
- **Request Body**:
  ```json
  {
    "code": "string",
    "name": "string",
    "description": "string"
  }
  ```
- **Response**: Created relationship type object

### `/groups/{id}/relationships`
- **Method**: GET
- **Description**: Get all relationships for a group
- **Query Parameters**:
  - `direction`: Filter by direction (outgoing, incoming, both)
  - `relationship_type`: Filter by relationship type
  - `status`: Filter by status
- **Response**: Array of relationship objects

### `/groups/{id}/relationships`
- **Method**: POST
- **Description**: Create a new relationship
- **Request Body**:
  ```json
  {
    "target_group_id": "uuid",
    "relationship_type_code": "string",
    "is_primary": "boolean (optional)",
    "metadata": "object (optional)",
    "valid_from": "date (optional)",
    "valid_until": "date (optional)"
  }
  ```
- **Response**: Created relationship object

### `/relationships/{id}`
- **Method**: GET
- **Description**: Get details of a specific relationship
- **Response**: Relationship object with full details

### `/relationships/{id}`
- **Method**: PUT
- **Description**: Update a relationship
- **Request Body**: Relationship object with fields to update
- **Response**: Updated relationship object

### `/relationships/{id}`
- **Method**: DELETE
- **Description**: Delete a relationship
- **Response**: Success message

### `/relationships/{id}/approve`
- **Method**: POST
- **Description**: Approve a relationship (if approval workflow is enabled)
- **Response**: Updated relationship object

## Organization Requirements Endpoints

### `/groups/{id}/requirements`
- **Method**: GET
- **Description**: Get all requirements for a group
- **Query Parameters**:
  - `type`: Filter by requirement type
  - `is_active`: Filter by active status
- **Response**: Array of requirement objects

### `/groups/{id}/requirements`
- **Method**: POST
- **Description**: Create a new requirement
- **Request Body**:
  ```json
  {
    "requirement_type": "string (APPLICATION_FORM|MEMBERSHIP_TIER|CONNECTED_ORGANIZATION|SUBSCRIPTION)",
    "config": "object (specific to requirement type)",
    "is_active": "boolean (optional)"
  }
  ```
- **Response**: Created requirement object

### `/requirements/{id}`
- **Method**: GET
- **Description**: Get details of a specific requirement
- **Response**: Requirement object with full details

### `/requirements/{id}`
- **Method**: PUT
- **Description**: Update a requirement
- **Request Body**: Requirement object with fields to update
- **Response**: Updated requirement object

### `/requirements/{id}`
- **Method**: DELETE
- **Description**: Delete a requirement
- **Response**: Success message

### `/requirements/{id}/verify`
- **Method**: POST
- **Description**: Verify if a user meets the requirement
- **Request Body**:
  ```json
  {
    "user_id": "uuid"
  }
  ```
- **Response**: Verification result object

## Forms Endpoints

### `/groups/{id}/forms`
- **Method**: GET
- **Description**: Get all forms for a group
- **Response**: Array of form objects

### `/groups/{id}/forms`
- **Method**: POST
- **Description**: Create a new form
- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "fields": "array of field objects",
    "is_active": "boolean (optional)"
  }
  ```
- **Response**: Created form object

### `/forms/{id}`
- **Method**: GET
- **Description**: Get details of a specific form
- **Response**: Form object with full details

### `/forms/{id}`
- **Method**: PUT
- **Description**: Update a form
- **Request Body**: Form object with fields to update
- **Response**: Updated form object

### `/forms/{id}`
- **Method**: DELETE
- **Description**: Delete a form
- **Response**: Success message

### `/forms/{id}/submit`
- **Method**: POST
- **Description**: Submit a form
- **Request Body**:
  ```json
  {
    "user_id": "uuid (optional, defaults to authenticated user)",
    "submission_data": "object (form field values)"
  }
  ```
- **Response**: Created form submission object

### `/form-submissions/{id}`
- **Method**: GET
- **Description**: Get details of a specific form submission
- **Response**: Form submission object with full details

### `/form-submissions/{id}/review`
- **Method**: POST
- **Description**: Review a form submission
- **Request Body**:
  ```json
  {
    "status": "string (APPROVED|REJECTED)",
    "notes": "string (optional)"
  }
  ```
- **Response**: Updated form submission object

### `/forms/{id}/submissions`
- **Method**: GET
- **Description**: Get all submissions for a form
- **Query Parameters**:
  - `status`: Filter by status
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of form submission objects

## Membership Tier Endpoints

### `/groups/{id}/tiers`
- **Method**: GET
- **Description**: Get all membership tiers for a group
- **Response**: Array of membership tier objects

### `/groups/{id}/tiers`
- **Method**: POST
- **Description**: Create a new membership tier for a group
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "price": "number",
    "duration_months": "integer",
    "activation_type": "string (automatic|review_required|payment_required|review_then_payment|form_then_payment|form_then_payment_then_review)",
    "form_id": "uuid (optional, required for form-based activation)",
    "has_parent_membership": "boolean (optional)",
    "parent_tier_id": "uuid (optional, if bundled with parent membership)"
  }
  ```
- **Response**: Created membership tier object

### `/groups/{group_id}/tiers/{tier_id}`
- **Method**: PUT
- **Description**: Update a membership tier
- **Request Body**: Membership tier object with fields to update
- **Response**: Updated membership tier object

### `/groups/{group_id}/tiers/{tier_id}`
- **Method**: DELETE
- **Description**: Delete a membership tier
- **Response**: Success message

## Group Member Endpoints

### `/groups/{id}/members`
- **Method**: GET
- **Description**: List all members of a group
- **Query Parameters**:
  - `role`: Filter by role
  - `is_active`: Filter by active status
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of group member objects

### `/groups/{id}/members`
- **Method**: POST
- **Description**: Add a user to a group
- **Request Body**:
  ```json
  {
    "user_id": "uuid",
    "role_id": "uuid (optional)"
  }
  ```
- **Response**: Created group member object

### `/groups/{group_id}/members/{user_id}`
- **Method**: GET
- **Description**: Get details about a specific member
- **Response**: Group member object with membership details

### `/groups/{group_id}/members/{user_id}`
- **Method**: PUT
- **Description**: Update a member's information
- **Request Body**:
  ```json
  {
    "is_active": "boolean (optional)",
    "role_id": "uuid (optional)"
  }
  ```
- **Response**: Updated group member object

### `/groups/{group_id}/members/{user_id}`
- **Method**: DELETE
- **Description**: Remove a member from a group
- **Response**: Success message

## Membership Endpoints

### `/memberships`
- **Method**: GET
- **Description**: List all memberships for the authenticated user
- **Query Parameters**:
  - `is_active`: Filter by active status
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of membership objects

### `/memberships/{id}`
- **Method**: GET
- **Description**: Get details of a specific membership
- **Response**: Membership object with full details

### `/groups/{group_id}/members/{user_id}/memberships`
- **Method**: POST
- **Description**: Create a new membership for a group member
- **Request Body**:
  ```json
  {
    "tier_id": "uuid",
    "start_date": "date",
    "end_date": "date (optional)"
  }
  ```
- **Response**: Created membership object

### `/memberships/{id}`
- **Method**: PUT
- **Description**: Update a membership
- **Request Body**:
  ```json
  {
    "is_active": "boolean (optional)",
    "end_date": "date (optional)"
  }
  ```
- **Response**: Updated membership object

## Revenue Sharing Endpoints

### `/groups/{parent_id}/revenue-sharing`
- **Method**: GET
- **Description**: Get all revenue sharing rules set by a parent organization
- **Response**: Array of revenue sharing rule objects

### `/groups/{parent_id}/revenue-sharing`
- **Method**: POST
- **Description**: Create a new revenue sharing rule
- **Request Body**:
  ```json
  {
    "child_group_id": "uuid",
    "sharing_type": "string (percentage|fixed_amount)",
    "sharing_value": "number",
    "applied_to": "string (all_tiers|specific_tiers)",
    "specific_tier_ids": ["uuid"] (optional, required if applied_to is specific_tiers)
  }
  ```
- **Response**: Created revenue sharing rule object

### `/groups/{parent_id}/revenue-sharing/{rule_id}`
- **Method**: PUT
- **Description**: Update a revenue sharing rule
- **Request Body**: Revenue sharing rule object with fields to update
- **Response**: Updated revenue sharing rule object

### `/groups/{parent_id}/revenue-sharing/{rule_id}`
- **Method**: DELETE
- **Description**: Delete a revenue sharing rule
- **Response**: Success message

### `/groups/{child_id}/parent-revenue-sharing`
- **Method**: GET
- **Description**: Get all revenue sharing rules applied to a child organization
- **Response**: Array of revenue sharing rule objects

## Payment Distribution Endpoints

### `/payments/{payment_id}/distributions`
- **Method**: GET
- **Description**: Get all distributions for a specific payment
- **Response**: Array of payment distribution objects

### `/groups/{group_id}/payment-distributions`
- **Method**: GET
- **Description**: Get all payment distributions for a group
- **Query Parameters**:
  - `distribution_type`: Filter by distribution type (revenue_share, bundled_membership)
  - `direction`: Filter by direction (incoming, outgoing)
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of payment distribution objects

### `/groups/{group_id}/payment-distributions/summary`
- **Method**: GET
- **Description**: Get a summary of payment distributions for a group
- **Query Parameters**:
  - `period`: Summary period (daily, weekly, monthly, quarterly, yearly)
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
- **Response**: Payment distribution summary object

## Membership Application Endpoints

### `/applications`
- **Method**: POST
- **Description**: Submit a membership application
- **Request Body**:
  ```json
  {
    "group_id": "uuid",
    "tier_id": "uuid",
    "user_id": "uuid (optional, defaults to authenticated user)",
    "form_submission_id": "uuid (optional, if associated with a form submission)",
    "application_data": "object (custom fields)"
  }
  ```
- **Response**: Created application object

### `/groups/{id}/applications`
- **Method**: GET
- **Description**: List all applications for a group
- **Query Parameters**:
  - `status`: Filter by status (pending, approved, rejected)
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of application objects

### `/applications/{id}`
- **Method**: GET
- **Description**: Get details of a specific application
- **Response**: Application object with full details

### `/applications/{id}/approve`
- **Method**: POST
- **Description**: Approve a membership application
- **Response**: Updated application object

### `/applications/{id}/reject`
- **Method**: POST
- **Description**: Reject a membership application
- **Request Body**:
  ```json
  {
    "reason": "string (optional)"
  }
  ```
- **Response**: Updated application object

## Payment Endpoints

### `/payments/create-intent`
- **Method**: POST
- **Description**: Create a payment intent for a membership
- **Request Body**:
  ```json
  {
    "application_id": "uuid",
    "payment_method": "string (stripe|xendit)"
  }
  ```
- **Response**: Payment intent object with client secret

### `/payments/webhook/stripe`
- **Method**: POST
- **Description**: Webhook endpoint for Stripe events
- **Request Body**: Stripe event payload
- **Response**: Acknowledgement

### `/payments/webhook/xendit`
- **Method**: POST
- **Description**: Webhook endpoint for Xendit events
- **Request Body**: Xendit event payload
- **Response**: Acknowledgement

### `/payments`
- **Method**: GET
- **Description**: List payments
- **Query Parameters**:
  - `group_id`: Filter by group
  - `user_id`: Filter by user
  - `status`: Filter by payment status
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `limit`: Number of results per page
  - `offset`: Pagination offset
- **Response**: Array of payment objects

### `/payments/{id}`
- **Method**: GET
- **Description**: Get payment details including distributions
- **Response**: Payment object with distributions

## Role and Permission Endpoints

### `/groups/{id}/roles`
- **Method**: GET
- **Description**: Get all roles defined for a group
- **Response**: Array of role objects

### `/groups/{id}/roles`
- **Method**: POST
- **Description**: Create a new role for a group
- **Request Body**:
  ```json
  {
    "role_name": "string",
    "description": "string",
    "permissions": ["string"],
    "type": "string (GUEST|MEMBER)"
  }
  ```
- **Response**: Created role object

### `/groups/{group_id}/roles/{role_id}`
- **Method**: PUT
- **Description**: Update a role
- **Request Body**: Role object with fields to update
- **Response**: Updated role object

### `/groups/{group_id}/roles/{role_id}`
- **Method**: DELETE
- **Description**: Delete a role
- **Response**: Success message

## User Profile Endpoints

### `/users/me`
- **Method**: GET
- **Description**: Get the authenticated user's profile
- **Response**: User profile object

### `/users/me`
- **Method**: PUT
- **Description**: Update the authenticated user's profile
- **Request Body**: User profile object with fields to update
- **Response**: Updated user profile object

## Reporting Endpoints

### `/groups/{id}/reports/members`
- **Method**: GET
- **Description**: Generate a membership report for a group
- **Query Parameters**:
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `format`: Output format (json, csv)
- **Response**: Membership report in requested format

### `/groups/{id}/reports/revenue`
- **Method**: GET
- **Description**: Generate a revenue report for a group
- **Query Parameters**:
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `format`: Output format (json, csv)
  - `include_distributions`: Whether to include payment distribution details
- **Response**: Revenue report in requested format

### `/groups/{id}/reports/distributions`
- **Method**: GET
- **Description**: Generate a payment distribution report for a group
- **Query Parameters**:
  - `distribution_type`: Filter by distribution type (revenue_share, bundled_membership)
  - `direction`: Filter by direction (incoming, outgoing)
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `format`: Output format (json, csv)
- **Response**: Distribution report in requested format

## Implementation Notes

1. **Authentication**: All endpoints except public registration and login require authentication.

2. **Authorization**: Most endpoints require specific permissions that should be checked.

3. **Pagination**: List endpoints should support pagination to handle large datasets.

4. **Error Handling**: All endpoints should return appropriate HTTP status codes and error messages.

5. **Validation**: Input validation should be implemented for all endpoints to ensure data integrity.

6. **Type-specific Validation**: For organization creation and updates, validation should be performed based on the organization type's metadata schema.

7. **Requirement Verification**: When processing applications or organization changes, requirements should be verified automatically where possible.

8. **Relationship Management**:
   - Some relationships may require approval from the target organization
   - Bidirectional relationships can be established with a single API call
   - Relationship metadata should be validated based on relationship type

9. **Form Processing**:
   - Form submissions may trigger automatic actions based on configuration
   - File uploads in forms should be properly validated and stored
   - Form data should be validated against the form's field definitions

10. **Cross-Organization Operations**: Some operations may need to span multiple organizations in the hierarchy, especially for payment distributions. 