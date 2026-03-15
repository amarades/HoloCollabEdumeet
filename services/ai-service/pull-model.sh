#!/bin/bash

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama server at $OLLAMA_BASE_URL..."
until curl -s "$OLLAMA_BASE_URL/api/tags" > /dev/null; do
  sleep 2
done

echo "✅ Ollama is up! Pulling model llama3.2:1b (~1.3GB)..."
curl -X POST "$OLLAMA_BASE_URL/api/pull" -d '{"name": "llama3.2:1b"}'

echo "🎉 Model pulled successfully!"
