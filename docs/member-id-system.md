# Member ID System

## Overview

The Member ID system allows organizations to assign unique identifiers to their members. These IDs can be customized with different formats while ensuring uniqueness within each group and format type.

## Member ID Format Specifications

Member IDs support the following format tokens:

### Date Tokens
- `{YYYY}` - 4-digit year (e.g., 2024)
- `{YY}` - 2-digit year (e.g., 24)
- `{MM}` - 2-digit month (01-12)
- `{M}` - 1-digit month (1-12)
- `{DD}` - 2-digit day (01-31)
- `{D}` - 1-digit day (1-31)

### Sequence Token
- `{SEQ}` - A simple incrementing number (e.g., 1, 2, 3)
- `{SEQ:n}` - A padded incrementing number where n is the padding length (e.g., `{SEQ:3}` produces 001, 002, 003)

## Examples

Here are some examples of member ID formats:

- `MEM-{YYYY}-{SEQ:4}` → MEM-2024-0001, MEM-2024-0002, etc.
- `{YY}{MM}-{SEQ}` → 2405-1, 2405-2, etc.
- `CLUB-{SEQ:3}` → CLUB-001, CLUB-002, etc.

## Important Constraints and Behaviors

1. **Unique IDs per Format and Group**: 
   - Each format type maintains its own sequence counter within each group
   - The same format in different groups will have independent sequences

2. **One Member ID per Format per Member**:
   - A member will only get one Member ID for each format type in a group
   - When applying for multiple memberships with the same format, the existing Member ID will be reused

3. **Special Memberships**:
   - Different membership tiers can use different formats
   - A member can have multiple Member IDs if they belong to different membership tiers with different formats

4. **Resetting Sequences**:
   - Sequences automatically reset at the start of each year for formats containing a year token (e.g., `{YYYY}` or `{YY}`)
   - Formats without year tokens will continue the sequence indefinitely

## Technical Implementation

The Member ID system is implemented using:

1. **Database Tables**:
   - `member_ids`: Stores the generated member IDs
   - `membership_member_ids`: Maps memberships to member IDs

2. **Unique Constraints**:
   - `member_ids_unique_per_group`: Ensures member IDs are unique within each group

3. **Database Functions**:
   - `generate_member_id`: Generates a new unique member ID based on the format
   - `handle_new_membership`: Automatically creates or assigns member IDs for new memberships

4. **TypeScript Service**:
   - `MemberIdService`: Provides methods for generating, retrieving, and managing member IDs

## Best Practices

1. **Format Design**:
   - Include a year token (`{YYYY}` or `{YY}`) if you want sequences to reset annually
   - Use padded sequence tokens (`{SEQ:n}`) for better visual consistency

2. **Assigning Member IDs**:
   - Member IDs should be automatically assigned when creating a membership
   - For manual assignment, use the `assignMemberIdToMembership` method

3. **Displaying Member IDs**:
   - Always display the `member_id` field from the `member_ids` table
   - Do not construct or format the IDs in the frontend

## Troubleshooting

If you're experiencing issues with duplicate member IDs:

1. Check that you're using the latest version of the Member ID system
2. Ensure you have run the migration script `20250500000000_member_id_fixes.sql`
3. Verify that the `member_ids_unique_per_group` constraint is properly applied
4. Use transactions when generating and assigning member IDs to prevent race conditions

## API Reference

See the `MemberIdService` class in `src/services/member-id.service.ts` for full API details. 