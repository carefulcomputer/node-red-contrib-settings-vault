# Changelog

All notable changes to node-red-contrib-secrets-vault will be documented in this file.

## [1.2.0] - 2024-12-02

### Added
- **Advanced field-based UI** with Node-RED's native TypedInput widgets
  - Nested structure: Entries contain multiple credential fields
  - Each field has: name, type selector, and typed value input
  - **Six supported types**: str, num, bool, json, bin, date
  - Multi-level add/delete: manage entries and individual fields
  - Native Node-RED type validation and conversion
  - Professional UI consistent with Node-RED editor

### Changed
- **Completely redesigned UI** from JSON textarea to structured field management
- Individual field control instead of bulk JSON editing
- Type-aware value inputs with built-in validation
- Better visual hierarchy (entries → fields)
- Improved user experience for non-technical users

### Technical
- Integrated Node-RED TypedInput widget ($.typedInput)
- Automatic type detection when loading existing vaults
- Type-specific value conversion on save (num → Number, bool → Boolean, etc.)
- Maintains backward compatibility with existing vault data

## [1.1.0] - 2024-12-01

### Added
- **User-friendly UI** for vault-config node
  - Individual fields for each vault entry (Key + Credentials)
  - Add Entry button to create new entries
  - Delete button for each entry
  - Auto-parsing and pre-filling of existing vault data when editing
  - Real-time validation of JSON credentials
  - Duplicate key detection
  - Better error messages with specific field validation

### Changed
- Replaced single JSON textarea with structured entry management UI
- Improved user experience for managing multiple credentials
- Enhanced validation feedback

### Removed
- **Removed `msg.credentialsKey` from output** - This was redundant since the key is either in `msg.key` (if provided by user) or configured as `defaultKey`

### Fixed
- **Fixed credential editing** - Changed credential type from `password` to `text` so existing vault entries properly load when editing the config node. Credentials are still encrypted in `flows_cred.json` - the type only controls editor visibility

### Technical Details
- UI parses existing vault JSON and populates entry fields on load
- On save, validates each entry and rebuilds vault JSON
- Maintains backward compatibility with existing vault data
- All credential storage remains unchanged (still encrypted in flows_cred.json)

## [1.0.0] - 2024-12-01

### Added
- Initial release
- vault-config node for storing multiple credentials
- vault runtime node for retrieving credentials by key
- Encrypted credential storage using Node-RED's built-in mechanism
- Support for msg.key and defaultKey configuration
- Comprehensive error handling
- JSON validation for vault configuration
- Complete documentation and testing guides

