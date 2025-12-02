module.exports = function(RED) {
    
    // Config node: vault-config
    // Stores multiple credentials as encrypted JSON in a single credential field
    function VaultConfigNode(config) {
        RED.nodes.createNode(this, config);
        
        this.name = config.name;
        this.storeObject = {};
        
        // Parse the encrypted credential store JSON
        if (this.credentials && this.credentials.store) {
            try {
                this.storeObject = JSON.parse(this.credentials.store);
            } catch (err) {
                this.error('Failed to parse vault store JSON: ' + err.message);
                this.storeObject = {};
            }
        }
        
        // Read-only accessor for runtime nodes to query credentials by key
        // Returns null if key is invalid or not found
        this.getCredentialsForKey = function(key) {
            if (typeof key !== 'string' || key === '') {
                return null;
            }
            
            const entry = this.storeObject[key];
            
            if (entry === undefined || entry === null) {
                return null;
            }
            
            // Entry must be an object to be valid
            if (typeof entry !== 'object') {
                return null;
            }
            
            return entry;
        };
    }
    
    RED.nodes.registerType('vault-config', VaultConfigNode, {
        credentials: {
            store: { type: 'text' }
        }
    });
    
    
    // Runtime node: vault
    // Retrieves credentials from vault-config by key
    function VaultNode(config) {
        RED.nodes.createNode(this, config);
        
        const node = this;
        
        // Get reference to vault-config node
        this.vaultConfig = RED.nodes.getNode(config.vault);
        this.defaultKey = config.defaultKey;
        
        // Handle incoming messages
        this.on('input', function(msg, send, done) {
            // Node-RED 1.0+ uses send/done, earlier versions use node.send
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(err) { if (err) { node.error(err, msg); } };
            
            try {
                // Determine the key to use
                let key = null;
                
                if (typeof msg.key === 'string' && msg.key !== '') {
                    key = msg.key;
                } else if (typeof node.defaultKey === 'string' && node.defaultKey !== '') {
                    key = node.defaultKey;
                } else {
                    const err = new Error('No key specified in msg.key or node configuration');
                    node.error(err.message, msg);
                    done(err);
                    return;
                }
                
                // Ensure vault-config node is configured
                if (!node.vaultConfig) {
                    const err = new Error('No vault-config node configured');
                    node.error(err.message, msg);
                    done(err);
                    return;
                }
                
                // Query vault for credentials
                const credentials = node.vaultConfig.getCredentialsForKey(key);
                
                if (credentials === null) {
                    const err = new Error('No credentials found for key: ' + key);
                    node.error(err.message, msg);
                    done(err);
                    return;
                }
                
                // Set credentials on message
                msg.credentials = credentials;
                
                send(msg);
                done();
            } catch (err) {
                // Catch unexpected errors to prevent Node-RED crashes
                node.error(err.message, msg);
                done(err);
            }
        });
    }
    
    RED.nodes.registerType('vault', VaultNode);
};

