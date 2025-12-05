/**
 * Node-RED Contrib Settings Vault
 * 
 * This module provides two node types:
 * 1. vault-config: Configuration node for storing encrypted settings
 * 2. vault: Runtime node for retrieving specific settings
 * 
 * Additionally, provides a global function API for direct access from function nodes:
 * - Access via: const vault = global.get('vault');
 * - Usage: vault('VaultName').getGroup('groupName').getProperty('property')
 */

module.exports = function(RED) {
    
    // Vault registry to track all active vault-config nodes
    // Key: node ID, Value: vault node instance
    const vaultRegistry = {};
    
    /**
     * Configuration Node: vault-config
     * 
     * Purpose:
     *   Stores multiple credential sets organized by groups in a single encrypted field.
     *   All credentials are stored as JSON in the Node-RED credential store and
     *   encrypted using Node-RED's built-in encryption mechanism.
     * 
     * Data Structure:
     *   {
     *     "groupName": {
     *       "property1": {"value": "value1", "type": "str"},
     *       "property2": {"value": "value2", "type": "cred"}
     *     }
     *   }
     * 
     * Example:
     *   {
     *     "apiService": {
     *       "username": {"value": "alice", "type": "str"},
     *       "apiKey": {"value": "sk_live_abc123", "type": "cred"}
     *     },
     *     "database": {
     *       "host": {"value": "db.example.com", "type": "str"},
     *       "port": {"value": 5432, "type": "num"}
     *     }
     *   }
     */
    function VaultConfigNode(config) {
        RED.nodes.createNode(this, config);
        
        this.name = config.name;
        this.storeObject = {};
        
        // Parse the encrypted credential store JSON
        // The 'store' field contains encrypted JSON managed by Node-RED's credential system
        if (this.credentials && this.credentials.store) {
            try {
                this.storeObject = JSON.parse(this.credentials.store);
            } catch (err) {
                this.error('Failed to parse vault store JSON: ' + err.message);
                this.storeObject = {};
            }
        }
        
        /**
         * Get credentials for a specific group
         * 
         * @param {string} key - The group name (e.g., "apiService")
         * @returns {object|null} - The credential object for that group, or null if not found
         * 
         * This method is called by vault runtime nodes to retrieve credentials.
         * It performs validation to ensure the key exists and contains a valid object.
         */
        this.getCredentialsForKey = function(key) {
            // Validate key parameter
            if (typeof key !== 'string' || key === '') {
                return null;
            }
            
            // Look up the group in the store
            const entry = this.storeObject[key];
            
            // Check if entry exists
            if (entry === undefined || entry === null) {
                return null;
            }
            
            // Ensure entry is an object (groups should contain properties)
            if (typeof entry !== 'object') {
                return null;
            }
            
            // Return the credential object for this group
            return entry;
        };
        
        // Register this vault in the global registry
        vaultRegistry[this.id] = this;
        
        // Cleanup: Unregister vault when node is closed
        const self = this;
        this.on('close', function() {
            delete vaultRegistry[self.id];
        });
    }
    
    // Register the configuration node
    // The 'text' type for credentials allows editing in the UI while still encrypting at rest
    RED.nodes.registerType('vault-config', VaultConfigNode, {
        credentials: {
            store: { type: 'text' }
        }
    });
    
    
    /**
     * Global Vault Function API
     * 
     * Provides direct access to vault values from function nodes using a fluent interface.
     * 
     * Access pattern:
     *   const vault = global.get('vault');
     *   const value = vault('VaultName').getGroup('groupName').getProperty('property');
     * 
     * Alternative patterns:
     *   const group = vault('VaultName').getGroup('groupName');
     *   const value = group.property;  // Direct property access
     *   const { prop1, prop2 } = vault('VaultName').getGroup('groupName');  // Destructuring
     *   const all = vault('VaultName').getGroup('groupName').getAll();  // Clean copy
     */
    // Register vault function in functionGlobalContext
    // Note: functionGlobalContext is read-only in Node-RED v4.x, but we can still set properties on it
    const vaultFunction = function(vaultName) {
        // Find vault by name in the registry
        let vaultNode = null;
        for (const id in vaultRegistry) {
            if (vaultRegistry[id].name === vaultName) {
                vaultNode = vaultRegistry[id];
                break;
            }
        }
        
        // Throw error if vault not found
        if (!vaultNode) {
            throw new Error('Vault "' + vaultName + '" not found');
        }
        
        // Return vault accessor object with getGroup method
        return {
            getGroup: function(groupName) {
                // Get group data from vault
                const groupData = vaultNode.getCredentialsForKey(groupName);
                
                // Throw error if group not found
                if (!groupData) {
                    throw new Error('Group "' + groupName + '" not found in vault "' + vaultName + '"');
                }
                
                // Create result object with group data
                const result = {};
                
                // Copy all properties from groupData, extracting values
                for (const prop in groupData) {
                    if (groupData.hasOwnProperty(prop)) {
                        const propertyData = groupData[prop];
                        
                        // Handle both new format ({value, type}) and legacy format (raw value)
                        if (propertyData && 
                            typeof propertyData === 'object' && 
                            propertyData.hasOwnProperty('value') && 
                            propertyData.hasOwnProperty('type')) {
                            // New format - extract value
                            result[prop] = propertyData.value;
                        } else {
                            // Legacy format - use raw value
                            result[prop] = propertyData;
                        }
                    }
                }
                
                // Add getProperty method
                result.getProperty = function(property) {
                    if (!result.hasOwnProperty(property) || typeof result[property] === 'function') {
                        throw new Error('Property "' + property + '" not found in group "' + groupName + '"');
                    }
                    return result[property];
                };
                
                // Add getAll method that returns clean copy without methods
                result.getAll = function() {
                    const clean = {};
                    for (const prop in result) {
                        if (result.hasOwnProperty(prop) && typeof result[prop] !== 'function') {
                            clean[prop] = result[prop];
                        }
                    }
                    return clean;
                };
                
                return result;
            }
        };
    };
    
    // Safely register the vault function (handles both old and new Node-RED versions)
    if (RED.settings.functionGlobalContext) {
        RED.settings.functionGlobalContext.vault = vaultFunction;
    }
    
    
    /**
     * Runtime Node: vault
     * 
     * Purpose:
     *   Retrieves specific property values from vault groups and sets them to
     *   message properties, flow context, or global context based on configuration.
     * 
     * Configuration:
     *   - vault: Reference to a vault-config node
     *   - properties: Array of property retrieval configurations
     * 
     * Property Configuration Structure:
     *   {
     *     group: "apiService",            // Which group to retrieve from
     *     property: "apiKey",             // Which property within that group
     *     output: "msg.apiKey"            // Where to store it (msg/flow/global.propertyName)
     *   }
     * 
     * Flow:
     *   1. Validate configuration (vault ref, properties array)
     *   2. For each configured property:
     *      a. Retrieve group credentials from vault
     *      b. Check if property exists in group
     *      c. Extract specific property value (handles both new and legacy formats)
     *      d. Set value to configured context (msg/flow/global)
     *   3. Forward message with all values set
     * 
     * Error Handling:
     *   Any error stops processing and prevents message from being forwarded.
     *   Errors are logged with descriptive messages to aid debugging.
     */
    function VaultNode(config) {
        RED.nodes.createNode(this, config);
        
        const node = this;
        
        // Get reference to the vault-config node
        // This provides access to the encrypted credential store
        this.vaultConfig = RED.nodes.getNode(config.vault);
        
        // Array of property retrievals configured in the node
        // Each element: {group, property, output}
        this.properties = config.properties || [];
        
        // Handle incoming messages
        this.on('input', function(msg, send, done) {
            // Polyfill for Node-RED versions < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(err) { if (err) { node.error(err, msg); } };
            
            // Clear any previous error status
            node.status({});
            
            try {
                // Validate: Ensure vault-config node is configured
                if (!node.vaultConfig) {
                    node.status({fill: 'red', shape: 'ring', text: 'No vault configured'});
                    node.error('No vault-config node configured', msg);
                    done();
                    return;
                }
                
                // Validate: Ensure at least one property is configured
                if (!node.properties || node.properties.length === 0) {
                    node.status({fill: 'red', shape: 'ring', text: 'No properties configured'});
                    node.error('No properties configured to retrieve', msg);
                    done();
                    return;
                }
                
                // Process each configured property retrieval
                for (let i = 0; i < node.properties.length; i++) {
                    const prop = node.properties[i];
                    
                    // Validate: Ensure property configuration is complete
                    if (!prop.group || !prop.property || !prop.output) {
                        node.status({fill: 'red', shape: 'ring', text: 'Invalid configuration'});
                        node.error('Invalid property configuration at index ' + i, msg);
                        done();
                        return;
                    }
                    
                    // Step 1: Get all credentials for the specified group
                    const groupCredentials = node.vaultConfig.getCredentialsForKey(prop.group);
                    
                    if (groupCredentials === null) {
                        node.status({fill: 'red', shape: 'ring', text: 'Group not found: ' + prop.group});
                        node.error('Group not found: ' + prop.group, msg);
                        done();
                        return;
                    }
                    
                    // Step 2: Check if the specific property exists in this group
                    if (!groupCredentials.hasOwnProperty(prop.property)) {
                        node.status({fill: 'red', shape: 'ring', text: 'Property not found: ' + prop.property});
                        node.error('Property "' + prop.property + '" not found in group: ' + prop.group, msg);
                        done();
                        return;
                    }
                    
                    // Step 3: Extract value from the property data
                    // New format: {value: actualValue, type: 'str'|'cred'|'num'|'bool'|'json'|'date'}
                    // Legacy format: just the raw value (for backward compatibility)
                    const propertyData = groupCredentials[prop.property];
                    let value;
                    
                    // New format must have BOTH 'value' and 'type' properties
                    // This prevents false positives with legacy JSON objects
                    if (propertyData && 
                        typeof propertyData === 'object' && 
                        propertyData.hasOwnProperty('value') && 
                        propertyData.hasOwnProperty('type')) {
                        // New format with type metadata
                        value = propertyData.value;
                    } else {
                        // Legacy format - use raw value
                        value = propertyData;
                    }
                    
                    // Step 4: Set the property value to the configured context
                    try {
                        // Parse output format: "msg.username", "flow.apiKey", "global.dbHost"
                        const outputParts = prop.output.split('.');
                        
                        // Validate output format (must have at least context type and property name)
                        if (outputParts.length < 2) {
                            node.status({fill: 'red', shape: 'ring', text: 'Invalid output format'});
                            node.error('Invalid output format "' + prop.output + '", expected format: msg.property or flow.property or global.property', msg);
                            done();
                            return;
                        }
                        
                        // Extract context type (msg/flow/global) and property path
                        const contextType = outputParts[0];
                        const propertyPath = outputParts.slice(1).join('.');
                        
                        // Set value based on context type
                        if (contextType === 'msg') {
                            // Message context: Set property on the message object
                            // Supports nested paths like "user.name" → msg.user.name
                            RED.util.setMessageProperty(msg, propertyPath, value, true);
                            
                        } else if (contextType === 'flow') {
                            // Flow context: Store in flow-scoped context
                            // Accessible by all nodes in the same flow tab
                            node.context().flow.set(propertyPath, value);
                            
                        } else if (contextType === 'global') {
                            // Global context: Store in global context
                            // Accessible by all nodes across all flows
                            node.context().global.set(propertyPath, value);
                            
                        } else {
                            // Invalid context type
                            node.status({fill: 'red', shape: 'ring', text: 'Invalid context: ' + contextType});
                            node.error('Invalid context type "' + contextType + '", must be msg, flow, or global', msg);
                            done();
                            return;
                        }
                        
                    } catch (setErr) {
                        // Catch errors from setting properties (e.g., invalid property path)
                        node.status({fill: 'red', shape: 'ring', text: 'Failed to set property'});
                        node.error('Failed to set property "' + prop.output + '": ' + setErr.message, msg);
                        done();
                        return;
                    }
                }
                
                // All properties successfully retrieved and set - forward the message
                node.status({});
                send(msg);
                done();
                
            } catch (err) {
                // Catch any unexpected errors to prevent Node-RED crashes
                node.status({fill: 'red', shape: 'ring', text: 'Unexpected error'});
                node.error(err.message, msg);
                done();
            }
        });
    }
    
    // Register the runtime node
    RED.nodes.registerType('vault', VaultNode);
};

