// Import necessary modules and dependencies
// Express framework for creating the api
import express from 'express';
// function to manage files and directories since the node.js api
import path from 'path';
// function to have access to the directory or file path
import { fileURLToPath } from 'url';
// Middleware to handle body request
import bodyParser from 'body-parser';
// Middleware to cross origins request
import cors from 'cors';
// Middleware for logging HTTP requests
import morgan from 'morgan';
// Function to test database connection
import { testConnection } from './libraries/DBConnection.js';
// Import the IP address and port from the network configuration module
import { theIPAddress, port } from './libraries/netConfig.js';

// Create the API with Express.js
const api = express();

// -----------------------------------------------------------------------------
// Use Middlewares
// -----------------------------------------------------------------------------

// HTTP request logger middleware
api.use(morgan('dev'));

// Middleware to parse URL-encoded data
api.use(express.urlencoded({ extended: false }));
// Middleware to parse JSON data
api.use(express.json());
// Middleware for parsing JSON bodies
api.use(bodyParser.json());

// Static files path
// Store in the constant the project dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Immediately Invoked Function Expression (IIFE) to run the server
(async () => {
  // Await the api to start listening on the specified IP address and port
  const createApi = await api.listen(port, theIPAddress, (req, res) => {
    // Log the server start information to the console
    console.log(`Server on port http://${theIPAddress}:${port}`);
  });
})();

// Test database connection
// Call the function to ensure the database connection is working
testConnection();

// Export the API for the use in other files
export default api;
