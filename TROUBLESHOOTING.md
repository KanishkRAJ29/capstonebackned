# PayBand Backend Troubleshooting Guide

## Common Issues and Solutions

### 404 Not Found Errors

If you're getting 404 errors when making API requests:

1. **Check the API endpoint URL**
   - Make sure you're using the correct URL format: `http://localhost:5000/api/[route]`
   - All API endpoints should start with `/api/`

2. **Verify the route exists**
   - Check the routes defined in the `routes` directory
   - Make sure the route is properly registered in `server.js`

3. **Check server logs**
   - The server logs all requests and will show 404 errors
   - Look for messages like `404 Not Found: GET /api/some/route`

4. **Use the health check endpoint**
   - Try accessing `http://localhost:5000/api/health`
   - If this works, the server is running but your specific route might be missing

### Connection Refused Errors

If you're getting "Connection Refused" errors:

1. **Check if the server is running**
   - Run `npm run dev` in the backend directory
   - Look for the message "Server running on port 5000"

2. **Verify the port**
   - Make sure the server is running on the expected port (default: 5000)
   - Check if another application is using the same port

3. **Check frontend configuration**
   - Verify that `NEXT_PUBLIC_API_URL` in the frontend `.env` file is set correctly
   - It should be `http://localhost:5000` (or your custom server URL)

### Authentication Errors

If you're getting 401 Unauthorized errors:

1. **Check your token**
   - Make sure you're logged in
   - The token might be expired or invalid

2. **Verify the JWT secret**
   - Make sure `JWT_SECRET` is set correctly in the backend `.env` file

3. **Check the Authorization header**
   - The header should be in the format `Bearer [token]`

### MongoDB Connection Errors

If the server fails to connect to MongoDB:

1. **Check if MongoDB is running**
   - For local development, make sure MongoDB is installed and running
   - Run `mongod` to start the MongoDB server

2. **Verify the connection string**
   - Check the `MONGO_URI` in the backend `.env` file
   - For local development, it should be `mongodb://localhost:27017/payband`

3. **Check network connectivity**
   - If using a remote MongoDB instance, make sure your network allows the connection

## Debugging Tips

1. **Enable verbose logging**
   - Set `DEBUG=express:*` before starting the server for detailed Express logs
   - Example: `DEBUG=express:* npm run dev`

2. **Check request/response in the browser**
   - Use the Network tab in browser DevTools to inspect API requests
   - Look for status codes, request headers, and response data

3. **Test API endpoints with Postman or curl**
   - Use tools like Postman to test API endpoints directly
   - This helps isolate frontend vs. backend issues

4. **Restart the server**
   - Sometimes simply restarting the server resolves issues
   - Use `Ctrl+C` to stop the server, then run `npm run dev` again

## Getting Help

If you're still experiencing issues:

1. Check the project documentation
2. Look for similar issues in the project repository
3. Reach out to the development team with:
   - A clear description of the issue
   - Steps to reproduce
   - Error messages and logs
   - Your environment details (OS, Node.js version, etc.)
