# node-red-contrib-secrets-vault

A Node-RED module that provides a secure credential vault using Node-RED's built-in encrypted credential storage.

## Overview

This module allows you to store multiple credentials in a single encrypted configuration node and retrieve them by key at runtime. All credentials are encrypted using Node-RED's credential mechanism and stored in `flows_cred.json`.

## Installation

From your Node-RED user directory (typically `~/.node-red`):

```bash
npm install /path/to/node-red-contrib-secrets-vault
```

Restart Node-RED to load the new nodes.

## Nodes

### vault-config (Configuration Node)

A configuration node that stores multiple credential sets in an encrypted vault with an advanced field-based interface.

**Properties:**
- **Name**: A descriptive name for the vault
- **Vault Entries**: Structured credential management
  - Each entry has a **Key** (unique identifier)
  - Each entry contains multiple **Credential Fields**
  - Each field has: **Name**, **Type**, and **Value**

**Supported Types:**
- **str** - String/text (usernames, hosts, tokens)
- **num** - Numbers (ports, timeouts, IDs)
- **bool** - Booleans (true/false flags)
- **json** - JSON objects/arrays (complex data)
- **bin** - Buffers (binary data, certificates)
- **date** - Timestamps (dates, expiration times)

**Features:**
- Field-based UI using Node-RED's native TypedInput widget
- No JSON syntax errors - structured field inputs
- Type-aware value validation and conversion
- Multi-level add/delete (entries and fields)
- Auto-populates and type-detects existing credentials
- All credentials encrypted in `flows_cred.json`

**Example entry structure:**
- Entry Key: `serviceA`
  - Field: `username` (str) = `alice`
  - Field: `password` (str) = `secretA`
  - Field: `port` (num) = `8080`
  - Field: `enabled` (bool) = `true`

### vault (Runtime Node)

Retrieves credentials from a vault-config node by key.

**Inputs:**
- `msg.key` (string): The key to look up in the vault

**Outputs:**
- `msg.credentials` (object): The credential object for the specified key

**Configuration:**
- **Vault**: Reference to a vault-config node
- **Default Key**: Optional default key if `msg.key` is not provided

## Usage Example

1. **Create a vault-config node:**
   - Menu (☰) → Configuration nodes → Add "vault-config"
   - Name it "Central Vault"
   - Click **"Add Entry"** button
   - Enter Key: `serviceA`
   - Click **"Add Field"** button
   - Enter Field Name: `username`, Type: `str`, Value: `alice`
   - Click **"Add Field"** again
   - Enter Field Name: `password`, Type: `str`, Value: `secret123`
   - Add more fields or entries as needed
   - Click "Done"
   - Deploy

2. **Add a vault node to your flow:**
   - Drag a vault node into your flow
   - Select the "Central Vault" config node
   - Optionally set a default key

3. **Use in a flow:**
   ```
   [inject] → [function: set msg.key] → [vault] → [http request]
   ```

   In the function node:
   ```javascript
   msg.key = "serviceA";
   return msg;
   ```

   The vault node will add:
   ```javascript
   msg.credentials = {
     "username": "alice",
     "password": "secret123"
   }
   ```

## Security

- All credentials are encrypted at rest using Node-RED's credential encryption
- Credentials never appear in `flows.json` (only in `flows_cred.json`)
- The vault is read-only at runtime; updates require editing the config node and redeploying
- Credentials are only exposed on the message object for downstream nodes

## Error Handling

The vault node will log an error and **not** forward the message if:
- No key is provided (neither `msg.key` nor default key)
- No vault-config node is configured
- The specified key is not found in the vault
- The vault JSON is corrupted or invalid

## License

MIT

