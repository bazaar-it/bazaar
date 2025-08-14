# GitHub App Environment Variables Update Guide

## Current Situation
You have two GitHub integrations that are getting mixed up:

### 1. GitHub OAuth App (for user login)
- **Purpose**: "Sign in with GitHub" functionality
- **Variables in use**:
  - `AUTH_GITHUB_ID` = OAuth Client ID
  - `AUTH_GITHUB_SECRET` = OAuth Client Secret

### 2. GitHub App (for API access to repos)
- **Purpose**: Read/write files in user repositories
- **Variables in use**:
  - `GITHUB_APP_ID` = App ID (e.g., 1780179)
  - `GITHUB_CLIENT_ID` = GitHub App Client ID
  - `GITHUB_CLIENT_SECRET` = GitHub App Client Secret
  - `GITHUB_APP_PRIVATE_KEY` = RSA private key

## What's Wrong in Vercel

The `GITHUB_CLIENT_SECRET` in Vercel is currently set to `6cd2afc...` which is your OAuth App's secret (same value as `AUTH_GITHUB_SECRET`). This is WRONG - it should be the GitHub App's secret.

## What You Need to Add to Vercel

Add these environment variables to ALL environments (Production, Preview, Development):

```bash
# GitHub App Variables (for API access)
GITHUB_APP_ID=1780179
GITHUB_CLIENT_ID=Iv23li4kNZl5biJvpgZF
GITHUB_CLIENT_SECRET=3da10647c4035f6a52e9e8da6d36f21de3380849
GITHUB_WEBHOOK_SECRET=b921523a65ce2a801b58874ed3feb1a19ea4382097610a90e619d33dad545bdd
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAuddHG+xI8nwBmN6c8PMuSj6wbizn7EL/M0U46ujh6jYeOiMu
Y5WyI/Ids0atFJqKtOUOc06PLUerR+NbCtBJQ+V15g/VJ/zm6MTa4wsztsVW45cd
OgIp/br5RoHe3xrYJVBvH8WT4HPE0yFT7mr4avrZ9FCbiOn6lzIhv/M8p7el80Xv
Il3bLwyMSx3muZAsiIsqb5ePDwsl1VdZOpNFbLJq6f5+b+YPVSMddiwjOi1s8cKk
Dur75XUp21SqA8OO6UYx/N53oOPhw85F+C0cn00kA1VYKQhWHkDowUR5s9vr8M5m
89yMQbK2tx6KJo1g0t5kqn2vf6lmh769/E/FEwIDAQABAoIBAG4QP78b28AxDUka
XtydSccTBa7azaixrS8SSjlmH5Z04sYP3AOCvvRnCowIya0wMgIcvsgvuMBad+il
kGABJ8McfQz6R4XdVGx7Wh+pnMEccu9rqhWW/oOVXtkRRYvg/C5tSsMIYyJFrkZU
sL69f87sLnVx4Avgd1dgi3iBeGTjbvOn+emmczDY4f0U/pqAAoChB0FhX9fnYPZr
+jyLW54qA9tiXnc4jjqEXah0Cj/ipOo0TUF+83/zryMIF/bNhZBEs1MhVilaMigw
MY7HNBgTUsnDMisdk60WIXtwpQSpFU3CkJEO4KXGyzSPNaV6MZZnt2KIYr7AO9MN
Jh9y5dECgYEA3VUHxQ9kk0AR/gQzlMyHJRqvhViFFDkCuyjet19rjqEVmsPkEGk9
Nm/B37j++fZV5PxZzY8s7/AGN4r7YIV0/Vz9upXzcLuUaP4UE+/FqAUCh3/GlB7x
WFS+svziW6piIAf/JhJyoeqL4+ePcPQm+3xsxn63aPFzT+1QXk88PGUCgYEA1vMf
HYTFaHDpJrNaXhCpEfpR8Y5r13FFZL0w/KkIFKc/P5QCmCyhStjUx+/YcXXiFCXx
3uqQCu/io34CIHaNzelzP3WpUD87Xyp3L62rrJcuo/kQcrbQ43dr7S3ijmPtNLGv
TWohUDzMqz3foPtQn5yw7GSGMqtDzaJ8CDBLeBcCgYEAxgeHPSSJm0ovDvSZZiAd
JvCabJeH8lEUBXsK0kzYwjOUTfXI/3n5n9QcRdySnfluXsP+YXIiBcfe+CEsyu59
fxeNmT0DJDFhFxOFyVS1p6Bb4/pKJUsOKzcfrKugp91pkDk3a8wDrqVZZp9PcwOw
QUDRXkQQPCAUSUYOq2L/hRUCgYEAjqIFo7DWzdce329kJ8cmaaeReJjpNq0TPyXL
u9zuX8YbUjUFA7WZ0fDQQVwGZEO1IWmMdj9wFdHYsmSLRL9mmZyvvQx2ralH3H5x
WFIF+SDY8jXzlCt7sXUtSNWJ4LKuVKkTimtCb9vodDk6i7g4Z7GyNSr/YeADvhBz
/XsOmUECgYEAvSkSzQOZDaj5yNLa0GTVoAnfgVbKphxJ9UGaWoPlgGSszJlfKtnb
YbNvNm6R83aGz9DrQjYyikAA61Ay63lA4YKIcSOb++U0eACqy1+fQOMOZQD7ES83
VBZWgTzQ0UL0CexJiv1FtxwHnWMNUTcRNbOQx1Oys1Fe+rtEmpv5XEc=
-----END RSA PRIVATE KEY-----
```

## Steps to Fix in Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables

2. **ADD** these missing variables (they don't exist at all):
   - `GITHUB_APP_ID`
   - `GITHUB_CLIENT_ID` 
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_WEBHOOK_SECRET`

3. **UPDATE** this existing variable:
   - `GITHUB_CLIENT_SECRET` - Change from `6cd2afc...` to `3da10647c4035f6a52e9e8da6d36f21de3380849`

4. Apply to all environments: Production ✓, Preview ✓, Development ✓

5. Redeploy your application

## Verification

After adding these, your Vercel should have:

**For OAuth (login):**
- ✅ AUTH_GITHUB_ID (already there)
- ✅ AUTH_GITHUB_SECRET (already there)

**For GitHub App (API):**
- ✅ GITHUB_APP_ID (newly added)
- ✅ GITHUB_CLIENT_ID (newly added)
- ✅ GITHUB_CLIENT_SECRET (updated to correct value)
- ✅ GITHUB_APP_PRIVATE_KEY (newly added)
- ✅ GITHUB_WEBHOOK_SECRET (newly added)

## Why This Matters

Without these GitHub App variables, users won't be able to:
- Connect their GitHub repositories
- Read/write files from their repos
- Use any GitHub integration features

The OAuth variables only handle login - the GitHub App variables handle the actual functionality!