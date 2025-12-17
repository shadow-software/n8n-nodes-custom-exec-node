# Documentation Index

Complete documentation for the n8n Custom Exec Node.

## 📚 Table of Contents

### Getting Started

**[Quick Start Guide](QUICKSTART.md)**
- 5-minute setup guide
- Basic examples
- Docker configuration
- Troubleshooting common issues

**[Installation Instructions](INSTALLATION.md)**
- Docker volume mount method
- npm installation
- Local development setup
- Verification steps

**[Project Overview](PROJECT_SUMMARY.md)**
- Architecture and design
- Feature overview
- File structure
- Development workflow

### Using the Node

**[Usage Examples](USAGE_EXAMPLES.md)**
- 20+ real-world examples
- FFmpeg media processing
- Data transformation
- File operations
- Advanced patterns
- Debugging tips

### Development & Publishing

**[Publishing Guide](PUBLISHING.md)**
- npm publishing process
- GitHub Actions setup
- Version management
- Troubleshooting

**[Release Checklist](RELEASE_CHECKLIST.md)**
- Pre-release verification
- Version bumping
- Publishing steps
- Post-release checks

**[Setup Complete](SETUP_COMPLETE.md)**
- GitHub Actions configuration
- Automated publishing
- Workflow behavior
- Monitoring

## 🎯 Quick Navigation

### I want to...

**Install the node**
→ [Installation Instructions](INSTALLATION.md)

**Get started quickly**
→ [Quick Start Guide](QUICKSTART.md)

**See command examples**
→ [Usage Examples](USAGE_EXAMPLES.md)

**Understand the architecture**
→ [Project Overview](PROJECT_SUMMARY.md)

**Publish to npm**
→ [Publishing Guide](PUBLISHING.md)

**Make a release**
→ [Release Checklist](RELEASE_CHECKLIST.md)

## 📖 Documentation by Topic

### Installation & Setup
- [Installation Instructions](INSTALLATION.md) - Complete installation guide
- [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes
- [Setup Complete](SETUP_COMPLETE.md) - GitHub Actions configuration

### Usage & Examples
- [Usage Examples](USAGE_EXAMPLES.md) - 20+ real-world command examples
- [Quick Start Guide](QUICKSTART.md#test-ffmpeg-your-use-case) - FFmpeg examples

### Development
- [Project Overview](PROJECT_SUMMARY.md) - Architecture and design
- [Publishing Guide](PUBLISHING.md) - npm publishing process
- [Release Checklist](RELEASE_CHECKLIST.md) - Quick release reference

## 🔗 External Resources

- [Main README](../README.md) - Project overview and features
- [npm Package](https://www.npmjs.com/package/n8n-nodes-custom-exec)
- [GitHub Repository](https://github.com/shadow-software/n8n-nodes-custom-exec-node)
- [Shadow Software Website](https://shadowsoftware.com)

## 💡 Common Questions

### Can I use this in production?
Yes! The node is production-ready and follows n8n best practices.

### Is it safe to execute arbitrary commands?
The node runs inside a Docker container, isolated from your host system. Always validate user input before passing to commands.

### What if I need FFmpeg?
Use the `docker-compose.ffmpeg.yml` setup which includes FFmpeg pre-installed. See [Quick Start Guide](QUICKSTART.md#step-5-test-ffmpeg-your-use-case).

### How do I handle secrets?
Use environment variables instead of hardcoding credentials. See [Usage Examples](USAGE_EXAMPLES.md#3-using-environment-variables).

### Can I run Python/Ruby scripts?
Yes! The node can execute any command available in the container. See [Usage Examples](USAGE_EXAMPLES.md#1-csv-to-json-conversion).

## 📝 Contributing

Found an error in the docs? Want to add an example?

1. Edit the relevant markdown file
2. Submit a pull request
3. We'll review and merge

## 📧 Support

Need help? Have questions?

- **GitHub Issues:** [Report a bug or request a feature](https://github.com/shadow-software/n8n-nodes-custom-exec-node/issues)
- **Email:** [hello@shadowsoftware.com](mailto:hello@shadowsoftware.com)
- **Website:** [shadowsoftware.com](https://shadowsoftware.com)

---

**Built with ❤️ by [Shadow Software LLC](https://shadowsoftware.com)**
