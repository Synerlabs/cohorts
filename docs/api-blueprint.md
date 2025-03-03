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
  - `type`: Filter by organization type
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
    "parent_id": "uuid (optional)",
    "type": "string (optional)"
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
    "activation_type": "string (automatic|review_required|payment_required|review_then_payment)",
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

6. **Cross-Organization Operations**: Some operations may need to span multiple organizations in the hierarchy, especially for payment distributions.

7. **Payment Processing Workflow**:
   - When processing payments for bundled memberships or memberships subject to revenue sharing:
     1. Create the payment record
     2. Apply revenue sharing rules
     3. Create distribution records
     4. Activate memberships
     5. Notify relevant organizations
   
8. **Financial Reconciliation**:
   - The system should provide tools for reconciling distributed payments
   - Reporting should make it clear how payments were split
   - Audit trails should be maintained for all financial transactions 