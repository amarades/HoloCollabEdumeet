# Debugging Session Page Module Loading

## Issue
User getting: `Failed to resolve module specifier "three"` 

## Root Cause
**Browser cache** - The browser cached an old version of ar/scene.js that had bare `"three"` imports before we changed them to CDN URLs.

## What We've Verified
✅ All Three.js imports in codebase use CDN URLs correctly:
- `ar/scene.js` - correct
- `viewer3d.js` - correct  
- No bare `"three"` imports found

✅ session.html loads correct entry point

## The Problem
ES6 modules are **aggressively cached** by browsers. Even Ctrl+F5 doesn't always clear module cache.

## Solutions (in order of likelihood to work)

### 1. Hard Browser Cache Clear ⭐ **TRY THIS FIRST**
```
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
```

### 2. Clear Application Storage
```
1. DevTools (F12) → Application tab
2. Storage → Clear site data
3. Reload
```

### 3. Private/Incognito Window
```
Open session page in new incognito window (Ctrl+Shift+N)
```

### 4. Different Browser
```
Try Firefox/Edge if using Chrome (or vice versa)
```

What I already did:
- ✅ Added cache-busting query parameters to app.js
- ✅ Changed to timestamp-based versioning  
- ✅ Verified all imports use CDN URLs

**Next Step:** User must clear browser cache using one of the methods above.
