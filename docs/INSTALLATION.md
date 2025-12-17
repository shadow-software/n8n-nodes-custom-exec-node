# Installation Guide

## Prerequisites

- n8n installed (Docker or npm)
- Node.js 18+ (if building locally)
- npm or pnpm

## Method 1: Docker Volume Mount (Recommended for Docker users)

1. **Build the node:**
   ```bash
   cd n8n-nodes-custom-exec-node
   npm install
   npm run build
   ```

2. **Add volume mount to docker-compose.yml:**
   ```yaml
   version: '3'
   services:
     n8n:
       image: n8nio/n8n
       ports:
         - "5678:5678"
       volumes:
         - n8n_data:/home/node/.n8n
         # Mount custom node
         - ./n8n-nodes-custom-exec-node/dist:/home/node/.n8n/custom
       environment:
         - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
   volumes:
     n8n_data:
   ```

3. **Restart n8n:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Verify installation:**
   - Open n8n (http://localhost:5678)
   - Search for "Custom Exec" in the node panel
   - The node should appear with a terminal icon

## Method 2: npm link (For local development)

1. **Build and link the node:**
   ```bash
   cd n8n-nodes-custom-exec-node
   npm install
   npm run build
   npm link
   ```

2. **Link to n8n's global modules:**
   ```bash
   cd ~/.n8n
   npm link n8n-nodes-custom-exec
   ```

3. **Restart n8n:**
   ```bash
   # If running via npm
   n8n start

   # If running via pm2
   pm2 restart n8n
   ```

## Method 3: Copy to n8n custom folder

1. **Build the node:**
   ```bash
   npm install
   npm run build
   ```

2. **Copy dist folder:**
   ```bash
   # For Docker
   docker cp dist/. <container_name>:/home/node/.n8n/custom/

   # For local installation
   cp -r dist/* ~/.n8n/custom/
   ```

3. **Restart n8n**

## Troubleshooting

### Node doesn't appear in n8n

1. Check n8n logs:
   ```bash
   docker logs <container_name>
   ```

2. Verify the node is in the custom folder:
   ```bash
   # Docker
   docker exec <container_name> ls -la /home/node/.n8n/custom/nodes/CustomExecNode/

   # Local
   ls -la ~/.n8n/custom/nodes/CustomExecNode/
   ```

3. Check package.json n8n configuration:
   ```json
   "n8n": {
     "n8nNodesApiVersion": 1,
     "nodes": [
       "dist/nodes/CustomExecNode/CustomExecNode.node.js"
     ]
   }
   ```

### Command execution fails

1. **Check working directory exists:**
   ```bash
   docker exec <container_name> ls -la /home/node/
   ```

2. **Check file permissions:**
   ```bash
   docker exec <container_name> ls -la /path/to/your/files
   ```

3. **Test command manually:**
   ```bash
   docker exec <container_name> bash -c "your command here"
   ```

### Templating not working

- Use `{{ $json.field }}` syntax (with spaces inside braces)
- Check that field exists in input data
- Enable "Return Full Output" to see stderr

## Updating the Node

1. **Make changes to the TypeScript file**
2. **Rebuild:**
   ```bash
   npm run build
   ```
3. **Restart n8n** (changes will be picked up automatically with volume mount)

## Security Notes

- This node executes arbitrary bash commands
- Only use in trusted environments
- Validate user input before passing to commands
- Consider running n8n in a sandboxed container
- Use environment variables for sensitive data (don't hardcode in commands)

## Next Steps

- Import the example workflow from `examples/ffmpeg-workflow.json`
- Customize the command for your use case
- Test with sample data before production use
