# Fix npm 2FA Publishing Issue

## Problem

```
npm error 403 403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

## Solution: Create Granular Access Token

### Step 1: Create Token on npmjs.com

1. **Go to:** https://www.npmjs.com/settings/shadowgroup/tokens
2. **Click:** "Generate New Token" → "Granular Access Token"
3. **Configure:**
   - **Token name:** `n8n-custom-exec-publish`
   - **Expiration:** 365 days (or as needed)
   - **Packages and scopes:**
     - Select: "Only selected packages and scopes"
     - Click "Add package"
     - Enter: `n8n-nodes-custom-exec`
   - **Permissions:**
     - Check: "Read and write"
   - **Organizations:** Leave as is
   - **IP Allowlist:** Leave empty (optional for extra security)
4. **Click:** "Generate Token"
5. **Copy the token** (starts with `npm_...`)

### Step 2: Use Token to Publish

**Option A: Set in environment variable**
```bash
export NPM_TOKEN="npm_YourTokenHere"
npm publish --access public
```

**Option B: Login with token**
```bash
npm login
# Username: shadowgroup
# Password: [paste your token]
# Email: [your email]

npm publish --access public
```

**Option C: Use .npmrc file (temporary)**
```bash
echo "//registry.npmjs.org/:_authToken=npm_YourTokenHere" > .npmrc
npm publish --access public
rm .npmrc  # Delete after publishing
```

### Step 3: Verify Published

```bash
npm view n8n-nodes-custom-exec
```

## Alternative: Use 2FA Code

If you prefer to use your password with 2FA:

```bash
npm publish --otp=123456
# Replace 123456 with your 2FA code from authenticator app
```

**Note:** This only works for one publish. For automation, use a token.

## For GitHub Actions

After creating the granular access token:

1. Go to: https://github.com/shadow-software/n8n-nodes-custom-exec-node/settings/secrets/actions
2. Add secret:
   - Name: `NPM_TOKEN`
   - Value: [paste your granular access token]

## Quick Fix

**Fastest way to publish right now:**

1. **Get your 2FA code** from authenticator app
2. **Run:**
   ```bash
   npm publish --access public --otp=YOUR_2FA_CODE
   ```
   Replace `YOUR_2FA_CODE` with the 6-digit code

Example:
```bash
npm publish --access public --otp=123456
```

---

## Summary

**Problem:** npm requires 2FA for publishing

**Solution:**
- **Quick:** Use `--otp=CODE` flag
- **Permanent:** Create granular access token
- **Automation:** Add token to GitHub Secrets

**Next Steps:**
1. Get 2FA code from your authenticator app
2. Run: `npm publish --access public --otp=YOUR_CODE`
3. Verify: `npm view n8n-nodes-custom-exec`
