# Release Checklist

Quick reference for publishing a new version.

## One-Time Setup (First Release)

### 1. Set up npm authentication
```bash
npm login
```

### 2. Add NPM_TOKEN to GitHub Secrets

```bash
# Generate token
npm token create

# Add to GitHub:
# https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions
# Name: NPM_TOKEN
# Value: [paste token]
```

## Every Release

### Pre-release Checks

```bash
# 1. Clean workspace
git status  # Should show no uncommitted changes

# 2. Pull latest
git pull origin master

# 3. Build and verify
npm run build
ls -la dist/nodes/CustomExecNode/

# 4. Test pack (dry run)
npm pack --dry-run
# Should show dist/ files
```

### Manual Release (Quick)

```bash
# Bump version and publish
npm run version:patch  # or :minor or :major
git push origin master --tags
```

Wait 2 minutes, then verify at:
https://www.npmjs.com/package/n8n-nodes-custom-exec

### Manual Release (Step by Step)

```bash
# 1. Bump version
npm run version:patch  # 1.0.0 → 1.0.1
# or
npm run version:minor  # 1.0.0 → 1.1.0
# or
npm run version:major  # 1.0.0 → 2.0.0

# 2. Push changes
git push origin master

# 3. Push tag (triggers GitHub Actions)
git push origin --tags

# 4. Monitor workflow
# https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions

# 5. Verify published
npm view n8n-nodes-custom-exec
```

### GitHub Actions Release (Automatic)

Once tag is pushed, GitHub Actions will:
1. Checkout code
2. Install dependencies
3. Build project
4. Verify dist/ folder
5. Publish to npm
6. Verify package is live

No manual intervention needed.

## Post-Release

### Verify Installation

```bash
# Test in a clean environment
docker run -it --rm node:20 bash
npm install n8n-nodes-custom-exec
ls -la node_modules/n8n-nodes-custom-exec/dist/
```

### Test in n8n

```bash
# Install in running n8n container
docker exec n8n npm install -g n8n-nodes-custom-exec
docker restart n8n

# Open http://localhost:5678
# Search for "Custom Exec" node
```

### Update Documentation

If this is a significant release:
1. Update README.md with new features
2. Create GitHub Release with changelog
3. Tweet/announce if major version

## Version Guidelines

Use [Semantic Versioning](https://semver.org/):

- **PATCH (1.0.x)**: Bug fixes
  - Fix command execution error
  - Fix templating bug
  - Update documentation

- **MINOR (1.x.0)**: New features (backward compatible)
  - Add environment variables support
  - Add new output format
  - Add new configuration option

- **MAJOR (x.0.0)**: Breaking changes
  - Change node API
  - Remove deprecated features
  - Require different n8n version

## Emergency Rollback

If a bad version is published:

### Option 1: Publish a fix (Recommended)
```bash
npm run version:patch
git push origin master --tags
# Fix is published automatically
```

### Option 2: Deprecate version (within 72 hours)
```bash
npm deprecate n8n-nodes-custom-exec@1.0.1 "Critical bug, use 1.0.2 instead"
```

### Option 3: Unpublish (LAST RESORT, within 72 hours)
```bash
npm unpublish n8n-nodes-custom-exec@1.0.1
```

## Common Issues

### "Version already exists"
Solution: You forgot to bump the version
```bash
npm run version:patch
git push origin --tags
```

### "403 Forbidden"
Solution: npm token expired
```bash
npm login
# Update NPM_TOKEN in GitHub secrets
```

### "dist/ folder not found"
Solution: Build wasn't triggered
```bash
npm run build
git add dist/
git commit -m "Add built files"
git push
```

### GitHub Actions fails
1. Check logs: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
2. Common causes:
   - NPM_TOKEN invalid
   - Build failed
   - Version already exists
3. Fix and re-run or push new tag

## Quick Reference

| Task | Command |
|------|---------|
| Bug fix release | `npm run version:patch && git push --tags` |
| New feature release | `npm run version:minor && git push --tags` |
| Breaking change | `npm run version:major && git push --tags` |
| Check published | `npm view n8n-nodes-custom-exec` |
| Test pack | `npm pack --dry-run` |
| Manual publish | `npm publish --access public` |

## Release History

Track versions here:

- **1.0.0** (2025-12-17) - Initial release
  - Execute bash commands
  - Templating support
  - Environment variables
  - Error handling

---

**Before every release, run:**
```bash
npm run build && npm pack --dry-run
```

**To publish:**
```bash
npm run version:patch && git push --tags
```

That's it. GitHub Actions handles the rest.
