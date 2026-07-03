#!/bin/bash
cd "$(dirname "$0")"

# Start the PHP server in the background (port 8080 since 8000 is taken by Docker)
php -S localhost:8080 &
SERVER_PID=$!

# Wait until the server is actually accepting connections on port 8080
until nc -z localhost 8080 2>/dev/null; do
  sleep 0.5
done

# Server is ready -> open the browser
open "http://localhost:8080"

# Keep the script alive with the server process (Ctrl+C to stop)
wait $SERVER_PID
