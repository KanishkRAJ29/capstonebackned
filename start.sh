#!/bin/bash

echo "Starting PayBand Backend Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run setup script
echo "Running setup script..."
npm run setup

# Check if MongoDB is running
echo "Checking MongoDB connection..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Please make sure MongoDB is running and the connection string is correct in .env');
    process.exit(1);
  });
"

# Start the server
if [ $? -eq 0 ]; then
    echo "Starting server..."
    npm run dev
else
    echo "MongoDB connection failed. Please fix the issues and try again."
    exit 1
fi
