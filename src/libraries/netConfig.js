// Import the 'os' module to interact with the operating system
import os from 'os';

// Import the configuration object from the config file
import { config } from "../config/config.js";

// Export the obtained IP address for use in other parts of the application
export const theIPAddress = '0.0.0.0';

// Export the port from the configuration, defaulting to 3333 if not set
export const port = config.apiPort || 3333;
