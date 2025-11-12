#!/bin/bash
# TES-NGWS-001.12c: Verify VS Code/Cursor Configuration

set -euo pipefail

echo "🔍 Verifying settings.json..."

# Check 1: JSON validity (strip comments for validation)
if command -v python3 &> /dev/null; then
  # Remove single-line comments (// ...) and validate
  if ! python3 -c "
import json
import re
with open('.vscode/settings.json', 'r') as f:
    content = f.read()
    # Remove single-line comments
    content = re.sub(r'//.*', '', content)
    # Remove trailing commas before closing braces/brackets
    content = re.sub(r',(\s*[}\]])', r'\1', content)
    json.loads(content)
" 2>/dev/null; then
    echo "✅ JSON syntax is valid"
  else
    echo "❌ settings.json contains invalid JSON"
    exit 1
  fi
else
  echo "⚠️  Python3 not found, skipping JSON validation"
fi

# Check 2: No trailing spaces in URLs
if grep -q '\.json "[^"]*[[:space:]]' .vscode/settings.json; then
  echo "❌ Found trailing spaces in URLs"
  exit 1
fi
echo "✅ No trailing spaces in URLs"

# Check 3: Biome is configured (if extension installed)
if grep -q "biomejs.biome" .vscode/settings.json; then
  echo "✅ Biome configured as formatter"
else
  echo "⚠️  Biome not set as default formatter (extension may need installation)"
fi

# Check 4: Cursor agent settings present
if grep -q "cursor.agent\." .vscode/settings.json; then
  echo "✅ Cursor agent settings present"
else
  echo "❌ Cursor agent settings missing"
  exit 1
fi

# Check 5: tmux session name is dynamic
if grep -q '\${workspaceFolderBasename}' .vscode/settings.json; then
  echo "✅ tmux session name is workspace-aware"
else
  echo "❌ tmux session name is not workspace-aware"
  exit 1
fi

# Check 6: Format on save enabled
if grep -q '"editor.formatOnSave": true' .vscode/settings.json; then
  echo "✅ Format on save enabled"
else
  echo "⚠️  Format on save not explicitly enabled"
fi

# Check 7: Command registry present
if grep -q "cursor.commands\." .vscode/settings.json; then
  echo "✅ Cursor command registry configured"
else
  echo "⚠️  Cursor command registry not found"
fi

echo ""
echo "✅ All critical checks passed. VS Code is production-ready."

