#!/bin/bash
# ref-validator.sh - Automated reference validation for Telegram configuration
#
# Usage:
#   ./scripts/ref-validator.sh <config_file> [output_file]
#
# Examples:
#   ./scripts/ref-validator.sh configs/telegram-config.yaml
#   ./scripts/ref-validator.sh configs/telegram-config.yaml REFERENCE.md

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find all references in configuration
find_references() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "Error: File not found: $file" >&2
        return 1
    fi
    grep -o '\[#REF:[^]]*\]' "$file" | sort | uniq
}

# Check for undefined references
validate_references() {
    local config_file="$1"
    echo "Checking references in $config_file..."
    
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}❌ Error: File not found: $config_file${NC}" >&2
        return 1
    fi
    
    # Extract all references
    local references
    references=$(find_references "$config_file")
    
    if [ -z "$references" ]; then
        echo -e "${YELLOW}⚠️  No references found in $config_file${NC}"
        return 0
    fi
    
    local errors=0
    
    # Check each reference exists in variable section
    while IFS= read -r ref; do
        local var_name
        var_name=$(echo "$ref" | sed 's/\[#REF://' | sed 's/\]//')
        
        # Check if reference is documented in Variable Reference section
        if ! grep -q "\[#REF:$var_name\]" "$config_file"; then
            echo -e "${RED}❌ Undefined reference: $ref${NC}"
            errors=$((errors + 1))
        fi
    done <<< "$references"
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ All references validated${NC}"
        return 0
    else
        echo -e "${RED}❌ Found $errors undefined reference(s)${NC}"
        return 1
    fi
}

# Generate reference documentation
generate_ref_docs() {
    local config_file="$1"
    local output_file="${2:-REFERENCE.md}"
    
    if [ ! -f "$config_file" ]; then
        echo "Error: File not found: $config_file" >&2
        return 1
    fi
    
    cat > "$output_file" << EOF
# Configuration Reference Documentation

Generated: $(date)

## Variable References

This document lists all configuration variable references found in \`$config_file\`.

EOF
    
    # Extract and categorize references
    local references
    references=$(find_references "$config_file")
    
    if [ -z "$references" ]; then
        echo "No references found." >> "$output_file"
    else
        echo "| Variable | Reference Tag |" >> "$output_file"
        echo "|----------|---------------|" >> "$output_file"
        
        while IFS= read -r ref; do
            local var
            var=$(echo "$ref" | sed 's/\[#REF://' | sed 's/\]//')
            echo "| \`$var\` | $ref |" >> "$output_file"
        done <<< "$references"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Reference documentation generated: $output_file${NC}"
}

# Main execution
main() {
    local config_file="${1:-}"
    local output_file="${2:-}"
    
    if [ -z "$config_file" ]; then
        echo "Usage: $0 <config_file> [output_file]"
        echo ""
        echo "Examples:"
        echo "  $0 configs/telegram-config.yaml"
        echo "  $0 configs/telegram-config.yaml REFERENCE.md"
        exit 1
    fi
    
    # Validate references
    if ! validate_references "$config_file"; then
        exit 1
    fi
    
    # Generate docs if output file specified
    if [ -n "$output_file" ]; then
        generate_ref_docs "$config_file" "$output_file"
    fi
}

# Run main function
main "$@"







