# n8n Custom Exec Node - Project Summary

## What This Is

A production-ready custom n8n node that executes bash commands inside the n8n Docker container with full templating support. This replaces the Execute Command node that was removed in n8n v2.

## Why It Exists

n8n v2 removed the built-in Execute Command node for security reasons. This custom node brings back that functionality in a controlled way, specifically designed for:

- Running FFmpeg commands for media processing
- File operations and transformations
- Shell script execution
- Integration with command-line tools

## Project Structure

```
n8n-nodes-custom-exec-node/
├── nodes/
│   └── CustomExecNode/
│       └── CustomExecNode.node.ts    # Main node implementation
├── dist/                              # Built files (generated)
│   └── nodes/
│       └── CustomExecNode/
│           ├── CustomExecNode.node.js
│           └── CustomExecNode.node.d.ts
├── examples/
│   └── ffmpeg-workflow.json          # Example workflow
├── data/                              # File processing directories
│   ├── input/
│   ├── output/
│   └── temp/
├── docker-compose.yml                 # Basic n8n setup
├── docker-compose.ffmpeg.yml          # n8n with FFmpeg pre-installed
├── Dockerfile.ffmpeg                  # Custom image with media tools
├── package.json                       # Node package config
├── tsconfig.json                      # TypeScript config
├── gulpfile.js                        # Build tasks
├── README.md                          # Main documentation
├── QUICKSTART.md                      # 5-minute setup guide
├── INSTALLATION.md                    # Detailed install instructions
├── USAGE_EXAMPLES.md                  # Command examples
└── PROJECT_SUMMARY.md                 # This file
```

## Features

### Core Functionality
- Execute arbitrary bash commands
- Full n8n expression support: `{{ $json.field }}`
- Configurable working directory
- Customizable timeout (default: 60s)
- Environment variable support
- Error handling with ignore-errors mode

### Output Options
- Standard mode: Returns stdout in `exec.output`
- Full output mode: Returns both stdout and stderr separately
- Exit code always included
- Original input data preserved

### Security Features
- Runs inside Docker container (isolated)
- No network access by default
- Configurable timeout to prevent hanging
- Error messages include command details
- Optional error suppression for fault tolerance

## Quick Reference

### Installation (3 steps)

```bash
# 1. Build the node
npm install && npm run build

# 2. Start n8n with the custom node
docker-compose up -d

# 3. Verify in n8n UI
# Open http://localhost:5678
# Search for "Custom Exec" node
```

### Basic Usage

**Input JSON:**
```json
{
  "filename": "photo-001",
  "title": "Special Offer"
}
```

**Command:**
```bash
echo "Processing {{ $json.filename }} with title: {{ $json.title }}"
```

**Output:**
```json
{
  "filename": "photo-001",
  "title": "Special Offer",
  "exec": {
    "command": "echo \"Processing photo-001 with title: Special Offer\"",
    "exitCode": 0,
    "output": "Processing photo-001 with title: Special Offer\n"
  }
}
```

### FFmpeg Example (Your Use Case)

**Command:**
```bash
ffmpeg -i /home/node/input/{{ $json.filename }}.png \
  -vf "drawtext=text='{{ $json.title }}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  /home/node/output/{{ $json.slug }}.webp
```

This will:
1. Read image from `/home/node/input/{filename}.png`
2. Add text overlay with `{title}`
3. Save as WebP to `/home/node/output/{slug}.webp`

## Development Workflow

### Make Changes
```bash
# Edit the TypeScript file
code nodes/CustomExecNode/CustomExecNode.node.ts

# Rebuild
npm run build

# Restart n8n (changes applied automatically)
docker restart n8n
```

### Add New Features
1. Modify `CustomExecNode.node.ts`
2. Update properties in `description.properties`
3. Handle new parameters in `execute()` method
4. Rebuild and test

### Testing
```bash
# Test command manually in container
docker exec n8n bash -c "your command here"

# View logs
docker logs -f n8n

# Check mounted files
docker exec n8n ls -la /home/node/.n8n/custom/
```

## Common Use Cases

### 1. Media Processing
- Add watermarks to images
- Convert video formats
- Extract audio from video
- Generate thumbnails
- Batch resize images

### 2. File Operations
- Compress/decompress archives
- PDF generation
- CSV to JSON conversion
- File format transformations

### 3. Data Processing
- Run Python scripts
- Execute shell scripts
- Call API endpoints with curl
- Process data with awk/sed

### 4. System Operations
- Directory management
- File cleanup
- Log rotation
- Backup operations

## Docker Setup Options

### Option 1: Basic Setup (docker-compose.yml)
- Standard n8n image
- Custom exec node mounted
- No additional tools
- Lightweight and fast

**Use when:** You only need basic shell commands

### Option 2: FFmpeg Setup (docker-compose.ffmpeg.yml)
- Custom image with FFmpeg installed
- ImageMagick included
- Python 3 available
- Common fonts for text overlays
- File processing directories mounted

**Use when:** You need media processing, image manipulation, or Python

### Start with FFmpeg setup:
```bash
docker-compose -f docker-compose.ffmpeg.yml up -d
```

## Templating Syntax

The node supports n8n expressions:

| Syntax | Example | Result |
|--------|---------|--------|
| `{{ $json.field }}` | `{{ $json.name }}` | Value of `name` field |
| `$json.field` | `$json.index` | Shorthand syntax |
| Multiple fields | `{{ $json.first }}-{{ $json.last }}` | Concatenated values |

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Command | - | Bash command to execute |
| Working Directory | /home/node | Where command runs |
| Timeout | 60000ms | Max execution time |
| Ignore Errors | false | Continue on failure |
| Environment Variables | {} | Custom env vars |
| Return Full Output | false | Show stdout + stderr |

## Troubleshooting

### Node doesn't appear
- Check: `docker exec n8n ls -la /home/node/.n8n/custom/`
- Fix: Verify volume mount in docker-compose.yml
- Restart: `docker restart n8n`

### Command fails
- Test manually: `docker exec n8n bash -c "command"`
- Enable: "Return Full Output" to see stderr
- Check: Working directory exists
- Verify: File permissions

### FFmpeg not found
- Use: `docker-compose.ffmpeg.yml` instead
- Or install: `docker exec -u root n8n apk add ffmpeg`

### Timeout errors
- Increase: Timeout setting (default 60s)
- Check: Command isn't hanging
- Test: Run command manually first

## Security Considerations

1. **Input Validation**
   - Never pass unsanitized user input to shell
   - Use fixed templates with known fields

2. **Resource Limits**
   - Set appropriate timeouts
   - Monitor disk usage
   - Limit container resources

3. **Access Control**
   - Run in isolated container
   - Use read-only mounts where possible
   - Restrict network access

4. **Secrets Management**
   - Use environment variables
   - Don't hardcode credentials
   - Enable n8n's credential system

## Performance Tips

1. **Increase timeout** for long operations
2. **Process in batches** for large datasets
3. **Use temp directories** for intermediate files
4. **Clean up after processing** to save disk space
5. **Monitor container resources** during media processing

## Next Steps

1. **Read QUICKSTART.md** - Get running in 5 minutes
2. **Try examples/** - Import sample workflows
3. **Check USAGE_EXAMPLES.md** - See real-world commands
4. **Review INSTALLATION.md** - Advanced setup options

## Support

- **Logs:** `docker logs n8n`
- **Shell access:** `docker exec -it n8n sh`
- **Test commands:** `docker exec n8n bash -c "command"`
- **Documentation:** See README.md and other guides

## License

MIT

## Credits

Built to restore Execute Command functionality in n8n v2 with improved templating and Docker integration.

---

**Ready to start?** Run `docker-compose up -d` and open http://localhost:5678
