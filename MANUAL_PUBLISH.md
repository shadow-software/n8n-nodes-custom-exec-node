# Manual Publish - Step by Step

## What I Changed

Added `workflow_dispatch` trigger to the publish workflow so you can manually trigger it from GitHub.

## Steps to Publish

### 1. Commit and Push the Workflow Update

```bash
git add .github/workflows/publish.yml
git commit -m "Add manual trigger to publish workflow"
git push origin master
```

### 2. Set NPM_TOKEN in GitHub Secrets (Required)

**Create npm token:**
```bash
npm login
npm token create --type automation
```

Copy the token (starts with `npm_...`)

**Add to GitHub:**
1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: [paste your token]
5. Click "Add secret"

### 3. Manually Trigger the Workflow

**Option A: From GitHub UI (Easiest)**

1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
2. Click on "Publish to npm" in the left sidebar
3. Click "Run workflow" button (top right)
4. Click the green "Run workflow" button in the dropdown
5. Wait 2-3 minutes
6. Check status - should turn green

**Option B: Re-tag to Auto-Trigger**

```bash
# Delete remote tag
git push origin :refs/tags/v1.0.1

# Delete local tag
git tag -d v1.0.1

# Bump version (creates new tag)
npm version patch

# Push new tag (auto-triggers workflow)
git push --tags
```

### 4. Verify Published

```bash
# After workflow completes (2-3 minutes)
npm view n8n-nodes-custom-exec

# Should show your package info
```

## Troubleshooting

### "Run workflow" button doesn't appear

**Cause:** Workflow file not pushed yet

**Fix:**
```bash
git push origin master
# Wait 30 seconds, then refresh GitHub Actions page
```

### Workflow fails with authentication error

**Cause:** NPM_TOKEN not set

**Fix:** Follow step 2 above to add NPM_TOKEN

### "Version already published"

**Cause:** Version 1.0.1 already exists on npm

**Fix:**
```bash
# Bump to next version
npm version patch  # Creates 1.0.2
git push --tags
```

## Alternative: Publish Manually via CLI

If you don't want to use GitHub Actions:

```bash
# 1. Build
npm run build

# 2. Login
npm login

# 3. Publish
npm publish --access public

# 4. Verify
npm view n8n-nodes-custom-exec
```

## Quick Start

**Run these commands in order:**

```bash
# 1. Push workflow update
git add .github/workflows/publish.yml
git commit -m "Add manual trigger to publish workflow"
git push origin master

# 2. Create and add NPM_TOKEN to GitHub Secrets
npm token create --type automation
# Add at: https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions

# 3. Manually trigger workflow
# Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/actions
# Click "Publish to npm" → "Run workflow" → "Run workflow"

# 4. Wait 2-3 minutes, then verify
npm view n8n-nodes-custom-exec
```

---

## Summary

**Problem:** Workflow was created after tags were pushed, so it never ran

**Solution:** Added manual trigger button

**Next:**
1. Push this change
2. Add NPM_TOKEN to GitHub Secrets
3. Click "Run workflow" button on GitHub
