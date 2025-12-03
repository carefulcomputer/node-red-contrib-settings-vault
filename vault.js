/**
 * Node-RED Contrib Config Vault
 * 
 * This module provides two node types:
 * 1. vault-config: Configuration node for storing encrypted credentials
 * 2. vault: Runtime node for retrieving specific credentials
 */

module.exports = function(RED) {
    
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
     *       "property1": "value1",
     *       "property2": "value2"
     *     }
     *   }
     * 
     * Example:
     *   {
     *     "apiService": {
     *       "username": "alice",
     *       "apiKey": "sk_live_abc123"
     *     },
     *     "database": {
     *       "host": "db.example.com",
     *       "port": 5432
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
    }
    
    // Register the configuration node
    // The 'text' type for credentials allows editing in the UI while still encrypting at rest
    RED.nodes.registerType('vault-config', VaultConfigNode, {
        credentials: {
            store: { type: 'text' }
        }
    });
    
    
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
     *      b. Extract specific property value
     *      c. Set value to configured context (msg/flow/global)
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
                    
                    // Step 3: Set the property value to the configured context
                    try {
                        const value = groupCredentials[prop.property];
                        
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

