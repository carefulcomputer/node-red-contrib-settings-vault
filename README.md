# node-red-contrib-config-vault

A Node-RED module for centralized configuration management with encrypted storage. Store credentials, API endpoints, database settings, feature flags, and any other configuration values in one secure location and reuse them across multiple flows.

## Table of Contents

- [Overview](#overview)
- [Why Use Config Vault](#why-use-config-vault)
- [Key Features](#key-features)
- [Key Benefits](#key-benefits)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
  - [Configuration Node](#configuration-node)
  - [Runtime Node](#runtime-node)
- [Use Cases](#use-cases)
- [Multiple Configuration Sets](#multiple-configuration-sets)
- [Security](#security)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
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

- **Centralized Storage**: Store all configuration values in one place, organized by logical groups
- **Any Configuration Type**: Not just credentials - store API endpoints, database settings, feature flags, timeouts, or any other config data
- **Multiple Configuration Sets**: Create separate vaults for different environments (development, staging, production)
- **Encrypted Storage**: Automatic encryption using Node-RED's built-in credential system - no external dependencies
- **One-Click Updates**: Change a configuration value once and it updates everywhere it's used
- **Flexible Retrieval**: Access values via message properties, flow context, or global context
- **Type-Safe Inputs**: Support for strings, numbers, booleans, JSON, dates, and masked passwords
- **User-Friendly Interface**: Simple form-based UI with dropdowns and validation
- **Logical Grouping**: Organize related settings together (e.g., "apiService", "database", "emailServer")
- **Dynamic Configuration**: Dropdowns auto-populate from your vault, preventing typos
- **No External Dependencies**: Uses only Node-RED's native functionality - no additional packages or servers

## Key Benefits

**Easy Testing**
- Test with production-like settings without affecting real systems
- Quickly switch between test and production data sources
- Reproduce production issues with test data

**Risk Mitigation**
- Separate credentials for each environment reduces security risk
- Accidental deployments to wrong environment won't use wrong credentials
- No production API calls during development

**Team Collaboration**
- Developers use dev settings, QA uses staging settings
- No need to share production credentials with entire team
- Same flow logic works for everyone

**Simple Deployment**
- Export flow once, works in any environment
- Just point to appropriate vault-config node
- No code changes between environments

**Configuration Tracking**
- Each environment's settings clearly defined in one place
- Easy to compare what differs between environments
- Version control friendly (flows separate from credentials)

**Environment-Agnostic Flows**
- Develop with test settings, deploy with production settings
- Same flow logic, different configuration
- Quick environment switching for testing or demos

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
5. Click "Add Group" and name it (e.g., "apiService")
6. Add properties for that group:
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
   - Group: apiService
   - Property: apiKey
   - Save to: msg.apiKey
5. Click "Done"
6. Deploy

Now when messages pass through this vault node, `msg.apiKey` will automatically be populated with your API key.

## Detailed Usage

### Configuration Node

The `vault-config` node is where you define and store all your credentials.

#### Structure

Configuration values are organized hierarchically by groups. Each group contains related settings:

```
Vault: "Production Settings"
├── Group: apiService
│   ├── baseUrl (str): "https://api.production.com"
│   ├── apiKey (password): "sk_live_abc123"
│   ├── timeout (num): 30000
│   ├── retryEnabled (bool): true
│   └── maxRetries (num): 3
├── Group: database
│   ├── host (str): "db.production.com"
│   ├── port (num): 5432
│   ├── username (str): "app_user"
│   ├── password (password): "dbpass123"
│   ├── ssl (bool): true
│   └── poolSize (num): 10
├── Group: emailServer
│   ├── smtp (str): "smtp.example.com"
│   ├── port (num): 587
│   ├── secure (bool): true
│   └── credentials (json): {"user":"mail@example.com","pass":"mailpass"}
└── Group: features
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
| `date` | Timestamp | Expiration dates, schedule times |

#### UI Features

- **Collapse/Expand**: Groups are collapsed by default for easy navigation
- **Clone**: Duplicate groups to create variations (e.g., dev, staging, prod)
- **Validation**: Real-time validation with visual feedback
- **Simple Form Inputs**: Structured fields with automatic type handling

### Runtime Node

The `vault` node retrieves specific property values from your vault and makes them available in your flow.

#### Configuration

Each row in the vault node configuration specifies:

1. **Group** (dropdown): Which credential group to use
2. **Property** (dropdown): Which specific value to retrieve
3. **Context** (dropdown): Where to store it (msg/flow/global)
4. **Property Name** (text): The property name in that context

#### Context Options

**msg Context**
- Stores value on the message object
- Scoped to single message
- Use for: Per-request data, HTTP headers, temporary values

```javascript
Group: apiService, Property: apiKey
Context: msg, Name: apiKey
Result: msg.apiKey = "sk_live_abc123"
```

**flow Context**
- Stores value in flow context
- Shared across all nodes in the same flow tab
- Persists between messages
- Use for: Shared configuration, cached values, flow-wide settings

```javascript
Group: apiService, Property: baseUrl
Context: flow, Name: apiUrl
Result: flow.apiUrl = "https://api.example.com"
```

**global Context**
- Stores value in global context
- Shared across all flows and tabs
- Persists between messages
- Use for: System-wide configuration, shared database connections

```javascript
Group: database, Property: host
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

### API Integration
Store API credentials and endpoints together, then use them in HTTP requests.

```
[vault] → [http request]
```

Vault: `apiService.baseUrl → msg.baseUrl`, `apiService.apiKey → msg.apiKey`

### Database Connections
Retrieve database credentials and connection settings for database nodes.

```
[vault] → [mysql/postgres/mongodb]
```

Vault: `database.host → msg.host`, `database.user → msg.user`, `database.password → msg.password`

### Feature Flags
Control flow behavior dynamically without modifying flow logic.

```
[vault] → [switch: check flag] → route based on configuration
```

Vault: `features.maintenanceMode → flow.maintenance`, `features.useTestAPI → flow.testMode`

**Examples:**
- Enable/disable flows based on maintenance mode
- Route to different APIs (production/test/mock) based on configuration
- Adjust thresholds or limits without redeploying flows

### Shared Configuration
Store settings in flow or global context for access across multiple flows.

```
[vault] → stores to flow.apiUrl
Multiple flows read flow.apiUrl without duplicating vault nodes
```

### Multi-Environment Deployment
Develop flows with test settings, deploy to production with different settings - no flow changes needed.

**Workflow:**
1. Create "Dev Settings" vault with test endpoints and credentials
2. Build and test flow using dev vault
3. Create "Production Settings" vault with production endpoints and credentials
4. Switch vault reference in node → Deploy
5. Same flow logic, different configuration

## Multiple Configuration Sets

Maintain multiple vault-config nodes for different environments or use cases:

- **Separate environments**: Development, staging, and production configurations
- **Different clients**: Customer A settings vs Customer B settings
- **Testing scenarios**: Production data vs test data vs mock data
- **Regional configurations**: US servers vs EU servers

### Example Setup

Create separate vault-config nodes with the same structure but different values:

```
"Development Settings":
  - apiService: { baseUrl: "http://localhost:3000", apiKey: "dev_key" }
  - database: { host: "localhost" }

"Production Settings":
  - apiService: { baseUrl: "https://api.example.com", apiKey: "prod_key" }
  - database: { host: "prod-db.example.com" }
```

### Switching Environments

To switch from one environment to another:
1. Double-click the vault node
2. Change "Vault" dropdown from "Development Settings" to "Production Settings"
3. Deploy

Same flow logic, different configuration - no code changes needed.

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
1. **Organize by Group**: Organize related settings together (e.g., all API settings in one group)
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
3. **Group Not Found**: The specified group doesn't exist in the vault
4. **Property Not Found**: The specified property doesn't exist in that group
5. **Invalid Context**: Context must be msg, flow, or global
6. **Set Property Failed**: Unable to set the value (e.g., invalid property path)

### Error Logging

All errors are logged with descriptive messages:

```
Error: Group not found: apiService
Error: Property "apiKey" not found in group: apiService
Error: Invalid context type "env", must be msg, flow, or global
```

Check the Node-RED debug panel for error details.

### Debugging

1. Enable debug logging in settings.js: `logging: { console: { level: "debug" } }`
2. Use debug nodes after the vault node to inspect output
3. Verify vault configuration in the Configuration nodes panel
4. Check that groups and property names match exactly (case-sensitive)

## Troubleshooting

### Issue: "Group not found" error

**Cause**: Group name in vault node doesn't match group name in vault-config

**Solution**: 
- Check spelling and case (names are case-sensitive)
- Open vault-config and verify the group exists
- Use the dropdown in vault node (prevents typos)

### Issue: Dropdowns appear empty in vault node

**Cause**: Vault-config node hasn't been saved yet or doesn't contain any groups

**Solution**: 
- Open the vault-config node and verify groups and properties exist
- Make sure you clicked "Update" to save the vault-config
- Dropdowns will show your saved selections even if the vault-config hasn't been opened yet

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
