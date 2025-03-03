# Entity Relationship Diagram

This document provides a visual representation of the key entities and their relationships in the Organization Membership Management SaaS platform.

## Core Entities and Relationships

```
+----------------+     +---------------+     +----------------+
|                |     |               |     |                |
|     User       |<--->| Group User    |<--->|    Group       |
|                |     |               |     |                |
+----------------+     +---------------+     +----------------+
                               |                     ^
                               |                     |
                               v                     | parent_id
                       +---------------+             |
                       |               |             |
                       | Membership    |      +------+------+
                       |               |      |             |
                       +---------------+      | Child Group |
                               ^              |             |
                               |              +-------------+
                               |                     ^
                       +---------------+             |
                       |               |             |
                       |Membership Tier|     +---------------+
                       |               |     |               |
                       +---------------+     |Revenue Sharing|
                                             |    Rules      |
                                             +---------------+
```

## Detailed Entity Descriptions

### User
- ID (UUID)
- Email
- Profile information
- Authentication details

### Group
- ID (UUID)
- Name, Slug
- Description
- Parent Group ID (self-referential relationship)
- Organization Type
- Created by

### Group User
- ID (UUID)
- User ID (References User)
- Group ID (References Group)
- Created At
- Is Active

### Membership Tier
- ID (UUID)
- Group ID (References Group)
- Name
- Description
- Price
- Duration (months)
- Activation Type (automatic, review_required, payment_required, review_then_payment)
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

### Multi-level Organization Example

```
+------------------+
| National Org     |
| (Parent)         |
+------------------+
         |
         | parent_id
         |
+------------------+     +------------------+
| Provincial       |<--->| Student Division |
| Chapter          |     | (National)       |
+------------------+     +------------------+
         |                       |
         | parent_id             | parent_id
         |                       |
+------------------+     +------------------+
| University       |<--->| University       |
| Student Chapter  |     | Student Division |
+------------------+     +------------------+
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

### Institutional Membership Example

```
+------------------+
| Professional Org |
+------------------+
         ^
         | institutional member
         |
+------------------+     +---------------+     +---------------+
| University       |<--->| Group User    |<--->| Department    |
| (Institution)    |     | (Org to Org)  |     | Member        |
+------------------+     +---------------+     +---------------+
         ^
         | belongs to
         |
+------------------+
| Student/Faculty  |
| (Individual)     |
+------------------+
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

1. The `parent_id` field in the `group` table establishes the hierarchical relationship between organizations.

2. The `group_users` table associates users with multiple organizations, and each association can have one or more memberships through the `memberships` table.

3. Each organization can define its own membership tiers with different pricing, duration, and activation requirements.

4. Role-based permissions are managed through the `group_roles` and `role_permissions` tables.

5. The `applications` table (not shown in diagram) tracks membership applications and their approval status.

6. The `revenue_sharing_rules` table defines how payments should be split between parent and child organizations:
   - Can be percentage-based (e.g., 10% to parent org) or fixed amount
   - Can apply to all membership tiers or specific tiers
   - Supports both revenue sharing and bundled membership models

7. The `payment_distributions` table tracks how each payment was distributed:
   - Records the original payment and all resulting distributions
   - Stores the source and destination organizations for each distribution
   - Identifies whether the distribution was due to revenue sharing or bundled memberships

This structure supports all the complex membership scenarios described in the platform documentation, including hierarchical relationships, multiple affiliations, institutional memberships, and payment distribution between organizations. 