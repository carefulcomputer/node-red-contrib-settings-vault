#!/bin/bash
set -e

MODULE_NAME="node-red-contrib-settings-vault"
TEMP_DIR=$(mktemp -d)
PAGE_FILE="$TEMP_DIR/page.html"
COOKIE_FILE="$TEMP_DIR/cookies.txt"

echo "📦 Notifying Node-RED Flow Library about module: $MODULE_NAME"

# Step 1: Download the add/node page and save cookies
echo "🔍 Step 1: Fetching CSRF token..."
curl -s -c "$COOKIE_FILE" https://flows.nodered.org/add/node -o "$PAGE_FILE"

# Step 2: Extract CSRF token from the page
# Temporarily disable 'set -e' for grep since it may not find the pattern
set +e
CSRF_TOKEN=$(grep 'add-node-csrf' "$PAGE_FILE" | sed -n 's/.*value="\([^"]*\)".*/\1/p')
set -e

if [ -z "$CSRF_TOKEN" ]; then
    echo "❌ Error: Could not extract CSRF token"
    rm -rf "$TEMP_DIR"
    exit 0
fi

echo "✅ CSRF token extracted: ${CSRF_TOKEN:0:20}..."

# Step 3: Submit the form with CSRF token and cookies
echo "📤 Step 2: Submitting module to Flow Library..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://flows.nodered.org/add/node \
    -b "$COOKIE_FILE" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "module=$MODULE_NAME&_csrf=$CSRF_TOKEN")

# Extract status code (last line) and body (everything else)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 HTTP Status: $HTTP_STATUS"
echo "📄 Response: $RESPONSE_BODY"

# Clean up temp files
rm -rf "$TEMP_DIR"

# Evaluate response
# Note: 400 is expected when module is already at latest version - treat as success
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Success! Module registered/updated in Flow Library"
    exit 0
elif [ "$HTTP_STATUS" = "400" ]; then
    # 400 responses are expected and considered successful
    # (e.g., "Module already at latest version")
    echo "✅ Flow Library Response: $RESPONSE_BODY"
    exit 0
elif [ "$HTTP_STATUS" = "403" ]; then
    echo "⚠️  Warning: CSRF token validation failed - $RESPONSE_BODY"
    echo "This is unusual but not critical. Flow Library likely already has the module."
    exit 0
else
    echo "⚠️  Warning: Unexpected status code $HTTP_STATUS - $RESPONSE_BODY"
    echo "Flow Library notification may have failed, but npm publish succeeded."
    exit 0
fi

