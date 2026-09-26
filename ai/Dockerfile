FROM ollama/ollama:latest

# Pre-pull the llama3.2:1b model so the image is self-contained.
# We start the Ollama daemmon in the background just long enough to pull,
# then shut it down before exiting the build layer.
RUN ollama serve & \
    SERVER=$! ; \
    sleep 8 ; \
    ollama pull llama3.2:1b ; \
    kill $SERVER ; \
    wait $SERVER 2>/dev/null || true

ENV OLLAMA_HOST=0.0.0.0:11434

EXPOSE 11434
