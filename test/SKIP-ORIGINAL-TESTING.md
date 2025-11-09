# Testing skipOriginalProcessing Feature

## Quick Start

### Run the automated test suite:
```bash
npm test -- test/test-skip-original-processing.js
```

### Run the manual inspection script:
```bash
node test/manual/verify-skip-original.js
```

## Manual Verification Commands

### 1. Compare File Sizes
```bash
# Original file
ls -lh test/bio-2017.jpg

# With skipOriginalProcessing (should be SAME size)
ls -lh test/img-manual/TYe-OAfj9R-1280.jpeg

# Without skipOriginalProcessing (should be SMALLER due to re-compression)
ls -lh test/img-manual/no-skip/TYe-OAfj9R-1280.jpeg
```

**Expected Output:**
```
test/bio-2017.jpg                              330K
test/img-manual/TYe-OAfj9R-1280.jpeg          330K  ← IDENTICAL (copied)
test/img-manual/no-skip/TYe-OAfj9R-1280.jpeg  322K  ← SMALLER (re-compressed)
```

### 2. Binary Comparison with `diff`
```bash
# Should be identical (exit code 0)
diff test/bio-2017.jpg test/img-manual/TYe-OAfj9R-1280.jpeg
echo $?  # Should print: 0

# Should be different (exit code 1)
diff test/bio-2017.jpg test/img-manual/no-skip/TYe-OAfj9R-1280.jpeg
echo $?  # Should print: 1
```

### 3. MD5 Hash Comparison
```bash
md5 test/bio-2017.jpg
md5 test/img-manual/TYe-OAfj9R-1280.jpeg        # Should MATCH original
md5 test/img-manual/no-skip/TYe-OAfj9R-1280.jpeg  # Should DIFFER
```

**Expected Output:**
```
Original:  3ea87e6ba87d5d5d22f1b0fefb59aa1d
Copied:    3ea87e6ba87d5d5d22f1b0fefb59aa1d  ← IDENTICAL
Processed: a5a9cf90fc10cf290cd873b66acb056a  ← DIFFERENT
```

### 4. View with Image Viewer
```bash
# Open both files side-by-side to visually compare
open test/bio-2017.jpg
open test/img-manual/TYe-OAfj9R-1280.jpeg

# The copied file should look EXACTLY the same
# The processed file might look slightly different (due to quality: 90 re-compression)
```

### 5. Examine EXIF Data
```bash
# Compare EXIF metadata (requires exiftool)
exiftool test/bio-2017.jpg | head -20
exiftool test/img-manual/TYe-OAfj9R-1280.jpeg | head -20
```

The copied file should preserve EXIF data, while the processed file may have modified EXIF.

## Understanding the Output

### Test 1: WITH skipOriginalProcessing
```
300px:  25.44 KB   🔧 PROCESSED (resized + quality 90)
640px:  105.99 KB  🔧 PROCESSED (resized + quality 90)
1280px: 330.28 KB  ✅ IDENTICAL (byte-for-byte copy)
```

### Test 2: WITHOUT skipOriginalProcessing (default)
```
300px:  25.44 KB   🔧 PROCESSED (resized + quality 90)
640px:  105.99 KB  🔧 PROCESSED (resized + quality 90)
1280px: 322.48 KB  🔧 PROCESSED (re-compressed with quality 90)
                   ↑ Note: ~8KB smaller due to re-compression
```

### Test 3: Multiple Formats
```
JPEG: 330.28 KB  ✅ IDENTICAL (format matches source)
WebP: 208.79 KB  🔧 PROCESSED (format conversion required)
```

## Performance Comparison

To measure the performance improvement:

```bash
# Time WITHOUT skipOriginalProcessing
time node -e "
const Image = require('./img.js').default;
(async () => {
  await Image('./test/bio-2017.jpg', {
    widths: [1280],
    formats: ['auto'],
    outputDir: './test/perf-no-skip/',
    useCache: false,
  });
})();
"

# Time WITH skipOriginalProcessing
time node -e "
const Image = require('./img.js').default;
(async () => {
  await Image('./test/bio-2017.jpg', {
    widths: [1280],
    formats: ['auto'],
    outputDir: './test/perf-skip/',
    skipOriginalProcessing: true,
    useCache: false,
  });
})();
"
```

## Debugging

If tests fail, check:

1. **Clean the output directory:**
   ```bash
   rm -rf test/img/* test/img-manual/*
   ```

2. **Disable cache when testing:**
   Always include `useCache: false` in your options during manual testing.

3. **Check for in-memory cache pollution:**
   Restart Node between tests if needed, or use different source files.

4. **Verify file permissions:**
   Ensure the test output directories are writable.

## Expected Behavior Summary

| Condition | Result |
|-----------|--------|
| Width = original, Format = original, skipOriginalProcessing = true | ✅ COPIED (byte-identical) |
| Width < original, any format, skipOriginalProcessing = true | 🔧 PROCESSED |
| Format ≠ original, any width, skipOriginalProcessing = true | 🔧 PROCESSED |
| Any condition, skipOriginalProcessing = false | 🔧 PROCESSED |
| Remote URL source, skipOriginalProcessing = true | 🔧 PROCESSED (disabled) |
| Buffer source, skipOriginalProcessing = true | 🔧 PROCESSED (disabled) |
| Transform function present, skipOriginalProcessing = true | 🔧 PROCESSED (disabled) |
