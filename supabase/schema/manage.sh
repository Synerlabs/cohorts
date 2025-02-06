#!/bin/bash

# Function to create a new migration
create_migration() {
    local name=$1
    local timestamp=$(date +%Y%m%d%H%M%S)
    local filename="supabase/migrations/${timestamp}_${name}.sql"
    
    echo "Creating new migration: $filename"
    touch "$filename"
    
    # Add migration template
    cat << EOF > "$filename"
-- Migration: $name
-- Created at: $(date)

-- Write your migration here

-- Example:
-- CREATE TABLE IF NOT EXISTS "public"."new_table" (
--     "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
--     "created_at" timestamptz DEFAULT now()
-- );

EOF

    echo "Migration file created: $filename"
}

# Function to apply schema changes locally
apply_schema() {
    echo "Applying schema changes..."
    
    # Apply types
    echo "Applying types..."
    supabase db reset --db-url "$DATABASE_URL" -f supabase/schema/types.sql
    
    # Apply tables
    echo "Applying tables..."
    supabase db reset --db-url "$DATABASE_URL" -f supabase/schema/tables.sql
    
    # Apply functions
    echo "Applying functions..."
    supabase db reset --db-url "$DATABASE_URL" -f supabase/schema/functions.sql
    
    # Apply policies
    echo "Applying policies..."
    supabase db reset --db-url "$DATABASE_URL" -f supabase/schema/policies.sql
    
    echo "Schema changes applied successfully!"
}

# Function to generate a new migration from schema changes
generate_migration() {
    local name=$1
    local timestamp=$(date +%Y%m%d%H%M%S)
    local filename="supabase/migrations/${timestamp}_${name}.sql"
    
    echo "Generating migration from schema changes..."
    
    # Create migration file
    supabase db diff -f "$filename"
    
    echo "Migration generated: $filename"
}

# Main script
case "$1" in
    "create")
        if [ -z "$2" ]; then
            echo "Usage: ./manage.sh create <migration-name>"
            exit 1
        fi
        create_migration "$2"
        ;;
    "apply")
        apply_schema
        ;;
    "generate")
        if [ -z "$2" ]; then
            echo "Usage: ./manage.sh generate <migration-name>"
            exit 1
        fi
        generate_migration "$2"
        ;;
    *)
        echo "Usage: ./manage.sh <command> [args]"
        echo "Commands:"
        echo "  create <name>    Create a new migration"
        echo "  apply           Apply schema changes locally"
        echo "  generate <name>  Generate migration from schema changes"
        exit 1
        ;;
esac 