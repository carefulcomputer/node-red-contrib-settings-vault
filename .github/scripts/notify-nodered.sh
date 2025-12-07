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
CSRF_TOKEN=$(grep 'add-node-csrf' "$PAGE_FILE" | sed -n 's/.*value="\([^"]*\)".*/\1/p')

if [ -z "$CSRF_TOKEN" ]; then
    echo "❌ Error: Could not extract CSRF token"
    rm -rf "$TEMP_DIR"
    exit 1
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
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Success! Module registered/updated in Flow Library"
    exit 0
elif [ "$HTTP_STATUS" = "400" ]; then
    if [[ "$RESPONSE_BODY" == *"already at latest version"* ]]; then
        echo "✅ Module already registered and up to date"
        exit 0
    else
        echo "⚠️  Warning: $RESPONSE_BODY"
        exit 0
    fi
elif [ "$HTTP_STATUS" = "403" ]; then
    echo "❌ Error: CSRF token validation failed (this is unusual)"
    exit 1
else
    echo "❌ Error: Unexpected status code $HTTP_STATUS"
    exit 1
fi

