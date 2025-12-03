# node-red-contrib-config-vault

A Node-RED module for centralized configuration management with encrypted storage. Store credentials, API endpoints, database settings, feature flags, and any other configuration values in one secure location and reuse them across multiple flows.

## Table of Contents

- [Overview](#overview)
- [Why Use Config Vault](#why-use-config-vault)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
  - [Configuration Node](#configuration-node)
  - [Runtime Node](#runtime-node)
- [Use Cases](#use-cases)
- [Multiple Configuration Sets](#multiple-configuration-sets)
- [Security](#security)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This module provides a centralized approach to managing any configuration values in Node-RED flows. Instead of hardcoding settings in function nodes, scattering them across multiple flows, or managing separate configuration files, you can define all your configuration values once in a secure configuration node and retrieve them wherever needed.

**What can you store:**
- Credentials (API keys, passwords, tokens)
- API endpoints and base URLs
- Database connection strings and settings
- SMTP server configurations
- Feature flags and environment settings
- Timeout values and thresholds
- Any other configuration data your flows need

**How it works:**
All values are encrypted using Node-RED's built-in credential encryption mechanism and stored in the `flows_cred.json` file. This ensures sensitive data never appears in plain text in your `flows.json` file, while keeping everything in one place for easy management.

**No external dependencies:**
This module uses only Node-RED's native encryption functionality. No external libraries, no additional setup, no separate vault servers to maintain.

## Why Use Config Vault

### The Problem

Without centralized configuration management:
- Configuration values scattered across dozens of function nodes
- Changing an API endpoint requires updating multiple places
- Credentials hardcoded in flows (security risk)
- No easy way to switch between development and production settings
- Difficult to share flows without exposing sensitive data
- Hard to maintain consistency across multiple flows

### The Solution

With Config Vault:
- **Single Source of Truth**: All configuration in one place
- **Easy Updates**: Change a value once, affects all flows using it
- **Secure Storage**: Encrypted at rest using Node-RED's credential system
- **Multiple Environments**: Separate configuration sets for dev, staging, production
- **Environment-Agnostic Flows**: Develop with test settings, deploy with production settings - same flow logic
- **Feature Flag Control**: Enable/disable/redirect entire flows without modifying flow logic
- **Flexible Retrieval**: Access values via message properties, flow context, or global context
- **Version Control Friendly**: Configuration separate from flow logic
- **Zero-Downtime Updates**: Change settings and redeploy - no flow redesign needed
- **Team Collaboration**: Share flows without exposing credentials

## Key Features

- **Centralized Storage**: Store all configuration values in one place, organized by logical domains
- **Any Configuration Type**: Not just credentials - store API endpoints, database settings, feature flags, timeouts, or any other config data
- **Multiple Configuration Sets**: Create separate vaults for different environments (development, staging, production)
- **Encrypted Storage**: Automatic encryption using Node-RED's built-in credential system - no external dependencies
- **One-Click Updates**: Change a configuration value once and it updates everywhere it's used
- **Flexible Retrieval**: Access values via message properties, flow context, or global context
- **Type-Safe Inputs**: Support for strings, numbers, booleans, JSON, buffers, dates, and masked passwords
- **Visual Interface**: Field-based UI with dropdowns and validation - no JSON syntax errors
- **Domain Organization**: Group related settings together (e.g., "apiService", "database", "emailServer")
- **Dynamic Configuration**: Dropdowns auto-populate from your vault, preventing typos
- **No External Dependencies**: Uses only Node-RED's native functionality - no additional packages or servers

## Installation

### From Local Path

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-config-vault
```

### From npm (when published)

```bash
cd ~/.node-red
npm install node-red-contrib-config-vault
```

After installation, restart Node-RED to load the new nodes.

## Quick Start

### 1. Create a Vault Configuration

1. Open Node-RED editor
2. Go to menu (three horizontal lines) → Configuration nodes
3. Click "Add" and select "vault-config"
4. Give it a descriptive name (e.g., "Production Settings")
5. Click "Add Domain" and name it (e.g., "apiService")
6. Add properties for that domain:
   - baseUrl (type: str): "https://api.production.com"
   - apiKey (type: password): "your-api-key"
   - timeout (type: num): 30000
   - retryEnabled (type: bool): true
7. Click "Update" to save

### 2. Use in Your Flow

1. Drag the "vault" node into your flow
2. Double-click to configure
3. Select your vault config from the dropdown
4. Click "Add Property" to define what to retrieve:
   - Domain: apiService
   - Property: apiKey
   - Save to: msg.apiKey
5. Click "Done"
6. Deploy

Now when messages pass through this vault node, `msg.apiKey` will automatically be populated with your API key.

## Detailed Usage

### Configuration Node

The `vault-config` node is where you define and store all your credentials.

#### Structure

Configuration values are organized hierarchically by domains. Each domain groups related settings together:

```
Vault: "Production Settings"
├── Domain: apiService
│   ├── baseUrl (str): "https://api.production.com"
│   ├── apiKey (password): "sk_live_abc123"
│   ├── timeout (num): 30000
│   ├── retryEnabled (bool): true
│   └── maxRetries (num): 3
├── Domain: database
│   ├── host (str): "db.production.com"
│   ├── port (num): 5432
│   ├── username (str): "app_user"
│   ├── password (password): "dbpass123"
│   ├── ssl (bool): true
│   └── poolSize (num): 10
├── Domain: emailServer
│   ├── smtp (str): "smtp.example.com"
│   ├── port (num): 587
│   ├── secure (bool): true
│   └── credentials (json): {"user":"mail@example.com","pass":"mailpass"}
└── Domain: features
    ├── debugMode (bool): false
    ├── rateLimitPerMinute (num): 100
    ├── maintenanceMode (bool): false
    └── allowedRegions (json): ["us-east","eu-west"]
```

#### Supported Data Types

| Type | Description | Use Case |
|------|-------------|----------|
| `str` | String/text | Usernames, hostnames, URLs, tokens |
| `password` | Masked string | Passwords, secrets, API keys (hidden in editor) |
| `num` | Number | Ports, timeouts, IDs, counts |
| `bool` | Boolean | Feature flags, enable/disable settings |
| `json` | JSON object/array | Complex configurations, nested data |
| `bin` | Buffer | Binary data, certificates, keys |
| `date` | Timestamp | Expiration dates, schedule times |

#### UI Features

- **Collapse/Expand**: Domains are collapsed by default for easy navigation
- **Clone**: Duplicate domains to create variations (e.g., dev, staging, prod)
- **Validation**: Real-time validation with visual feedback
- **Confirmation Dialogs**: Prevents accidental deletion of domains or properties
- **No JSON Editing**: Structured inputs eliminate syntax errors

### Runtime Node

The `vault` node retrieves specific property values from your vault and makes them available in your flow.

#### Configuration

Each row in the vault node configuration specifies:

1. **Domain** (dropdown): Which credential group to use
2. **Property** (dropdown): Which specific value to retrieve
3. **Context** (dropdown): Where to store it (msg/flow/global)
4. **Property Name** (text): The property name in that context

#### Context Options

**msg Context**
- Stores value on the message object
- Scoped to single message
- Use for: Per-request data, HTTP headers, temporary values

```javascript
Domain: apiService, Property: apiKey
Context: msg, Name: apiKey
Result: msg.apiKey = "sk_live_abc123"
```

**flow Context**
- Stores value in flow context
- Shared across all nodes in the same flow tab
- Persists between messages
- Use for: Shared configuration, cached values, flow-wide settings

```javascript
Domain: apiService, Property: baseUrl
Context: flow, Name: apiUrl
Result: flow.apiUrl = "https://api.example.com"
```

**global Context**
- Stores value in global context
- Shared across all flows and tabs
- Persists between messages
- Use for: System-wide configuration, shared database connections

```javascript
Domain: database, Property: host
Context: global, Name: dbHost
Result: global.dbHost = "db.example.com"
```

#### Multiple Retrievals

You can retrieve multiple properties in a single vault node. This is more efficient than using multiple vault nodes.

Example configuration:
```
Row 1: apiService.username → msg.username
Row 2: apiService.apiKey → msg.apiKey
Row 3: apiService.baseUrl → flow.apiUrl
Row 4: database.host → global.dbHost
```

Result when message passes through:
```javascript
msg.username = "alice"
msg.apiKey = "sk_live_abc123"
flow.apiUrl = "https://api.example.com"
global.dbHost = "db.example.com"
```

## Use Cases

### Centralized Configuration Management

Store all your application settings in one place:

```
[inject] → [vault] → [your logic]
```

Vault configuration:
- features.debugMode → flow.debugEnabled
- features.rateLimitPerMinute → flow.rateLimit
- apiService.baseUrl → flow.apiUrl

All flows in your tab can now access these shared settings from flow context.

### API Integration

Store API endpoints and credentials together:

```
[inject] → [vault] → [function: build request] → [http request]
```

Vault configuration:
- apiService.apiKey → msg.apiKey
- apiService.baseUrl → msg.baseUrl

Function node:
```javascript
msg.url = msg.baseUrl + "/users";
msg.headers = {
    "Authorization": "Bearer " + msg.apiKey
};
return msg;
```

### Database Connections

Store database credentials and use in database nodes:

```
[inject] → [vault] → [mysql]
```

Vault configuration:
- database.host → msg.host
- database.user → msg.user
- database.password → msg.password

The mysql node can then use these message properties directly.

### Feature Flags and Flow Control

Use configuration values to dynamically control flow behavior without modifying the flows themselves.

#### Enable/Disable Flows

```
[inject] → [vault] → [switch: check maintenance mode] → [your flow logic]
                                    ↓ (if disabled)
                                 [return/stop]
```

Vault configuration:
- features.maintenanceMode → flow.maintenanceMode

Switch node configuration:
- If `flow.maintenanceMode == true`: Route to output 2 (stop processing)
- If `flow.maintenanceMode == false`: Route to output 1 (continue)

**Benefit:** Enable maintenance mode by changing one vault setting, instantly stopping all dependent flows without editing any flow logic.

#### Redirect Flows Based on Configuration

```
[inject] → [vault] → [switch: check environment] → Output 1: Production API
                                                  → Output 2: Test API
                                                  → Output 3: Mock Service
```

Vault configuration:
- features.useTestAPI → flow.useTestAPI
- features.useMockService → flow.useMockService

**Benefit:** Dynamically route to different services based on configuration. Perfect for A/B testing, canary deployments, or switching between live and test services.

#### Dynamic Thresholds

```
[sensor data] → [vault] → [function: apply thresholds] → [alert if exceeded]
```

Vault configuration:
- thresholds.temperatureMax → flow.tempMax
- thresholds.temperatureWarning → flow.tempWarning
- thresholds.rateLimitPerMinute → flow.rateLimit

**Benefit:** Adjust operational parameters without flow changes. Update thresholds based on changing requirements or seasonal patterns.

### Shared Settings Across Flows

Use flow or global context to share configuration:

```
Flow 1: [vault] → [http request]
                ↓
            flow.apiUrl
                ↓
Flow 2:     [http request]  (uses same flow.apiUrl)
```

Both flows can access the same base URL without duplication.

### Environment-Agnostic Flow Development

One of the most powerful benefits of Config Vault is the ability to develop and test flows with one set of settings, then deploy to production with different settings - all without changing a single node in your flow logic.

#### The Development Workflow

**Step 1: Create Your Flow with Test Settings**

1. Create a vault-config node named "Test Settings"
   - apiService.baseUrl: "http://localhost:3000"
   - apiService.apiKey: "test_key_123"
   - database.host: "localhost"
   - features.enableDebugLogging: true

2. Build your flow using this vault:
```
[inject] → [vault: Test Settings] → [http request] → [database insert] → [debug]
```

3. Develop and test thoroughly with local services

**Step 2: Deploy to Production Without Changing Flows**

1. Create another vault-config node named "Production Settings"
   - apiService.baseUrl: "https://api.production.com"
   - apiService.apiKey: "prod_key_789"
   - database.host: "prod-db.example.com"
   - features.enableDebugLogging: false

2. Change the vault reference in your vault node from "Test Settings" to "Production Settings"

3. Deploy - **that's it!**

**The flow logic remains identical:**
- Same HTTP request nodes
- Same function nodes
- Same database nodes
- Same error handling
- Same business logic

**Only the configuration changes:**
- Different API endpoint
- Different credentials
- Different database
- Different feature flags

#### Real-World Example

**Scenario:** API integration flow that needs to work in both test and production environments.

**Flow (never changes):**
```
[scheduled trigger]
    ↓
[vault node] → retrieves: baseUrl, apiKey, timeout, retryCount
    ↓
[function: build request] → uses msg.baseUrl, msg.apiKey
    ↓
[http request] → calls msg.baseUrl/endpoint
    ↓
[function: process response]
    ↓
[database insert] → uses msg.dbHost from vault
```

**Test Configuration:**
```json
{
  "apiService": {
    "baseUrl": "http://localhost:3000",
    "apiKey": "test_key",
    "timeout": 5000,
    "retryCount": 1
  },
  "database": {
    "host": "localhost:5432"
  }
}
```

**Production Configuration:**
```json
{
  "apiService": {
    "baseUrl": "https://api.production.com",
    "apiKey": "sk_live_prod_key_abc123",
    "timeout": 30000,
    "retryCount": 3
  },
  "database": {
    "host": "prod-db-cluster.example.com:5432"
  }
}
```

**Deployment Process:**
1. Develop flow with "Test Settings" vault
2. Test thoroughly in development environment
3. Export flow (or commit to git)
4. Import to production Node-RED instance
5. Change vault node reference to "Production Settings"
6. Deploy

**Result:** Identical business logic, different execution environment.

#### Benefits of This Approach

**1. Risk Reduction**
- Test with real flow logic but safe test data
- No accidental production API calls during development
- No risk of corrupting production database during testing

**2. Simplified Deployment**
- No code changes between environments
- No search-and-replace of URLs or credentials
- Single point of configuration change

**3. Easier Troubleshooting**
- Test exact production flow logic locally
- Reproduce production issues with test data
- Debug without affecting production services

**4. Team Productivity**
- Developers work with test settings
- QA team works with staging settings
- Operations team manages production settings
- Everyone uses the same flow logic

**5. Version Control**
- Commit `flows.json` to git (contains flow logic)
- Exclude `flows_cred.json` from git (contains secrets)
- Each environment maintains its own encrypted credentials
- Flow logic stays consistent across all environments

**6. Quick Environment Switching**
- Need to test against production data? Switch vault reference temporarily
- Need to demo without hitting real APIs? Switch to mock service vault
- Want to run load tests? Switch to load test environment vault

## Multiple Configuration Sets

One of the most powerful features of Config Vault is the ability to maintain multiple configuration sets for different environments or use cases. This allows you to:

- **Separate environments**: Development, staging, and production configurations
- **Different clients**: Customer A settings vs Customer B settings
- **Testing scenarios**: Production data vs test data
- **Regional configurations**: US servers vs EU servers

### Creating Multiple Vaults

Create separate vault-config nodes for each configuration set:

1. **Development Vault**
   - Name: "Development Settings"
   - Domains:
     - apiService: { baseUrl: "http://localhost:3000", apiKey: "dev_key_123" }
     - database: { host: "localhost", port: 5432 }
     - features: { debugMode: true, rateLimitPerMinute: 1000 }

2. **Staging Vault**
   - Name: "Staging Settings"
   - Domains:
     - apiService: { baseUrl: "https://staging-api.example.com", apiKey: "stg_key_456" }
     - database: { host: "staging-db.example.com", port: 5432 }
     - features: { debugMode: true, rateLimitPerMinute: 500 }

3. **Production Vault**
   - Name: "Production Settings"
   - Domains:
     - apiService: { baseUrl: "https://api.example.com", apiKey: "prod_key_789" }
     - database: { host: "prod-db.example.com", port: 5432 }
     - features: { debugMode: false, rateLimitPerMinute: 100 }

### Switching Between Configuration Sets

To switch from one environment to another, simply change which vault-config node your vault nodes reference:

**Method 1: Edit Each Vault Node**
1. Double-click the vault node
2. Change the "Vault" dropdown from "Development Settings" to "Production Settings"
3. Click "Done"
4. Deploy

**Method 2: Duplicate Flows for Different Environments**
1. Create separate flow tabs: "API Flow (Dev)", "API Flow (Staging)", "API Flow (Prod)"
2. Each flow uses the same logic but references different vault-config nodes
3. Enable/disable tabs as needed for each environment

**Method 3: Use Subflows (Recommended)**
1. Create a subflow with your business logic
2. Pass the vault-config reference as a subflow property
3. Instantiate the subflow multiple times with different vault references

### Example: Multi-Environment Setup

#### Configuration
```
Vault-Config Nodes:
├── "Dev Settings"
│   └── apiService.baseUrl = "http://localhost:3000"
├── "Staging Settings"
│   └── apiService.baseUrl = "https://staging-api.example.com"
└── "Production Settings"
    └── apiService.baseUrl = "https://api.example.com"

Flow Setup:
Tab 1 (Development):
    [inject] → [vault: Dev Settings] → [http request]

Tab 2 (Production):
    [inject] → [vault: Production Settings] → [http request]
```

#### Workflow
1. Develop and test using the Development tab
2. When ready, copy flow to Staging tab and change vault reference
3. Test in staging environment
4. When validated, copy to Production tab and change vault reference
5. All business logic remains identical - only configuration changes

### Benefits of Multiple Configuration Sets

**Easy Testing**
- Test with production-like settings without affecting real systems
- Quickly switch between test and production data sources

**Risk Mitigation**
- Separate credentials for each environment reduces security risk
- Accidental deployments to wrong environment won't use wrong credentials

**Team Collaboration**
- Developers use dev settings, QA uses staging settings
- No need to share production credentials with entire team

**Simple Deployment**
- Export flow once, works in any environment
- Just point to appropriate vault-config node

**Configuration Tracking**
- Each environment's settings clearly defined in one place
- Easy to compare what differs between environments

**No Code Changes**
- Switch environments by changing configuration reference only
- Business logic remains unchanged and testable

### Practical Workflow Example

Here's a real-world workflow showing how a team might use multiple configuration sets:

#### Initial Setup

**Developer creates three vault-config nodes:**

1. **"Development Vault"**
```
apiService:
  - baseUrl: "http://localhost:8080"
  - apiKey: "dev_test_key"
  - logLevel: "debug"
database:
  - host: "localhost"
  - database: "myapp_dev"
smtp:
  - enabled: false  // Don't send real emails
  - host: "localhost"
```

2. **"Staging Vault"**
```
apiService:
  - baseUrl: "https://staging-api.company.com"
  - apiKey: "stg_abc123xyz"
  - logLevel: "info"
database:
  - host: "staging-db.company.com"
  - database: "myapp_staging"
smtp:
  - enabled: true
  - host: "smtp-relay.company.com"
```

3. **"Production Vault"**
```
apiService:
  - baseUrl: "https://api.company.com"
  - apiKey: "prod_key_secure_789"
  - logLevel: "warn"
database:
  - host: "prod-db-cluster.company.com"
  - database: "myapp_production"
smtp:
  - enabled: true
  - host: "smtp.company.com"
```

#### Development Phase

1. Developer creates flow using "Development Vault"
2. All vault nodes point to "Development Vault"
3. Developer tests against local services
4. Flow works with test data, debug logging enabled
5. No production services are touched

#### Staging/QA Phase

1. Developer exports flow (or commits to git)
2. QA imports flow to staging Node-RED instance
3. QA changes all vault node references from "Development Vault" to "Staging Vault"
4. Deploy
5. Flow now runs against staging services automatically
6. QA validates with staging data

#### Production Deployment

1. After QA approval, DevOps exports the validated flow
2. Import to production Node-RED instance
3. Change vault node references from "Staging Vault" to "Production Vault"
4. Deploy
5. Flow runs in production with production credentials
6. **Zero code changes were made** - only configuration references changed

#### Result

- **Same Flow Logic**: Business logic tested in dev is identical to production
- **Different Execution**: Each environment uses appropriate services and credentials
- **Safe Development**: Developers never need production credentials
- **Easy Rollback**: Switch back to staging vault for testing if issues arise
- **Audit Trail**: Clear separation of what config is used in each environment

## Security

### Built-In Encryption

All configuration values stored in the vault are encrypted using Node-RED's built-in credential encryption mechanism. This is the same proven encryption system Node-RED uses for username/password fields in core nodes.

**No External Dependencies:**
- Uses only Node-RED's native encryption functions
- No external libraries or packages required
- No separate vault servers or databases to maintain
- Works out of the box with standard Node-RED installation

**How It Works:**
1. Values are encrypted with a secret key derived from `credentialSecret` in settings.js
2. Encrypted values are stored in `flows_cred.json`
3. Plain text values never appear in `flows.json` (safe for version control)
4. Encryption uses AES-256-CTR with unique keys per Node-RED instance
5. Decryption happens automatically when Node-RED loads flows

### Best Practices

**For Security:**
1. **Credential Secret**: Set a strong `credentialSecret` in your Node-RED settings.js file
2. **File Permissions**: Restrict access to `flows_cred.json` on the file system (chmod 600)
3. **Backups**: Always backup both `flows.json` and `flows_cred.json` together
4. **Access Control**: Enable Node-RED's admin authentication to prevent unauthorized access
5. **Password Type**: Use the "password" type for sensitive values to mask them in the editor
6. **Separate Environments**: Use different `credentialSecret` values for dev, staging, and production

**For Configuration Management:**
1. **Organize by Domain**: Group related settings together (e.g., all API settings in one domain)
2. **Descriptive Names**: Use clear names for vaults (e.g., "Production Settings" not "Vault1")
3. **Document Values**: Add comments in your flow documentation about which vault settings are used where
4. **Consistent Naming**: Use consistent property names across environments (e.g., always use "baseUrl" not sometimes "url")
5. **Version Control**: Keep `flows.json` in version control; exclude `flows_cred.json` (add to .gitignore)
6. **Test Changes**: Test configuration changes in development before applying to production

### Limitations

**Security Limitations:**
- Values are encrypted at rest but decrypted when Node-RED loads flows
- Anyone with admin access to Node-RED can view and edit all configuration values
- This is not a replacement for enterprise secret management systems (like HashiCorp Vault or AWS Secrets Manager)
- For highly sensitive production environments, consider using environment variables with Node-RED's `${ENV_VAR}` syntax

**Design Considerations:**
- Configuration changes require redeploying flows to take effect
- All values stored in memory while Node-RED is running
- Not designed for frequently-changing values (use context store for that)
- Not designed for large amounts of data (use database for that)

**Best Use Cases:**
This module is ideal for:
- Application configuration that changes infrequently
- Environment-specific settings (dev vs staging vs production)
- Credentials and API keys that need encryption
- Settings shared across multiple flows
- Configuration values that need centralized management

## Error Handling

The vault node includes comprehensive error handling:

### Errors Prevent Message Flow

The following errors will stop the message from being forwarded:

1. **No Vault Configured**: You must select a vault-config node
2. **No Properties Configured**: At least one property retrieval must be configured
3. **Domain Not Found**: The specified domain doesn't exist in the vault
4. **Property Not Found**: The specified property doesn't exist in that domain
5. **Invalid Context**: Context must be msg, flow, or global
6. **Set Property Failed**: Unable to set the value (e.g., invalid property path)

### Error Logging

All errors are logged with descriptive messages:

```
Error: Domain not found: apiService
Error: Property "apiKey" not found in domain: apiService
Error: Invalid context type "env", must be msg, flow, or global
```

Check the Node-RED debug panel for error details.

### Debugging

1. Enable debug logging in settings.js: `logging: { console: { level: "debug" } }`
2. Use debug nodes after the vault node to inspect output
3. Verify vault configuration in the Configuration nodes panel
4. Check that domains and property names match exactly (case-sensitive)

## Migration Guide

### From Version 1.3.x to 1.4.x

Version 1.4.0 introduces breaking changes to the runtime node configuration.

**Old Configuration (1.3.x):**
```javascript
// Used msg.key to lookup entire credential object
msg.key = "apiService";
// Output: msg.credentials = {username: "alice", apiKey: "abc123"}
```

**New Configuration (1.4.x):**
```javascript
// Configure specific properties to retrieve
Config: apiService.username → msg.username
        apiService.apiKey → msg.apiKey
// Output: msg.username = "alice"
        msg.apiKey = "abc123"
```

**Migration Steps:**

1. Update package: `npm install node-red-contrib-config-vault@latest`
2. Open each vault node in your flows
3. Remove any function nodes that set `msg.key`
4. Configure property retrievals directly in the vault node
5. Update downstream nodes to use specific properties instead of `msg.credentials`
6. Test thoroughly before deploying to production

The vault-config node format is backward compatible - no changes needed.

## Troubleshooting

### Issue: "Domain not found" error

**Cause**: Domain name in vault node doesn't match domain name in vault-config

**Solution**: 
- Check spelling and case (names are case-sensitive)
- Open vault-config and verify the domain exists
- Use the dropdown in vault node (prevents typos)

### Issue: Credentials not loading when editing config

**Cause**: This is by design for security

**Solution**: 
- Credentials are intentionally not pre-filled when editing
- Re-enter credentials or leave unchanged
- If domains appear empty, check that vault-config node is properly saved

### Issue: Values not appearing in flow/global context

**Cause**: Flow/global context may not be configured

**Solution**:
- Check settings.js for contextStorage configuration
- Default (memory-only) context works but doesn't persist across restarts
- For persistence, configure file-based or Redis context storage

### Issue: "Module not found" after installation

**Cause**: Node-RED hasn't been restarted

**Solution**:
- Always restart Node-RED after installing nodes
- If using Docker, restart the container
- Check npm install completed without errors

## License

MIT

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
