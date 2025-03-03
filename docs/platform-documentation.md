# Organization Membership Management SaaS Platform Documentation

## Overview

This SaaS platform enables organizations, communities, clubs, and other groups to efficiently manage their membership structures through registrations and payments. The platform is specifically designed to handle complex organizational hierarchies, including parent-child relationships between organizations, chapters, sub-organizations, and institutional memberships.

## Core Concepts

### Organizations/Groups

Organizations (also referred to as "groups" in the system) represent the primary entities that can have members. Each organization has:

- A unique identity (name, slug, description)
- Optional hierarchical relationships with other organizations
- Configurable membership tiers and roles
- Custom permission systems

Organizations can have various types:
- Main/Parent organizations
- Chapters (geographic/location-based sub-organizations)
- Special interest groups
- Student chapters
- Institutional members

### Hierarchical Relationships

The platform supports complex nested organizational structures:

1. **Parent-Child Relationships**: Organizations can have parent organizations and multiple child organizations
2. **Multiple Affiliations**: An organization (e.g., a student chapter) can be affiliated with multiple parent organizations (e.g., both a provincial chapter and a national student division)
3. **Institutional Memberships**: Schools or companies can have organizational memberships, and their members can receive derived benefits

### Membership Management

Memberships are the core feature of the platform, with the following capabilities:

#### Membership Tiers
- Organizations can create multiple membership tiers with different:
  - Pricing
  - Duration
  - Benefits
  - Activation requirements

#### Activation Types
- **Automatic**: Membership is activated immediately upon registration
- **Review Required**: An admin must approve the membership application
- **Payment Required**: Membership is activated after payment is received
- **Review then Payment**: Admin review followed by payment required

#### Membership Lifecycle
- Application/Registration
- Review (if required)
- Payment processing (if required)
- Activation
- Renewal notifications
- Expiration

### Revenue Sharing & Payment Distribution

The platform supports sophisticated payment distribution between parent and child organizations:

#### Revenue Sharing Models
- **Percentage-Based Sharing**: Parent organizations can configure a percentage share (e.g., 10%) of all membership payments collected by child organizations
- **Fixed Fee Model**: Parent organizations can set a fixed fee to be collected from each child organization's membership payments
- **Tiered Revenue Sharing**: Different sharing percentages based on membership tier or volume

#### Combined Memberships
- **Bundled Memberships**: Child organizations can offer memberships that automatically include membership in the parent organization
- **Fee Distribution**: When a member pays for a bundled membership, the system automatically distributes the appropriate portion to each organization
- **Transparent Pricing**: Members can see the breakdown of fees when purchasing bundled memberships

#### Payment Reconciliation
- Automated accounting of shared revenue
- Regular settlement periods (e.g., monthly, quarterly)
- Reporting and analytics for payment distribution
- Transaction records for auditing purposes

### Roles and Permissions

The platform implements a robust role-based access control system:

#### Group Roles
- Predefined system roles (e.g., Owner, Admin, Member)
- Custom-defined roles per organization
- Role inheritance within organizational hierarchies

#### Permissions
- Fine-grained permissions control what actions users can perform
- Permission sets can be assigned to roles
- Key permissions include:
  - Group editing
  - Member invitation
  - Application review
  - Content management
  - Financial operations

### User Management

Users can:
- Belong to multiple organizations
- Have different roles in different organizations
- Manage multiple memberships
- Transfer between organizations while maintaining history

## Technical Implementation

### Database Structure

The platform uses Supabase with a PostgreSQL database with the following core tables:

- `group`: Stores organization data including hierarchical relationships
- `group_users`: Maps users to organizations they belong to
- `membership_tier`: Defines the different membership options for each organization
- `memberships`: Tracks active and historical memberships
- `group_roles`: Defines roles available within organizations
- `role_permissions`: Maps permissions to roles
- `applications`: Stores membership applications and their status
- `revenue_sharing_rules`: Defines how payments are distributed between organizations
- `payment_distributions`: Records how each payment was distributed among organizations

### Authentication and Authorization

- User authentication is handled via Supabase Auth
- Role-based authorization controls access to resources
- Row-level security ensures data segregation

### Payment Processing

The platform integrates with multiple payment processors:

- **Stripe**: Primary payment processor for most regions
  - Supports subscription management
  - Handles recurring billing
  - Provides payment dispute management
  - Enables connected accounts for direct payment distribution

- **Xendit**: Alternative payment processor for specific regions
  - Supports local payment methods
  - Handles regional compliance requirements

### API Structure

The platform provides a comprehensive API for:
- Organization management
- Membership operations
- User management
- Payment processing
- Revenue sharing configuration
- Reporting and analytics

## User Flows

### Organization Creation and Management

1. **Creating a New Organization**
   - User provides organization details (name, description, etc.)
   - Optionally selects a parent organization
   - Configures initial roles and permissions
   - Sets up membership tiers

2. **Managing Organization Hierarchy**
   - Adding child organizations/chapters
   - Establishing cross-organizational relationships
   - Managing institutional memberships
   - Configuring revenue sharing rules

### Membership Registration

1. **Individual Registration**
   - User selects an organization
   - Chooses a membership tier
   - Completes application form
   - Submits payment (if required)
   - Awaits approval (if review required)

2. **Bulk Registration**
   - Organization admins can register multiple members
   - Import functionality for member data
   - Batch payment processing options

3. **Institutional Memberships**
   - Institution registers as an organizational member
   - Manages roster of individual members who receive benefits
   - Handles bulk billing and payment

### Multi-level Membership Management

1. **Chapter Management**
   - Parent organizations can view all chapters
   - Chapters manage their own membership
   - Roll-up reporting across the organization hierarchy

2. **Cross-organizational Memberships**
   - Members can belong to multiple related organizations
   - System tracks all affiliations and membership statuses
   - Single sign-on across the organization ecosystem

3. **Payment Distribution Management**
   - Parent organizations configure revenue sharing rules
   - Child organizations see transparency in fee distribution
   - Automated reconciliation of shared revenue
   - Financial reporting across the organizational hierarchy

## Implementation Considerations

### Data Model Extensions

To fully support the complex organizational hierarchies described:

1. Extend the `group` table to include:
   - Organization type classification
   - Additional metadata for specific organization types
   - Relationship types between organizations

2. Enhance membership management to support:
   - Derived/inherited memberships
   - Multi-organization memberships with single payment
   - Membership transfer between related organizations

3. Implement revenue sharing capabilities:
   - Revenue sharing rule configuration
   - Payment distribution tracking
   - Financial reconciliation systems

### Integration Points

The platform should integrate with:
- Email notification systems
- Calendar systems for events
- Document management for membership materials
- Reporting and analytics tools
- Financial systems for accounting

## Next Steps for Implementation

1. **Phase 1: Core Infrastructure**
   - Complete database schema refinement
   - Implement basic authentication and authorization
   - Build organization and user management interfaces

2. **Phase 2: Membership Management**
   - Implement membership tiers and payment processing
   - Build application workflow with approval system
   - Develop member portal functionality

3. **Phase 3: Hierarchical Organization Support**
   - Implement parent-child organization relationships
   - Build cross-organizational membership management
   - Develop institutional membership functionality

4. **Phase 4: Revenue Sharing & Payment Distribution**
   - Implement revenue sharing rule configuration
   - Build payment distribution system
   - Develop financial reporting for distributed payments
   
5. **Phase 5: Advanced Features**
   - Reporting and analytics
   - Integration with external systems
   - Mobile app development 