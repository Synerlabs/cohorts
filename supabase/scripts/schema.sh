#!/bin/bash

# Configuration
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
SNAPSHOT_DIR="supabase/snapshots"
SCHEMA_DIR="supabase/schema"

# Function to create a schema snapshot
create_snapshot() {
    local timestamp=$(date +%Y%m%d%H%M%S)
    local snapshot_file="${SNAPSHOT_DIR}/schema_${timestamp}.sql"
    
    echo "Creating schema snapshot..."
    supabase db dump --db-url "$DB_URL" > "$snapshot_file"
    
    echo "Snapshot created: $snapshot_file"
}

# Function to compare current schema with latest snapshot
diff_schema() {
    local latest_snapshot=$(ls -t ${SNAPSHOT_DIR}/schema_*.sql 2>/dev/null | head -n1)
    
    if [ -z "$latest_snapshot" ]; then
        echo "No previous snapshot found. Creating first snapshot..."
        create_snapshot
        return
    }
    
    echo "Comparing with latest snapshot: $latest_snapshot"
    local temp_current="${SNAPSHOT_DIR}/current_temp.sql"
    
    supabase db dump --db-url "$DB_URL" > "$temp_current"
    
    echo "Differences:"
    diff -u "$latest_snapshot" "$temp_current"
    
    rm "$temp_current"
}

# Function to update schema files
update_schema_files() {
    echo "Updating schema files..."
    
    # Dump current schema
    supabase db dump --db-url "$DB_URL" > "${SCHEMA_DIR}/current_schema.sql"
    
    # Create snapshot
    create_snapshot
    
    echo "Schema files updated successfully!"
}

# Function to generate a new migration
generate_migration() {
    local name=$1
    local timestamp=$(date +%Y%m%d%H%M%S)
    local migration_file="supabase/migrations/${timestamp}_${name}.sql"
    
    echo "Generating migration: $migration_file"
    supabase db diff --use-migra --db-url "$DB_URL" > "$migration_file"
    
    echo "Migration generated: $migration_file"
}

# Main script
case "$1" in
    "snapshot")
        create_snapshot
        ;;
    "diff")
        diff_schema
        ;;
    "update")
        update_schema_files
        ;;
    "migrate")
        if [ -z "$2" ]; then
            echo "Usage: ./schema.sh migrate <migration-name>"
            exit 1
        fi
        generate_migration "$2"
        ;;
    *)
        echo "Usage: ./schema.sh <command>"
        echo "Commands:"
        echo "  snapshot    Create a new schema snapshot"
        echo "  diff       Compare current schema with latest snapshot"
        echo "  update     Update schema files and create snapshot"
        echo "  migrate    Generate a new migration"
        exit 1
        ;;
esac 