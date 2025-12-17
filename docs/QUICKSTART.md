# Quick Start Guide

Get the Custom Exec node running in n8n in under 5 minutes.

## Step 1: Build the Node

```bash
cd n8n-nodes-custom-exec-node
npm install
npm run build
```

You should see:
```
dist/
  nodes/
    CustomExecNode/
      CustomExecNode.node.js
      CustomExecNode.node.d.ts
```

## Step 2: Set Up n8n with Docker

### Option A: docker-compose.yml (Recommended)

Create a `docker-compose.yml` in your project directory:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=false
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - GENERIC_TIMEZONE=America/New_York
    volumes:
      - n8n_data:/home/node/.n8n
      # Mount the custom node
      - ./n8n-nodes-custom-exec-node/dist:/home/node/.n8n/custom
    restart: unless-stopped

volumes:
  n8n_data:
```

Start n8n:

```bash
docker-compose up -d
```

### Option B: Docker Run Command

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -v $(pwd)/n8n-nodes-custom-exec-node/dist:/home/node/.n8n/custom \
  n8nio/n8n:latest
```

## Step 3: Verify Installation

1. **Open n8n:** http://localhost:5678
2. **Create a new workflow**
3. **Search for "Custom Exec"** in the node panel
4. **You should see the node with a terminal icon**

## Step 4: Test with a Simple Command

### Create Your First Workflow

1. Add a **Manual Trigger** node
2. Add a **Set** node with this data:
   ```json
   {
     "name": "World"
   }
   ```
3. Add the **Custom Exec** node
4. Configure the command:
   ```bash
   echo "Hello {{ $json.name }}"
   ```
5. Execute the workflow
6. Check the output - you should see:
   ```json
   {
     "name": "World",
     "exec": {
       "command": "echo \"Hello World\"",
       "exitCode": 0,
       "output": "Hello World\n"
     }
   }
   ```

## Step 5: Test FFmpeg (Your Use Case)

### Prepare Test Files

1. **Create directories in the container:**
   ```bash
   docker exec n8n mkdir -p /home/node/input /home/node/output
   ```

2. **Copy a test image:**
   ```bash
   docker cp /path/to/your/image.png n8n:/home/node/input/test.png
   ```

### Create FFmpeg Workflow

1. **Import the example workflow:**
   - Go to Workflows → Import
   - Upload `examples/ffmpeg-workflow.json`

2. **Or create manually:**

   **Set Node Data:**
   ```json
   {
     "filename": "test",
     "title": "Hello n8n",
     "slug": "hello-n8n"
   }
   ```

   **Custom Exec Command:**
   ```bash
   ffmpeg -i /home/node/input/{{ $json.filename }}.png \
     -vf "drawtext=text='{{ $json.title }}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
     /home/node/output/{{ $json.slug }}.webp
   ```

3. **Execute the workflow**

4. **Verify the output:**
   ```bash
   docker exec n8n ls -la /home/node/output/
   ```

5. **Copy the result back:**
   ```bash
   docker cp n8n:/home/node/output/hello-n8n.webp ./
   ```

## Troubleshooting

### Node doesn't appear in n8n

**Check if the node is mounted:**
```bash
docker exec n8n ls -la /home/node/.n8n/custom/nodes/CustomExecNode/
```

**Check n8n logs:**
```bash
docker logs n8n
```

**Restart the container:**
```bash
docker restart n8n
```

### FFmpeg not found

**Install FFmpeg in the container:**
```bash
docker exec -u root n8n apk add ffmpeg
```

Or create a custom Dockerfile:

```dockerfile
FROM n8nio/n8n:latest

USER root
RUN apk add --no-cache ffmpeg imagemagick

USER node
```

Build and run:
```bash
docker build -t n8n-custom .
docker run -d --name n8n -p 5678:5678 \
  -v $(pwd)/n8n-nodes-custom-exec-node/dist:/home/node/.n8n/custom \
  n8n-custom
```

### Permission Issues

**Check file permissions:**
```bash
docker exec n8n ls -la /home/node/
```

**Fix ownership:**
```bash
docker exec -u root n8n chown -R node:node /home/node/input /home/node/output
```

### Command fails silently

**Enable "Return Full Output"** in the node settings to see stderr.

**Test the command manually:**
```bash
docker exec n8n bash -c "your command here"
```

## Next Steps

- Read `USAGE_EXAMPLES.md` for more command examples
- Check `INSTALLATION.md` for advanced setup options
- Review `README.md` for full documentation

## Common Commands Reference

### Container Management
```bash
# View logs
docker logs -f n8n

# Access container shell
docker exec -it n8n sh

# Restart container
docker restart n8n

# Stop and remove
docker-compose down

# Rebuild after code changes
npm run build && docker restart n8n
```

### File Operations
```bash
# List files
docker exec n8n ls -la /home/node/input/

# Copy to container
docker cp local-file.txt n8n:/home/node/input/

# Copy from container
docker cp n8n:/home/node/output/result.txt ./

# Create directory
docker exec n8n mkdir -p /home/node/my-folder
```

### Debugging
```bash
# Test command in container
docker exec n8n bash -c "echo test"

# Check environment
docker exec n8n env

# View disk usage
docker exec n8n df -h

# Check installed packages
docker exec n8n which ffmpeg
docker exec n8n ffmpeg -version
```

## Production Considerations

1. **Use environment variables** for sensitive data
2. **Set appropriate timeouts** (default: 60s)
3. **Monitor disk usage** when processing large files
4. **Use persistent volumes** for data storage
5. **Enable "Ignore Errors"** for optional operations
6. **Add logging** for audit trails
7. **Limit resource usage** with Docker constraints
8. **Backup n8n data** regularly

## Need Help?

- Check the logs: `docker logs n8n`
- Test commands manually: `docker exec n8n bash -c "command"`
- Review the examples in `USAGE_EXAMPLES.md`
- Open an issue on GitHub

Happy automating!
