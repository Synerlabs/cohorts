import { BaseTier, BaseApplication, BaseAffiliation } from './tier';
import { IProduct } from './product';

// These are predefined relationship types, but organizations can define custom ones
export enum OrganizationRelationshipTypePreset {
  AFFILIATE = 'affiliate',
  CHAPTER = 'chapter',
  REGIONAL = 'regional',
  STUDENT = 'student',
  INDUSTRY = 'industry',
  PARTNER = 'partner'
}

// This represents the actual relationship type, which can be a preset or custom string
export type OrganizationRelationshipType = OrganizationRelationshipTypePreset | string;

export type OrganizationTierConfig = {
  id: string;
  product_id: string;
  host_group_id: string;
  relationship_type: string;
  hierarchy_constraints: OrganizationHierarchyConstraint[] | null;
  created_at: string;
};

export type OrganizationTier = IProduct & {
  config: OrganizationTierConfig;
  organization_count?: number;
};

export type OrganizationHierarchyConstraint = {
  parent_relationship_type: string | null; // null means any parent type
  allowed_child_types: string[] | null; // null means any child type allowed
  max_depth: number | null; // null means unlimited depth
  required_parent_types: string[] | null; // organization must be under these types
};

export type OrganizationApplication = BaseApplication & {
  group_id: string; // The organization applying to be an affiliate
  host_group_id: string; // The host organization
  product_id: string; // Reference to the product (replaces tier_id)
};

export type OrganizationAffiliation = BaseAffiliation & {
  group_id: string; // The affiliate organization
  host_group_id: string; // The host organization
  product_id: string; // Reference to the product (replaces tier_id)
};

// Used to define the hierarchical relationship between organizations
export type OrganizationRelationship = {
  id: string;
  parent_group_id: string; // The parent organization
  child_group_id: string; // The child organization
  relationship_type: string; // String instead of enum for flexibility
  created_at: string;
}; 