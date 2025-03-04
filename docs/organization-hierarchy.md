# Organization Hierarchy and Affiliations

This document outlines the organization affiliation system, which enables organizations to form hierarchical relationships with each other.

## Overview

The organization affiliation system allows organizations to establish hierarchical and lateral relationships with each other. This is useful for modeling real-world relationships like national organizations with regional chapters, student chapters, industry affiliates, and other complex organizational structures.

## Key Concepts

### Organization Tiers

Similar to membership tiers, organization tiers define the terms and conditions for organizations to affiliate with each other:

- **Products**: The base product that defines common tier attributes (price, name, description)
- **Organization Tier Configs**: Organization-specific extensions to products
- **Host Organization**: The parent organization that creates affiliation tiers and accepts other organizations as affiliates
- **Affiliate Organization**: An organization that joins under a host organization
- **Relationship Type**: Defines the nature of the relationship (e.g., chapter, regional, student, industry partner)
- **Hierarchy Constraints**: Rules that govern what relationships are allowed in the hierarchy

### Organization Relationships

Each relationship between organizations is recorded and can be:

- **Parent-Child**: Where one organization is hierarchically above another
- **Deeply Nested**: Organizations can have multiple levels of hierarchy (e.g., National → Regional → Local)
- **Multiple Parents**: An organization can be related to multiple parent organizations

### Example Hierarchies

1. **National Organization Structure**
   - National Organization
     - Regional Chapter 1
       - Local Chapter A
       - Local Chapter B
     - Regional Chapter 2
       - Local Chapter C
       - Local Chapter D
     - Student Chapter (National)
       - Student Chapter (Region 1)
       - Student Chapter (Region 2)

2. **Academic Institution Network**
   - University Network
     - University A
       - Department 1
       - Department 2
     - University B
       - Department 1
       - Department 2
     - Industry Partners
       - Company A
       - Company B

## Features

### Creating Organization Tiers

Host organizations can create different tiers for affiliates to join under with:

1. First create a product with common attributes:
   - Name, description
   - Price and currency
   - Activation requirements

2. Then extend it with organization-specific configuration:
   - Relationship type
   - Hierarchy constraints
   - Host organization reference

### Hierarchy Constraints

The system supports rich constraint rules for organization hierarchies:

- **Parent Type Constraints**: Requiring the parent organization to be of a specific type
- **Child Type Constraints**: Restricting what types of children an organization can have
- **Depth Constraints**: Limiting how deep the hierarchy can go
- **Required Parents**: Specifying that organizations must be under specific parent types

### Application Process

Organizations can apply to become affiliates of a host organization through an application process similar to membership applications:

1. Organization selects an affiliation tier
2. Application is submitted (may require payment and/or form submission)
3. Host organization approves or rejects the application
4. Upon approval, the organizational relationship is established

### Permissions and Access Control

The system includes appropriate permission checks to ensure:

- Only authorized users can create organization tiers
- Only authorized users can approve/reject applications
- Organizations can only establish relationships when meeting the hierarchy constraints

## Database Schema

The system uses the following tables:

1. `products`: Base table for all tier types (membership and organization)
2. `organization_tier_configs`: Organization-specific extensions to products
3. `organization_applications`: Tracks applications from organizations to join as affiliates
4. `organization_affiliations`: Records active affiliations between organizations
5. `organization_relationships`: Tracks the hierarchical relationships between organizations

### Schema Normalization

The database schema is normalized to:
- Avoid duplicating common fields across different tier types
- Leverage existing product infrastructure
- Make it easy to query tiers of different types

## Technical Implementation

The system is built using:

- Type-safe interfaces extending from base tier types
- Service classes implementing the TierService interface
- Server actions for handling user interactions
- Database migrations for the necessary tables
- Validation logic for enforcing hierarchy constraints

### Code Structure

```typescript
// Organization tiers leverage products
export type OrganizationTier = IProduct & {
  config: OrganizationTierConfig;
  organization_count?: number;
};

// Organization-specific configuration
export type OrganizationTierConfig = {
  id: string;
  product_id: string;
  host_group_id: string;
  relationship_type: string;
  hierarchy_constraints: OrganizationHierarchyConstraint[] | null;
  created_at: string;
};
```

## Use Cases

This system enables:

1. **National organizations** to manage chapters across different regions
2. **Universities** to organize departments, programs, and industry partnerships
3. **Nonprofits** to create networks of affiliated organizations
4. **Professional associations** to manage their organizational structure
5. **Conferences** to organize tracks, committees, and sponsoring organizations

## Future Extensions

The system is designed to be extensible for:

- More complex relationship types
- Additional hierarchy constraints
- Analytics on organizational networks
- Visualization of organizational hierarchies
- Batch operations on groups of affiliated organizations 