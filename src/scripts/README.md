# Scripts

This directory contains utility scripts for the application.

## reset-group-data.ts

A script to reset group users, applications, and memberships for a specific group.

### Prerequisites

- Node.js and npm installed
- Access to the Supabase database with service role credentials
- Environment variables properly configured (`.env.local` file)

### Installation

Make sure you have the required dependencies:

```bash
npm install commander
```

### Usage

```bash
# Reset all data for a specific group
npx ts-node src/scripts/reset-group-data.ts --group-id <group_id>

# Reset only specific data types
npx ts-node src/scripts/reset-group-data.ts --group-id <group_id> --reset-users --reset-applications --reset-memberships

# Dry run (show what would be deleted without actually deleting)
npx ts-node src/scripts/reset-group-data.ts --group-id <group_id> --dry-run

# Get help
npx ts-node src/scripts/reset-group-data.ts --help
```

### Options

- `--group-id <id>`: (Required) The UUID of the group to reset data for
- `--reset-users`: Reset group users (default: true)
- `--reset-applications`: Reset applications (default: true)
- `--reset-memberships`: Reset memberships (default: true)
- `--dry-run`: Show what would be deleted without actually deleting (default: false)
- `--help`: Display help information

### What the Script Does

The script performs the following operations in order:

1. Verifies the group exists
2. Fetches all group users for the specified group
3. If `--reset-memberships` is enabled:
   - Deletes membership_role entries that reference memberships
   - Deletes memberships for the group users
4. If `--reset-applications` is enabled:
   - Deletes applications for the group users
5. Deletes member IDs for the group users
6. If `--reset-users` is enabled:
   - Deletes user roles associated with the group
   - Deletes group users for the specified group

### Example

```bash
# Reset all data for group with ID 123e4567-e89b-12d3-a456-426614174000
npx ts-node src/scripts/reset-group-data.ts --group-id 123e4567-e89b-12d3-a456-426614174000

# Perform a dry run first to see what would be deleted
npx ts-node src/scripts/reset-group-data.ts --group-id 123e4567-e89b-12d3-a456-426614174000 --dry-run

# Only reset memberships and applications, but keep users
npx ts-node src/scripts/reset-group-data.ts --group-id 123e4567-e89b-12d3-a456-426614174000 --reset-users=false
```

### Caution

This script permanently deletes data. Always run with `--dry-run` first to verify what will be deleted, and ensure you have a database backup before running the script in production environments. 