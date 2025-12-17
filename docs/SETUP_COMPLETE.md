# GitHub Actions Publishing Setup - COMPLETE ✅

Your npm publishing workflow is fully configured and ready to use.

## What Was Set Up

### 1. GitHub Actions Workflows ✅

**`.github/workflows/publish.yml`**
- Triggers on version tags (`v*`)
- Builds project
- Verifies dist/ folder
- Publishes to npm
- Verifies published package

**`.github/workflows/test.yml`**
- Runs on every push
- Tests build on Node 18 and 20
- Verifies package integrity

### 2. Package Configuration ✅

**`package.json` updates:**
- Added `bugs` field for issue tracking
- Added `prepare` script (auto-build on install)
- Added versioning helper scripts
- Fixed `main` field to point to built file
- `prepublishOnly` runs build before publish

### 3. Publishing Files ✅

**`.npmignore`**
- Excludes source TypeScript files
- Excludes development files
- Only publishes `dist/` folder
- Keeps package size minimal

**Documentation:**
- `PUBLISHING.md` - Complete publishing guide
- `RELEASE_CHECKLIST.md` - Quick reference for releases

### 4. Verified Package Structure ✅

```
n8n-nodes-custom-exec-1.0.0.tgz
├── LICENSE
├── README.md
├── package.json
└── dist/
    └── nodes/
        └── CustomExecNode/
            ├── CustomExecNode.node.js
            └── CustomExecNode.node.d.ts
```

## Next Steps

### One-Time Setup (Required)

#### 1. Create npm Token

```bash
npm login
npm token create
```

Copy the token (starts with `npm_...`)

#### 2. Add Token to GitHub Secrets

1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: [paste your npm token]
5. Click "Add secret"

That's it. Publishing is now automated.

## How to Publish

### Automatic (Recommended)

```bash
# 1. Bump version (creates tag automatically)
npm run version:patch  # 1.0.0 → 1.0.1

# 2. Push tag to GitHub (triggers workflow)
git push origin --tags

# 3. Wait 2 minutes

# 4. Verify at:
# https://www.npmjs.com/package/n8n-nodes-custom-exec
```

### Manual (If needed)

```bash
npm run build
npm publish --access public
```

## Workflow Behavior

### On Every Push
- Runs build test
- Verifies package structure
- No publishing

### On Tag Push (v*)
- Runs full build
- Publishes to npm
- Verifies published package
- Fails if anything goes wrong

## Version Commands

```bash
npm run version:patch  # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor  # 1.0.0 → 1.1.0 (new features)
npm run version:major  # 1.0.0 → 2.0.0 (breaking changes)
```

Each command:
- Updates package.json
- Creates git commit
- Creates git tag
- Ready to push

## Verification

### Before First Publish

Test the package locally:

```bash
# Build and pack
npm run build
npm pack

# Verify contents
tar -tzf n8n-nodes-custom-exec-1.0.0.tgz | grep dist

# Should show:
# dist/nodes/CustomExecNode/CustomExecNode.node.js
# dist/nodes/CustomExecNode/CustomExecNode.node.d.ts
```

### After Publishing

```bash
# Check npm
npm view n8n-nodes-custom-exec

# Test install
docker run -it --rm node:20 bash -c "npm install n8n-nodes-custom-exec && ls -la node_modules/n8n-nodes-custom-exec/dist/"

# Test in n8n
docker exec n8n npm install -g n8n-nodes-custom-exec
docker restart n8n
# Open http://localhost:5678 and search for "Custom Exec"
```

## Monitoring

### GitHub Actions
https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions

### npm Package
https://www.npmjs.com/package/n8n-nodes-custom-exec

### Issues
https://github.com/shadow-software/n8n-nodes-custom-exec-node/issues

## Quick Reference

| Action | Command |
|--------|---------|
| **Publish bug fix** | `npm run version:patch && git push --tags` |
| **Publish new feature** | `npm run version:minor && git push --tags` |
| **Test build** | `npm run build && npm pack --dry-run` |
| **View published** | `npm view n8n-nodes-custom-exec` |
| **Manual publish** | `npm publish --access public` |

## Troubleshooting

### "NPM_TOKEN not found"
- Add token to GitHub Secrets (see step 2 above)
- Token must be named exactly `NPM_TOKEN`

### "Version already exists"
- Bump version: `npm run version:patch`
- Push new tag: `git push --tags`

### "dist/ folder not found"
- The `prepare` script should build automatically
- Or run manually: `npm run build`

### Workflow fails
1. Check: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
2. Read error message
3. Fix issue
4. Push new tag or re-run workflow

## Security Notes

- npm token has full publish access
- Store only in GitHub Secrets
- Rotate token if compromised
- Never commit token to git

## Success Criteria

When everything works:

1. ✅ Push tag to GitHub
2. ✅ GitHub Actions runs automatically
3. ✅ Package published to npm
4. ✅ Package installable: `npm install n8n-nodes-custom-exec`
5. ✅ Node appears in n8n after install

## Files Created

```
.github/
  workflows/
    publish.yml       # Auto-publish on tags
    test.yml          # Build verification

PUBLISHING.md         # Complete guide
RELEASE_CHECKLIST.md  # Quick reference
SETUP_COMPLETE.md     # This file

.npmignore            # Control what gets published
```

## Updated Files

```
package.json          # Added scripts and metadata
.gitignore            # Added *.tgz
```

---

## Ready to Publish?

1. **Add NPM_TOKEN to GitHub Secrets** (required, one-time)
2. **Test locally:**
   ```bash
   npm run build
   npm pack --dry-run
   ```
3. **Publish:**
   ```bash
   npm run version:patch
   git push --tags
   ```
4. **Verify:**
   ```bash
   npm view n8n-nodes-custom-exec
   ```

That's it. Your package will be live on npm in ~2 minutes.

---

**Need help?** Read `PUBLISHING.md` for detailed instructions.
