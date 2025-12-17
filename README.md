# n8n Custom Exec Node

<div align="center">

[![npm version](https://badge.fury.io/js/n8n-nodes-custom-exec.svg)](https://www.npmjs.com/package/n8n-nodes-custom-exec)
[![Build Status](https://github.com/shadow-software/n8n-nodes-custom-exec-node/workflows/Build%20and%20Test/badge.svg)](https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dt/n8n-nodes-custom-exec.svg)](https://www.npmjs.com/package/n8n-nodes-custom-exec)
[![GitHub stars](https://img.shields.io/github/stars/shadow-software/n8n-nodes-custom-exec-node.svg?style=social&label=Star)](https://github.com/shadow-software/n8n-nodes-custom-exec-node)

**Execute bash commands and scripts directly inside your n8n v2 container with full templating support.**

Restore the power of command-line automation that was removed in n8n v2.

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples) • [Support](#-support)

---

### Built by Shadow Software LLC

[![Shadow Software](https://shadowsoftware.com/assets/images/logo-banner.webp)](https://shadowsoftware.com)

**Professional n8n Development & AI Automation Services**

We specialize in building custom n8n nodes, workflows, and AI-driven solutions:
- 🤖 **AI-Driven SEO** - Automated content optimization and ranking strategies
- 📧 **Cold Email Automation** - Intelligent outreach campaigns with n8n
- 💻 **Application Development** - Custom n8n nodes and workflow solutions
- 🔧 **n8n Consulting** - Expert workflow design and optimization

[**Visit shadowsoftware.com**](https://shadowsoftware.com) to learn more about our services.

---

</div>

## 🎯 Why This Node?

n8n v2 removed the built-in Execute Command node for security reasons, leaving many users unable to:
- Process media files with FFmpeg
- Run shell scripts for data transformation
- Execute command-line tools in workflows
- Integrate with system utilities

**This custom node brings back that power** in a controlled, Docker-isolated environment with modern templating support.

## ✨ Features

- **🚀 Execute Any Bash Command** - Run shell commands directly in your n8n container
- **📝 Full Templating Support** - Use `{{ $json.field }}` to inject dynamic data from your workflow
- **⚙️ Environment Variables** - Securely pass sensitive data without hardcoding
- **⏱️ Configurable Timeouts** - Set execution limits to prevent hanging processes
- **🔒 Error Handling** - Optional ignore-errors mode for fault-tolerant workflows
- **📊 Detailed Output** - Capture stdout, stderr, and exit codes
- **🎬 FFmpeg Ready** - Perfect for media processing workflows
- **🐳 Docker Isolated** - Runs safely inside your n8n container

## 📦 Installation

### npm (Recommended)

```bash
npm install n8n-nodes-custom-exec
```

Then restart n8n. The node will appear as **"Custom Exec"** in your node panel.

### Docker Volume Mount

```yaml
volumes:
  - ./n8n-nodes-custom-exec/dist:/home/node/.n8n/custom
```

See [Installation Guide](docs/INSTALLATION.md) for detailed setup instructions.

## 🚀 Quick Start

### 1. Basic Example

**Input JSON:**
```json
{
  "name": "World",
  "count": 42
}
```

**Command:**
```bash
echo "Hello {{ $json.name }}! Count: {{ $json.count }}"
```

**Output:**
```json
{
  "name": "World",
  "count": 42,
  "exec": {
    "command": "echo \"Hello World! Count: 42\"",
    "exitCode": 0,
    "output": "Hello World! Count: 42\n"
  }
}
```

### 2. FFmpeg Media Processing

Transform images with dynamic text overlays:

**Input:**
```json
{
  "filename": "product-001",
  "title": "SALE 50% OFF",
  "slug": "sale-50-off"
}
```

**Command:**
```bash
ffmpeg -i /home/node/input/{{ $json.filename }}.png \
  -vf "drawtext=text='{{ $json.title }}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=70:fontcolor=#FFDE21:x=(w-text_w)/2:y=(h-text_h)/2" \
  /home/node/output/{{ $json.slug }}.webp
```

### 3. File Processing

**Command:**
```bash
# Create directory and process files
mkdir -p /home/node/output/{{ $json.slug }} && \
  convert {{ $json.image }} -resize 800x600 /home/node/output/{{ $json.slug }}/thumb.jpg && \
  echo "Processed {{ $json.filename }}" > /home/node/output/{{ $json.slug }}/status.txt
```

## 📚 Documentation

Comprehensive guides for every use case:

### Getting Started
- **[Quick Start Guide](docs/QUICKSTART.md)** - Get running in 5 minutes
- **[Installation Instructions](docs/INSTALLATION.md)** - Detailed setup for Docker and npm
- **[Project Overview](docs/PROJECT_SUMMARY.md)** - Architecture and design decisions

### Using the Node
- **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Real-world command examples
  - FFmpeg media processing
  - Image manipulation
  - File operations
  - Data transformation
  - Python scripts
  - Batch processing

### Development & Publishing
- **[Publishing Guide](docs/PUBLISHING.md)** - How to publish to npm
- **[Release Checklist](docs/RELEASE_CHECKLIST.md)** - Quick reference for releases
- **[Setup Complete](docs/SETUP_COMPLETE.md)** - GitHub Actions configuration

## 💡 Examples

### Batch Image Conversion

```bash
for file in /home/node/input/*.jpg; do
  filename=$(basename "$file" .jpg)
  ffmpeg -i "$file" -quality 85 "/home/node/output/${filename}.webp"
done
```

### CSV to JSON

```bash
python3 -c "import csv, json; \
  data = list(csv.DictReader(open('/home/node/data/{{ $json.csvFile }}.csv'))); \
  json.dump(data, open('/home/node/output/{{ $json.outputName }}.json', 'w'), indent=2)"
```

### PDF Generation

```bash
echo "<h1>{{ $json.title }}</h1><p>{{ $json.content }}</p>" | \
  wkhtmltopdf - /home/node/pdfs/{{ $json.filename }}.pdf
```

### Conditional Processing

```bash
if [ "{{ $json.type }}" = "video" ]; then
  ffmpeg -i /home/node/input/{{ $json.file }} -vf scale=1280:720 /home/node/output/{{ $json.file }}
else
  cp /home/node/input/{{ $json.file }} /home/node/output/
fi
```

See [Usage Examples](docs/USAGE_EXAMPLES.md) for 20+ more examples.

## 🎬 Use Cases

Perfect for n8n users who need:

### Media Processing
- Add watermarks to images
- Convert video formats
- Extract audio from video
- Generate thumbnails
- Batch resize images

### Data Transformation
- CSV/JSON conversion
- PDF generation
- File compression
- Format transformations
- Data validation

### System Automation
- File management
- Backup operations
- Log processing
- Cleanup tasks
- Monitoring scripts

### Integration
- Call external APIs with curl
- Run Python/Ruby scripts
- Execute custom tools
- Process command output
- Chain multiple commands

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Command | - | Bash command to execute |
| Working Directory | `/home/node` | Command execution directory |
| Timeout | 60000ms | Maximum execution time |
| Ignore Errors | false | Continue workflow on command failure |
| Environment Variables | - | Custom env vars for the command |
| Return Full Output | false | Include both stdout and stderr |

## 🔒 Security

- Runs inside Docker container (isolated environment)
- No network access by default
- Configurable timeout prevents infinite loops
- Use environment variables for secrets
- Validate user input before passing to commands

## 🛠️ Development

### Build from Source

```bash
git clone https://github.com/shadow-software/n8n-nodes-custom-exec-node.git
cd n8n-nodes-custom-exec-node
npm install
npm run build
```

### Test Locally

```bash
npm run docker:start
# Open http://localhost:5678
# Search for "Custom Exec" node
```

### Helpful Scripts

```bash
npm run build          # Build TypeScript
npm run dev            # Watch mode
npm run docker:start   # Start n8n
npm run docker:logs    # View logs
npm run docker:ffmpeg  # Start with FFmpeg installed
```

## 📦 Package Info

- **Package Name:** `n8n-nodes-custom-exec`
- **Repository:** [github.com/shadow-software/n8n-nodes-custom-exec-node](https://github.com/shadow-software/n8n-nodes-custom-exec-node)
- **npm Registry:** [npmjs.com/package/n8n-nodes-custom-exec](https://www.npmjs.com/package/n8n-nodes-custom-exec)
- **License:** MIT
- **Size:** ~5 KB (minified)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v1.0.0 (2025-12-17)
- Initial release
- Execute bash commands with templating
- Environment variable support
- Configurable timeout and error handling
- Full stdout/stderr capture

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/shadow-software/n8n-nodes-custom-exec-node/issues)
- **Email:** [hello@shadowsoftware.com](mailto:hello@shadowsoftware.com)
- **Website:** [shadowsoftware.com](https://shadowsoftware.com)

## 🌟 Show Your Support

If this node helped you, please give it a ⭐️ on [GitHub](https://github.com/shadow-software/n8n-nodes-custom-exec-node)!

---

## 🚀 Need Custom n8n Solutions?

**Shadow Software LLC** builds production-ready n8n workflows and custom nodes for businesses.

### Our Services

🤖 **AI-Driven SEO Automation**
- Automated content optimization
- Keyword research and analysis
- Rank tracking and reporting
- Content generation workflows

📧 **Cold Email Campaigns**
- Intelligent lead generation
- Personalized outreach at scale
- Response tracking and analytics
- A/B testing automation

💻 **Custom Application Development**
- n8n node development
- Workflow automation consulting
- API integration services
- Database design and optimization

🎯 **n8n Expertise**
- Custom node development
- Complex workflow design
- Performance optimization
- Training and support

### Why Choose Shadow Software?

- ✅ Specialized in n8n automation
- ✅ AI-first development approach
- ✅ Production-ready solutions
- ✅ Ongoing support and maintenance
- ✅ Transparent pricing

**Ready to automate your business?**

👉 [**Visit shadowsoftware.com**](https://shadowsoftware.com) or email [hello@shadowsoftware.com](mailto:hello@shadowsoftware.com)

---

<div align="center">

**Built with ❤️ by [Shadow Software LLC](https://shadowsoftware.com)**

[![Shadow Software](https://img.shields.io/badge/Shadow%20Software-Professional%20n8n%20Development-blue)](https://shadowsoftware.com)

[Website](https://shadowsoftware.com) • [GitHub](https://github.com/shadow-software) • [Email](mailto:hello@shadowsoftware.com)

</div>

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright © 2025 Shadow Software LLC
