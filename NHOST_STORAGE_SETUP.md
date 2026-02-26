# Nhost Storage Setup Guide

The image upload feature requires Nhost Storage to be properly configured.

## Error: "resource does not exist" or "not-found"

This error means the storage URL is incorrect or storage is not enabled for your Nhost project.

## Fix 1: Add Storage URL to Environment Variables

Add this to your `.env.local` file:

```env
NEXT_PUBLIC_NHOST_STORAGE_URL=https://YOUR_SUBDOMAIN.storage.YOUR_REGION.nhost.run
```

**How to find your storage URL:**

1. Go to your Nhost Dashboard: https://app.nhost.io
2. Select your project
3. Go to Storage section
4. Copy the Storage URL (it should look like `https://xxxxx.storage.region.nhost.run`)

Example:
```env
NEXT_PUBLIC_NHOST_STORAGE_URL=https://abcd1234.storage.eu-central-1.nhost.run
```

## Fix 2: Enable Storage in Nhost

If storage is not enabled:

1. Go to your Nhost Dashboard
2. Select your project
3. Go to Storage section
4. Make sure Storage is enabled
5. Check the storage permissions

## Fix 3: Verify Current Configuration

Check your server logs after attempting upload. They will show:

```
[Media Upload] Using storage URL: https://...
[Media Upload] Uploading to: https://.../v1/files
```

Make sure this URL matches your actual Nhost project storage URL.

## Alternative: Use Direct Nhost SDK

If the issue persists, you might need to use the Nhost SDK instead of direct fetch:

```bash
npm install @nhost/nhost-js
```

Let me know if you need help implementing this alternative approach.

## Test Your Configuration

After adding the environment variable:

1. Restart your Next.js dev server
2. Try uploading an image again
3. Check the console logs for the storage URL being used
4. Verify it matches your Nhost dashboard

## Current Issue

Based on the error, the system is trying to upload to a storage URL that doesn't exist. Check:

1. Is `NEXT_PUBLIC_NHOST_STORAGE_URL` set in `.env.local`?
2. Does the URL in the error match your actual Nhost project?
3. Is storage enabled in your Nhost dashboard?
