# ITUS Bank — AI Service

A thin wrapper around the official **[Ollama](https://ollama.com)** Docker
image that **pre-pulls the `llama3.2:1b` model at image-build time**, so the
service is self-contained and starts ready to answer prompts.

## Why a custom image?

The vanilla `ollama/ollama:latest` image ships with no models. You'd have
to run `docker exec bankapp-ollama ollama pull llama3.2:1b` after every
fresh container start, or rely on a volume that may not exist on the
first deploy. By baking the model into a build layer, this works:

```bash
docker compose up -d --build
# → first start: backend can immediately call the AI
```

## Model

| Setting   | Value                              |
|-----------|------------------------------------|
| Model     | `llama3.2:1b` (Meta Llama 3.2, 1B params) |
| Size      | ~1.3 GB                                  |
| Why       | Small enough to run on CPU, dramatically better at chat than tinyllama. Bump to `llama3.2:3b` for higher quality if you have the RAM. |

The model the backend uses is configured at
`backend/src/main/resources/application.properties`:

```properties
ollama.model=llama3.2:1b
```

If you change this, the AI Dockerfile here must pull the same model.

## Build

```bash
cd ai
docker build -t itus-ai .
```

The build:

1. Starts the Ollama daemon in the background.
2. `ollama pull llama3.2:1b` (downloads ~1.3 GB).
3. Stops the daemon.
4. The pulled model lives in the `/root/.ollama` layer.

Expect the first build to take **3–5 minutes** depending on bandwidth.
Subsequent builds reuse the cached layer.

## Run standalone

```bash
docker run -p 11434:11434 itus-ai
# Then in another shell:
curl http://localhost:11434/api/tags
```

## Swapping the model

To use a different model (say `llama3.2:1b`):

1. **`ai/Dockerfile`** — change the `ollama pull` line:
   ```dockerfile
   RUN ollama serve & \
       SERVER=$! ; sleep 8 ; \
       ollama pull llama3.2:1b ; \
       kill $SERVER ; \
       wait $SERVER 2>/dev/null || true
   ```
2. **`backend/src/main/resources/application.properties`**:
   ```properties
   ollama.model=llama3.2:1b
   ```
3. Rebuild:
   ```bash
   docker compose up -d --build ollama backend
   ```

Choose any tag from <https://ollama.com/library>. Larger models give
better answers but use more RAM and run slower on CPU.

## Volume

The compose file mounts a named volume at `/root/.ollama` so any
**additional** models pulled at runtime survive container restarts.
The baked-in `llama3.2:1b` lives in the image layer either way.

## How the backend calls it

`backend/src/main/java/com/bankapp/service/ChatService.java` POSTs to:

```
POST http://ollama:11434/api/generate
{
  "model": "llama3.2:1b",
  "prompt": "<system + user prompt>",
  "stream": false
}
```

Inside the compose network the service is `http://ollama:11434`. On the
host it's mapped to `http://localhost:11436`.

## Troubleshooting

```bash
# What models are loaded?
docker exec bankapp-ollama ollama list

# Watch the daemon logs
docker compose logs -f ollama

# If the pull failed during build (network blip), force-rebuild
docker compose build --no-cache ollama

# If AI replies "unavailable", check that backend can reach ollama
docker exec bankapp-backend wget -qO- http://ollama:11434/api/tags
```
