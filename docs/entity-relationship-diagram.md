# Entity Relationship Diagram

This document provides a visual representation of the key entities and their relationships in the Organization Membership Management SaaS platform.

## Core Entities and Relationships

```
+--------------------+     +---------------+     +--------------------+     +-------------------+
|                    |     |               |     |                    |     |                   |
| Organization Type  |<--->|    Group      |<--->| Organization       |<--->|  Relationship     |
|                    |     |               |     | Relationship       |     |  Type             |
+--------------------+     +---------------+     +--------------------+     +-------------------+
                                  ^                      ^
                                  |                      |
                                  v                      |
                          +---------------+              |
                          |               |              |
                          | Group User    |<-------------+
                          |               |
                          +---------------+
                                  ^
                                  |
                                  v
                          +---------------+         +------------------+
                          |               |         |                  |
                          | Membership    |<------->| Membership Tier  |
                          |               |         |                  |
                          +---------------+         +------------------+
                                                             ^
                                                             |
                             +---------------------+         |
                             |                     |         |
                             | Organization        |<--------+
                             | Requirements        |
                             +---------------------+
                                       ^
                                       |
                             +---------------------+         +------------------+
                             |                     |         |                  |
                             | Forms               |<------->| Form Submissions |
                             |                     |         |                  |
                             +---------------------+         +------------------+
```

## Detailed Entity Descriptions

### User
- ID (UUID)
- Email
- Profile information
- Authentication details

### Organization Type
- ID (UUID)
- Code
- Name
- Description
- Metadata Schema

### Group
- ID (UUID)
- Name, Slug
- Description
- Type Code (References Organization Type)
- Created by

### Relationship Type
- ID (UUID)
- Code
- Name
- Description

### Organization Relationship
- ID (UUID)
- Source Group ID (References Group)
- Target Group ID (References Group)
- Relationship Type Code (References Relationship Type)
- Is Primary (boolean)
- Status
- Metadata
- Valid From/Until dates

### Group User
- ID (UUID)
- User ID (References User)
- Group ID (References Group)
- Created At
- Is Active

### Organization Requirements
- ID (UUID)
- Organization ID (References Group)
- Requirement Type (APPLICATION_FORM, MEMBERSHIP_TIER, CONNECTED_ORGANIZATION, SUBSCRIPTION)
- Config (JSON)
- Is Active

### Forms
- ID (UUID)
- Organization ID (References Group)
- Title
- Description
- Fields (JSON)
- Is Active

### Form Submissions
- ID (UUID)
- Form ID (References Forms)
- User ID (References User)
- Submission Data (JSON)
- Status
- Reviewed By
- Reviewed At

### Membership Tier
- ID (UUID)
- Group ID (References Group)
- Name
- Description
- Price
- Duration (months)
- Activation Type (automatic, review_required, payment_required, review_then_payment, form_then_payment, form_then_payment_then_review)
- Has Parent Membership (boolean)
- Parent Tier ID (if bundled with parent membership)

### Membership
- ID (UUID)
- Group User ID (References Group User)
- Tier ID (References Membership Tier)
- Start Date
- End Date
- Is Active

### Group Roles
- ID (UUID)
- Group ID (References Group)
- Role Name
- Description
- Permissions
- Type (GUEST, MEMBER)

### Revenue Sharing Rules
- ID (UUID)
- Parent Group ID (References Group)
- Child Group ID (References Group)
- Sharing Type (percentage, fixed_amount)
- Sharing Value (percentage or amount)
- Applied To (all_tiers, specific_tiers)
- Specific Tier IDs (if applied to specific tiers)
- Created At
- Updated At

### Payment Distributions
- ID (UUID)
- Payment ID (References Payment)
- Source Group ID (group receiving the original payment)
- Destination Group ID (group receiving the distributed portion)
- Amount
- Distribution Type (revenue_share, bundled_membership)
- Created At

## Complex Relationship Examples

### Flexible Organization Types Example

```
+------------------+
| Organization     |
| Types            |
+------------------+
        |
        v
+------------------+     +-------------------+     +------------------+
| National Org     |     | Relationship Type |     | Student Division |
| (PARENT type)    |<--->| (DIVISION)        |<--->| (DIVISION type)  |
+------------------+     +-------------------+     +------------------+
        |                        |                         |
        | parent_id              v                         | division_id
        |               +-------------------+              |
        v               | Relationship Type |              v
+------------------+    | (PARENT_CHILD)    |     +------------------+
| Regional Chapter |<-->|                   |<--->| University       |
| (REGIONAL type)  |    +-------------------+     | Student Chapter  |
+------------------+                              +------------------+
```

### Organization with Requirements Example

```
+------------------+
| University       |     +-------------------+
| (INSTITUTION)    |<--->| APPLICATION_FORM  |
+------------------+     | Requirement       |
        ^                +-------------------+
        |
        | prerequisite   +-------------------+
        |                | MEMBERSHIP_TIER   |
+------------------+<--->| Requirement       |
| Student Chapter  |     +-------------------+
| (STUDENT type)   |
+------------------+     +-------------------+
        ^                | CONNECTED_ORG     |
        |                | Requirement       |
        +--------------->+-------------------+
```

### User with Multiple Memberships Example

```
                   +------------------+
                   | Provincial       |
                   | Chapter          |
                   +------------------+
                             ^
                             | member of
                             |
+---------------+     +---------------+
|               |     |               |
| User (Person) |<--->| Group User    |
|               |     |               |
+---------------+     +---------------+
                             |
                             | member of
                             v
                   +------------------+
                   | University       |
                   | Student Chapter  |
                   +------------------+
```

### Application Form and Submission Example

```
+------------------+     +------------------+     +------------------+
| Organization     |---->| Forms            |---->| Form Fields      |
| (GROUP)          |     | (Custom fields)  |     | (JSON structure) |
+------------------+     +------------------+     +------------------+
                                |
                                | submitted by
                                v
                        +------------------+     +------------------+
                        | Form Submission  |---->| User             |
                        |                  |     |                  |
                        +------------------+     +------------------+
```

### Revenue Sharing & Bundled Membership Example

```
+------------------+
| National Org     |<------------+
+------------------+             |
         ^                       | 10% Revenue Share
         |                       |
         | Bundled Membership    |
         |                       |
+------------------+     +---------------+
| Provincial       |     | Revenue       |
| Chapter          |     | Sharing Rule  |
+------------------+     +---------------+
         ^                       ^
         |                       |
         | Membership Payment    | Defines Split
         |                       |
+------------------+     +---------------+
|                  |     |               |
| Member Payment   |---->| Payment       |
|                  |     | Distribution  |
+------------------+     +---------------+
                               |
                               | Tracks
                               v
                       +---------------+
                       |               |
                       | Member        |
                       |               |
                       +---------------+
```

## Database Schema Notes

1. **Flexible Organization Types**: The `organization_types` table defines the types of organizations that can exist in the system, each with its own metadata schema for validation.

2. **Relationship Types**: The `relationship_types` table defines the types of relationships that can exist between organizations, such as parent-child, affiliate, division, etc.

3. **Organization Relationships**: The `organization_relationships` table tracks relationships between organizations with metadata, validity periods, and approval status.

4. **Organization Requirements**: The `organization_requirements` table defines prerequisites for organization affiliation, such as application forms, membership tiers, connections to other organizations, or subscriptions.

5. **Forms System**: The `forms` and `form_submissions` tables provide a flexible system for creating and processing application forms with custom fields.

6. **Enhanced Membership Activation**: The `membership_tier` table supports multiple activation types, including form-based and multi-step activation processes.

7. The `parent_id` field in the `group` table establishes the hierarchical relationship between organizations.

8. The `group_users` table associates users with multiple organizations, and each association can have one or more memberships through the `memberships` table.

9. Each organization can define its own membership tiers with different pricing, duration, and activation requirements.

10. Role-based permissions are managed through the `group_roles` and `role_permissions` tables.

11. The `applications` table (not shown in diagram) tracks membership applications and their approval status.

12. The `revenue_sharing_rules` table defines how payments should be split between parent and child organizations:
    - Can be percentage-based (e.g., 10% to parent org) or fixed amount
    - Can apply to all membership tiers or specific tiers
    - Supports both revenue sharing and bundled membership models

13. The `payment_distributions` table tracks how each payment was distributed:
    - Records the original payment and all resulting distributions
    - Stores the source and destination organizations for each distribution
    - Identifies whether the distribution was due to revenue sharing or bundled memberships

This structure supports all the complex membership scenarios described in the platform documentation, including hierarchical relationships, multiple affiliations, institutional memberships, and payment distribution between organizations. 