import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

// Forward to the new server entry point
// This file is kept temporarily so that running 'nodemon src/index.js' 
// won't crash for users who haven't restarted their terminal yet.
import './server.js';
