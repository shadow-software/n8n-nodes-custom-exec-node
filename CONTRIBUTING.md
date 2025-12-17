# Contributing to n8n Custom Exec Node

First off, thank you for considering contributing to the n8n Custom Exec Node! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **n8n version**
- **Node version**
- **Operating system**
- **Screenshots** (if applicable)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to n8n users
- **List examples** of how it would be used

### Contributing Code

#### Good First Issues

Look for issues tagged with `good first issue` to get started.

#### What to Work On

- Bug fixes
- New command examples
- Documentation improvements
- Performance optimizations
- Test coverage improvements

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Docker (for testing)
- Git

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-custom-exec-node.git
   cd n8n-nodes-custom-exec-node
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/shadow-software/n8n-nodes-custom-exec-node.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Build the node**
   ```bash
   npm run build
   ```

6. **Test in n8n**
   ```bash
   npm run docker:start
   # Open http://localhost:5678
   ```

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/my-awesome-feature

# Make your changes
# Edit files in nodes/CustomExecNode/

# Build and test
npm run build
npm run docker:restart

# Test your changes in n8n
# Open http://localhost:5678 and test the node

# Commit your changes
git add .
git commit -m "Add awesome feature"

# Push to your fork
git push origin feature/my-awesome-feature
```

### Testing Your Changes

1. **Build the node**
   ```bash
   npm run build
   ```

2. **Verify dist folder**
   ```bash
   ls -la dist/nodes/CustomExecNode/
   # Should contain .js and .d.ts files
   ```

3. **Test in Docker**
   ```bash
   npm run docker:restart
   ```

4. **Manual testing**
   - Open http://localhost:5678
   - Create a workflow
   - Add Custom Exec node
   - Test your changes

## Pull Request Process

### Before Submitting

- [ ] Build succeeds (`npm run build`)
- [ ] Tested in n8n container
- [ ] Documentation updated (if needed)
- [ ] Examples added (if adding features)
- [ ] Code follows style guide

### Submitting

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/my-awesome-feature
   ```

3. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill in the PR template

### PR Title Format

Use conventional commits format:

- `feat: Add environment variable support`
- `fix: Correct timeout handling`
- `docs: Update installation guide`
- `chore: Update dependencies`
- `refactor: Improve error handling`

### PR Description

Include:
- **What** - What does this PR do?
- **Why** - Why is this change needed?
- **How** - How does it work?
- **Testing** - How was it tested?
- **Screenshots** - If UI changes

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be in the next release!

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Follow existing code style
- Add types for all parameters
- Document complex logic

### Node Structure

```typescript
// Good
export class CustomExecNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom Exec',
		name: 'customExecNode',
		// ...
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Implementation
	}
}
```

### Error Handling

```typescript
// Good - Use NodeOperationError
throw new NodeOperationError(
	this.getNode(),
	'Command failed',
	{
		itemIndex,
		description: 'Additional context',
	}
);

// Bad - Don't use generic errors
throw new Error('Something went wrong');
```

### Comments

```typescript
// Good - Explain why, not what
// Use environment variables instead of process.env to support custom vars
const env = { ...process.env, ...customEnv };

// Bad - State the obvious
// Create env variable
const env = { ...process.env };
```

## Documentation

### When to Update Docs

Update documentation when you:
- Add new features
- Change existing behavior
- Fix bugs that affect usage
- Add new examples

### Documentation Files

- **README.md** - Main project overview
- **docs/USAGE_EXAMPLES.md** - Add new command examples
- **docs/QUICKSTART.md** - Update setup steps
- **docs/INSTALLATION.md** - Update install instructions

### Example Documentation

When adding a new example:

```markdown
### My New Feature

**Description:** Brief explanation

**Input:**
```json
{
  "field": "value"
}
```

**Command:**
```bash
command {{ $json.field }}
```

**Output:**
```json
{
  "exec": {
    "output": "result"
  }
}
```
```

## Commit Messages

### Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

### Examples

```
feat(node): Add environment variable support

Added ability to pass custom environment variables to commands.
Users can now configure env vars in the node settings.

Closes #123
```

```
fix(timeout): Correct timeout handling

Fixed issue where timeout wasn't properly applied to exec commands.
Commands now properly terminate after configured timeout.

Fixes #456
```

## Questions?

- **GitHub Issues:** [Ask a question](https://github.com/shadow-software/n8n-nodes-custom-exec-node/issues/new)
- **Email:** [hello@shadowsoftware.com](mailto:hello@shadowsoftware.com)

## Recognition

Contributors will be:
- Listed in GitHub contributors
- Mentioned in release notes
- Credited in documentation (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!** 🚀

Built with ❤️ by [Shadow Software LLC](https://shadowsoftware.com)
