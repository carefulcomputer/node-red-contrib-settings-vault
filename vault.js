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
     *   Stores multiple credential sets organized by domains in a single encrypted field.
     *   All credentials are stored as JSON in the Node-RED credential store and
     *   encrypted using Node-RED's built-in encryption mechanism.
     * 
     * Data Structure:
     *   {
     *     "domainName": {
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
         * Get credentials for a specific domain
         * 
         * @param {string} key - The domain name (e.g., "apiService")
         * @returns {object|null} - The credential object for that domain, or null if not found
         * 
         * This method is called by vault runtime nodes to retrieve credentials.
         * It performs validation to ensure the key exists and contains a valid object.
         */
        this.getCredentialsForKey = function(key) {
            // Validate key parameter
            if (typeof key !== 'string' || key === '') {
                return null;
            }
            
            // Look up the domain in the store
            const entry = this.storeObject[key];
            
            // Check if entry exists
            if (entry === undefined || entry === null) {
                return null;
            }
            
            // Ensure entry is an object (domains should contain properties)
            if (typeof entry !== 'object') {
                return null;
            }
            
            // Return the credential object for this domain
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
     *   Retrieves specific property values from vault domains and sets them to
     *   message properties, flow context, or global context based on configuration.
     * 
     * Configuration:
     *   - vault: Reference to a vault-config node
     *   - properties: Array of property retrieval configurations
     * 
     * Property Configuration Structure:
     *   {
     *     domain: "apiService",           // Which domain to retrieve from
     *     property: "apiKey",             // Which property within that domain
     *     output: "msg.apiKey"            // Where to store it (msg/flow/global.propertyName)
     *   }
     * 
     * Flow:
     *   1. Validate configuration (vault ref, properties array)
     *   2. For each configured property:
     *      a. Retrieve domain credentials from vault
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
        // Each element: {domain, property, output}
        this.properties = config.properties || [];
        
        // Handle incoming messages
        this.on('input', function(msg, send, done) {
            // Polyfill for Node-RED versions < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(err) { if (err) { node.error(err, msg); } };
            
            try {
                // Validate: Ensure vault-config node is configured
                if (!node.vaultConfig) {
                    const err = new Error('No vault-config node configured');
                    node.error(err.message, msg);
                    done(err);
                    return;
                }
                
                // Validate: Ensure at least one property is configured
                if (!node.properties || node.properties.length === 0) {
                    const err = new Error('No properties configured to retrieve');
                    node.error(err.message, msg);
                    done(err);
                    return;
                }
                
                // Process each configured property retrieval
                for (let i = 0; i < node.properties.length; i++) {
                    const prop = node.properties[i];
                    
                    // Validate: Ensure property configuration is complete
                    if (!prop.domain || !prop.property || !prop.output) {
                        const err = new Error('Invalid property configuration at index ' + i);
                        node.error(err.message, msg);
                        done(err);
                        return;
                    }
                    
                    // Step 1: Get all credentials for the specified domain
                    const domainCredentials = node.vaultConfig.getCredentialsForKey(prop.domain);
                    
                    if (domainCredentials === null) {
                        const err = new Error('Domain not found: ' + prop.domain);
                        node.error(err.message, msg);
                        done(err);
                        return;
                    }
                    
                    // Step 2: Check if the specific property exists in this domain
                    if (!domainCredentials.hasOwnProperty(prop.property)) {
                        const err = new Error('Property "' + prop.property + '" not found in domain: ' + prop.domain);
                        node.error(err.message, msg);
                        done(err);
                        return;
                    }
                    
                    // Step 3: Set the property value to the configured context
                    try {
                        const value = domainCredentials[prop.property];
                        
                        // Parse output format: "msg.username", "flow.apiKey", "global.dbHost"
                        const outputParts = prop.output.split('.');
                        
                        // Validate output format (must have at least context type and property name)
                        if (outputParts.length < 2) {
                            const err = new Error('Invalid output format "' + prop.output + '", expected format: msg.property or flow.property or global.property');
                            node.error(err.message, msg);
                            done(err);
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
                            const err = new Error('Invalid context type "' + contextType + '", must be msg, flow, or global');
                            node.error(err.message, msg);
                            done(err);
                            return;
                        }
                        
                    } catch (setErr) {
                        // Catch errors from setting properties (e.g., invalid property path)
                        const err = new Error('Failed to set property "' + prop.output + '": ' + setErr.message);
                        node.error(err.message, msg);
                        done(err);
                        return;
                    }
                }
                
                // All properties successfully retrieved and set - forward the message
                send(msg);
                done();
                
            } catch (err) {
                // Catch any unexpected errors to prevent Node-RED crashes
                node.error(err.message, msg);
                done(err);
            }
        });
    }
    
    // Register the runtime node
    RED.nodes.registerType('vault', VaultNode);
};

