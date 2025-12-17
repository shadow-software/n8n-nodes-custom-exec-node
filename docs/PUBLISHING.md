# Publishing to npm

This guide explains how to publish the n8n Custom Exec node to npm, both manually and automatically via GitHub Actions.

## Prerequisites

### 1. npm Account
```bash
npm login
```

If you don't have an account, create one at https://www.npmjs.com/signup

### 2. GitHub Repository
The repository is already set up at: https://github.com/shadow-software/n8n-nodes-custom-exec-node

### 3. npm Token (for GitHub Actions)
```bash
# Create an Automation token
npm token create
```

Copy the token and add it to GitHub:
1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: paste your npm token
5. Click "Add secret"

## Pre-publish Checklist

Before publishing, verify:

```bash
# 1. Build succeeds
npm run build

# 2. dist/ folder exists with correct structure
ls -la dist/nodes/CustomExecNode/
# Should contain:
# - CustomExecNode.node.js
# - CustomExecNode.node.d.ts

# 3. Create test tarball (dry run)
npm pack
# Should create: n8n-nodes-custom-exec-1.0.0.tgz

# 4. Verify tarball contents
tar -tzf n8n-nodes-custom-exec-1.0.0.tgz
# Should include dist/ folder
```

## Manual Publishing

### First Time Publish

```bash
# 1. Ensure you're on the latest code
git pull origin master

# 2. Build
npm run build

# 3. Publish
npm publish --access public
```

Expected output:
```
+ n8n-nodes-custom-exec@1.0.0
```

### Subsequent Publishes

**IMPORTANT:** npm will reject publishing the same version twice.

```bash
# 1. Bump version (choose one)
npm run version:patch  # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor  # 1.0.0 → 1.1.0 (new features)
npm run version:major  # 1.0.0 → 2.0.0 (breaking changes)

# This automatically:
# - Updates package.json version
# - Creates a git commit
# - Creates a git tag

# 2. Push changes and tag
git push origin master
git push origin --tags

# 3. Publish
npm publish --access public
```

## Automatic Publishing via GitHub Actions

Once the `NPM_TOKEN` secret is set up, publishing is automatic:

### Trigger a Release

```bash
# 1. Bump version locally
npm run version:patch  # or minor/major

# 2. Push the tag (this triggers the workflow)
git push origin --tags

# 3. GitHub Actions will automatically:
# - Checkout code
# - Install dependencies
# - Build the project
# - Verify dist/ folder
# - Publish to npm
# - Verify the published package
```

### Monitor the Workflow

1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
2. Watch the "Publish to npm" workflow
3. If successful, package is live on npm

### Workflow Files

- `.github/workflows/publish.yml` - Publishes to npm on version tags
- `.github/workflows/test.yml` - Runs on every push to verify build

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH (1.0.x)**: Bug fixes, minor improvements
- **MINOR (1.x.0)**: New features, backward compatible
- **MAJOR (x.0.0)**: Breaking changes

### Example Version Flow

```bash
# Initial release
1.0.0

# Bug fix
npm run version:patch  # → 1.0.1

# Add new feature (e.g., environment variables support)
npm run version:minor  # → 1.1.0

# Breaking change (e.g., change node API)
npm run version:major  # → 2.0.0
```

## Verify Published Package

### Check npm Registry
```bash
npm view n8n-nodes-custom-exec

# Or specific version
npm view n8n-nodes-custom-exec@1.0.0
```

### Visit npm Website
https://www.npmjs.com/package/n8n-nodes-custom-exec

### Test Installation
```bash
# In a test directory
npm install n8n-nodes-custom-exec

# Verify files
ls -la node_modules/n8n-nodes-custom-exec/dist/
```

## Unpublishing (Emergency Only)

If you need to unpublish (within 72 hours):

```bash
npm unpublish n8n-nodes-custom-exec@1.0.0
```

**WARNING:** Unpublishing is bad practice. Instead, publish a new patch version with fixes.

## Troubleshooting

### Error: 403 Forbidden
```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/n8n-nodes-custom-exec
```

**Solutions:**
- Run `npm login` again
- Verify you have publish permissions
- Check if package name is already taken

### Error: Version already exists
```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/n8n-nodes-custom-exec
npm ERR! You cannot publish over the previously published versions: 1.0.0
```

**Solution:**
```bash
npm run version:patch
npm publish --access public
```

### Error: dist/ folder not found
```
npm notice
npm notice package: n8n-nodes-custom-exec@1.0.0
npm notice === Tarball Contents ===
npm notice 1.1kB package.json
```

**Solution:**
```bash
npm run build
npm publish --access public
```

### GitHub Actions fails with NPM_TOKEN error
```
npm ERR! code ENEEDAUTH
npm ERR! need auth This command requires you to be logged in.
```

**Solution:**
1. Regenerate npm token: `npm token create`
2. Update GitHub secret: Settings → Secrets → Actions → NPM_TOKEN
3. Re-run the workflow

### Package published but node doesn't appear in n8n

**Check:**
1. Verify `n8n` field in package.json:
   ```json
   "n8n": {
     "nodes": ["dist/nodes/CustomExecNode/CustomExecNode.node.js"]
   }
   ```
2. Verify dist/ folder is included in published package:
   ```bash
   npm pack
   tar -tzf n8n-nodes-custom-exec-*.tgz | grep dist
   ```
3. Reinstall in n8n:
   ```bash
   docker exec n8n npm uninstall n8n-nodes-custom-exec
   docker exec n8n npm install n8n-nodes-custom-exec
   docker restart n8n
   ```

## Best Practices

1. **Always test locally before publishing**
   ```bash
   npm run build
   npm pack
   tar -tzf *.tgz | grep dist
   ```

2. **Use GitHub Actions for releases**
   - Consistent builds
   - Automated verification
   - Less human error

3. **Write changelog entries**
   - Document changes in git commits
   - Tag releases with meaningful messages

4. **Don't publish from dirty workspace**
   ```bash
   git status  # Should be clean
   ```

5. **Test the published package**
   - Install in a clean n8n instance
   - Verify node appears and works

## Release Checklist

Before every release:

- [ ] All changes committed and pushed
- [ ] Code builds successfully (`npm run build`)
- [ ] Version bumped (`npm run version:patch/minor/major`)
- [ ] Tag pushed to GitHub (`git push --tags`)
- [ ] GitHub Actions workflow succeeded
- [ ] Package visible on npm registry
- [ ] Installation tested in n8n

## Support

- **npm Package**: https://www.npmjs.com/package/n8n-nodes-custom-exec
- **GitHub**: https://github.com/shadow-software/n8n-nodes-custom-exec-node
- **Issues**: https://github.com/shadow-software/n8n-nodes-custom-exec-node/issues

---

**Ready to publish?**

```bash
# Quick release (patch version)
npm run build && npm run version:patch && git push --tags

# Then watch: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
```
