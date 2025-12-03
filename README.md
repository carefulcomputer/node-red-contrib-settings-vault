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

Think of a vault like a drawer in a filing cabinet. Inside this drawer, you have multiple folders (called "groups"), and each folder contains labeled papers (your configuration values).

For example, a vault named "Production Settings" might contain:
- A folder labeled "apiService" with papers for: baseUrl, apiKey, timeout
- A folder labeled "database" with papers for: host, port, username, password
- A folder labeled "emailServer" with papers for: smtp, port, credentials

All values are encrypted using Node-RED's built-in credential encryption mechanism and stored in the `flows_cred.json` file. This ensures sensitive data never appears in plain text in your `flows.json` file.

**No external dependencies:**
This module uses only Node-RED's native encryption functionality. No external libraries, no additional setup, no separate vault servers to maintain.

## Why Use Config Vault

- **Single Source of Truth**: All configuration in one place - change once, affects all flows using it
- **Encrypted Storage**: Uses Node-RED's built-in credential encryption with no external dependencies
- **Multiple Environments**: Create separate vaults for dev, staging, production - same flow logic, different settings
- **Feature Flag Control**: Enable/disable/redirect entire flows without modifying flow logic
- **Version Control Friendly**: Configuration separate from flow logic, safe to share flows without exposing credentials
- **Environment-Agnostic Flows**: Develop with test settings, deploy with production settings by switching vault reference

## Key Features

- **Centralized Storage**: Store all configuration values in one place, organized by logical groups
- **Any Configuration Type**: Not just credentials - store API endpoints, database settings, feature flags, timeouts, or any other config data
- **One-Click Updates**: Change a configuration value once and it updates everywhere it's used
- **Flexible Retrieval**: Access values via message properties, flow context, or global context
- **Type-Safe Inputs**: Support for strings, numbers, booleans, JSON, dates, and masked passwords
- **Logical Grouping**: Organize related settings together (e.g., "apiService", "database", "emailServer")

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

A vault stores your configuration values organized by groups. Each group contains related settings.

1. Open Node-RED editor
2. Go to menu (three horizontal lines) → Configuration nodes
3. Click "Add" and select "vault-config"
4. Give it a meaningful name that describes this set of settings
5. Click "Add Group" and name it based on what settings it contains (e.g., name it "apiService" if storing API-related settings)
6. Add properties within that group - each property has a name, type, and value
7. Click "Update" to save

**Example:** If you need to store API settings, you might create a group called "apiService" with properties like `baseUrl`, `apiKey`, and `timeout`.

### 2. Use in Your Flow

The vault node retrieves specific values from your vault and makes them available in your flow.

1. Drag the "vault" node into your flow
2. Double-click to configure
3. Select which vault configuration to use
4. Configure what to retrieve (one row appears by default):
   - **Group**: Select which group contains the value you need
   - **Property**: Select which specific value from that group
   - **Output**: Choose where to store it (`msg`, `flow`, or `global`) and enter the property name
5. Click "Done" to save
6. Deploy your flow

When messages pass through the vault node, the configured values will be automatically populated.

**Tip:** Add multiple rows to retrieve several values at once.

## Detailed Usage

### Configuration Node

The `vault-config` node is where you define and store all your configuration values.

#### Supported Data Types

| Type | Description | Use Case |
|------|-------------|----------|
| `str` | String/text | Usernames, hostnames, URLs, tokens |
| `password` | Masked string | Passwords, secrets, API keys (hidden in editor) |
| `num` | Number | Ports, timeouts, IDs, counts |
| `bool` | Boolean | Feature flags, enable/disable settings |
| `json` | JSON object/array | Complex configurations, nested data |
| `date` | Timestamp | Expiration dates, schedule times |

### Runtime Node

The `vault` node retrieves specific property values from your vault and makes them available in your flow.

#### Configuration

Each row in the vault node configuration specifies:

1. **Group** (dropdown): Which group to retrieve from
2. **Property** (dropdown): Which specific value to retrieve
3. **Output** (context selector): Where to store the value
   - Select context type: `msg`, `flow`, or `global`
   - Enter property name

**Example:** To retrieve an API key from the "apiService" group and store it in `msg.apiKey`, you would select Group: "apiService", Property: "apiKey", Output: msg.apiKey.

You can add multiple rows to retrieve several values at once.

## Use Cases

### API Integration
Store API credentials and endpoints together, then use them in HTTP requests.

```
[vault] → [http request]
```

Vault retrieves `baseUrl` and `apiKey` from `apiService` group and stores them in `msg.baseUrl` and `msg.apiKey`.

### Database Connections
Retrieve database credentials and connection settings for database nodes.

```
[vault] → [mysql/postgres/mongodb]
```

Vault retrieves `host`, `user`, and `password` from `database` group and stores them in `msg.host`, `msg.user`, and `msg.password`.

### Feature Flags
Control flow behavior dynamically without modifying flow logic.

```
[vault] → [switch: check flag] → route based on configuration
```

Vault retrieves `maintenanceMode` and `useTestAPI` from `features` group and stores them in `flow.maintenance` and `flow.testMode`.

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

You can create multiple vault-config nodes for different environments or use cases:

- **Separate environments**: Development, staging, and production configurations
- **Different clients**: Customer A settings vs Customer B settings
- **Testing scenarios**: Production data vs test data vs mock data
- **Regional configurations**: US servers vs EU servers

### Changing Configuration Values

To update configuration values (e.g., switching from test to production settings):

1. Open the vault-config node you're using
2. Edit the property values as needed
3. Click "Update" to save
4. Deploy your flows

The updated values will be used by all vault nodes referencing that configuration.

## Security

### Built-In Encryption

All configuration values stored in the vault are encrypted using Node-RED's built-in credential encryption mechanism. This is the same proven encryption system Node-RED uses for username/password fields in core nodes.

### Best Practices

**For Security:**
1. **Backups**: Always backup both `flows.json` and `flows_cred.json` together
2. **Access Control**: Enable Node-RED's admin authentication to prevent unauthorized access
3. **Password Type**: Use the "password" type for sensitive values to mask them in the editor
4. **Separate Environments**: Use different `credentialSecret` values for dev, staging, and production

**For Configuration Management:**
1. **Organize by Group**: Organize related settings together (e.g., all API settings in one group)
2. **Descriptive Names**: Use clear names for vaults (e.g., "Production Settings" not "Vault1")
3. **Document Values**: Add comments in your flow documentation about which vault settings are used where
4. **Consistent Naming**: Use consistent property names across environments (e.g., always use "baseUrl" not sometimes "url")

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
