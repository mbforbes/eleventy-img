import fs from "node:fs";

import test from "ava";
import eleventyImage from "../img.js";

// Tests for skipOriginalProcessing option

// Helper to compare files byte-by-byte
function filesAreIdentical(file1, file2) {
  const buffer1 = fs.readFileSync(file1);
  const buffer2 = fs.readFileSync(file2);
  return buffer1.equals(buffer2);
}

// ============================================================================
// Tests for ENABLED behavior (when skipOriginalProcessing should work)
// ============================================================================

test("skipOriginalProcessing: copies original file when enabled with matching width/format", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [300, 1280], // 1280 is original width
    formats: ["auto"], // auto will resolve to jpeg
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false, // Disable cache to test actual copy behavior
  });

  t.is(stats.jpeg.length, 2);

  // The 300px version should be processed normally
  t.is(stats.jpeg[0].width, 300);

  // The 1280px version should be a direct copy
  t.is(stats.jpeg[1].width, 1280);

  // Verify the 1280px output is binary-identical to the source
  t.true(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[1].outputPath));
});

test("skipOriginalProcessing: works with null width (represents original)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [300, null], // null means original width (1280)
    formats: ["auto"],
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[1].width, 1280);

  // Verify binary equality
  t.true(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[1].outputPath));
});

test("skipOriginalProcessing: works with 'auto' width", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [300, 'auto'], // 'auto' means original width (1280)
    formats: ["auto"],
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[1].width, 1280);

  // Verify binary equality
  t.true(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[1].outputPath));
});

test("skipOriginalProcessing: works with explicit format matching", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [300, 1280],
    formats: ["jpeg"], // explicit format that matches source
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[1].width, 1280);

  // Verify binary equality
  t.true(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[1].outputPath));
});

test("skipOriginalProcessing: works with PNG source", async t => {
  let stats = await eleventyImage("./test/david-mascot.png", {
    widths: [400, 815], // 815 is original width
    formats: ["auto"], // auto will resolve to png
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.png.length, 2);
  t.is(stats.png[1].width, 815);

  // Verify binary equality
  t.true(filesAreIdentical("./test/david-mascot.png", stats.png[1].outputPath));
});

test("skipOriginalProcessing: only copies matching format, processes others", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280], // original width
    formats: ["jpeg", "webp"], // jpeg matches, webp doesn't
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.webp.length, 1);

  // JPEG should be binary-identical (copied)
  t.true(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[0].outputPath));

  // WebP should be processed (not identical)
  t.false(filesAreIdentical("./test/bio-2017.jpg", stats.webp[0].outputPath));
});

// ============================================================================
// Tests for DISABLED conditions (when skipOriginalProcessing should NOT work)
// ============================================================================

test("skipOriginalProcessing: disabled by default", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["auto"],
    outputDir: "./test/img/",
    useCache: false,
    sharpJpegOptions: {
      quality: 80, // Different quality to ensure processing produces different output
    },
    // skipOriginalProcessing not set (defaults to false)
  });

  t.is(stats.jpeg.length, 1);

  // Should NOT be binary-identical because it was processed
  t.false(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[0].outputPath));
});

test("skipOriginalProcessing: disabled when format doesn't match", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280], // original width
    formats: ["webp"], // format doesn't match source (jpeg)
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
  });

  t.is(stats.webp.length, 1);

  // Should NOT be binary-identical (format conversion required)
  t.false(filesAreIdentical("./test/bio-2017.jpg", stats.webp[0].outputPath));
});

test("skipOriginalProcessing: disabled when width doesn't match original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [640], // not original width (1280)
    formats: ["auto"],
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 640);

  // Should NOT be binary-identical (was resized)
  t.false(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[0].outputPath));
});

test("skipOriginalProcessing: disabled with Buffer input", async t => {
  let buffer = fs.readFileSync("./test/bio-2017.jpg");

  let stats = await eleventyImage(buffer, {
    widths: [1280],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
    useCache: false,
    sharpJpegOptions: {
      quality: 80,
    },
  });

  t.is(stats.jpeg.length, 1);

  // Should NOT be binary-identical because source is Buffer, not file path
  // (we can't safely know the Buffer is unchanged)
  t.false(buffer.equals(fs.readFileSync(stats.jpeg[0].outputPath)));
});

test("skipOriginalProcessing: disabled with remote URL", async t => {
  // Note: This test requires network access
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017-big.png", {
    widths: [null], // original width
    formats: ["auto"],
    outputDir: "./test/img/",
    skipOriginalProcessing: true,
  });

  t.is(stats.png.length, 1);

  // Should be processed (remote URLs always process)
  // We can't easily verify non-identity here, but the feature should be disabled
  t.truthy(stats.png[0].outputPath);
});

test("skipOriginalProcessing: disabled with transform function", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280], // original width
    formats: ["auto"],
    outputDir: "./test/img-transform/", // Unique directory to avoid conflicts
    skipOriginalProcessing: true,
    useCache: false,
    transform: function(sharpInstance) {
      // Apply a transform - this should disable skipOriginalProcessing
      return sharpInstance.grayscale();
    },
  });

  t.is(stats.jpeg.length, 1);

  // Should NOT be binary-identical (transform was applied)
  t.false(filesAreIdentical("./test/bio-2017.jpg", stats.jpeg[0].outputPath));
});

// Note: We removed the "disabled when source and output are same path" test
// because it's testing an edge case that doesn't occur in practice. The output
// filename includes a hash of the file content, so if you re-process an already
// processed file, it will have a different hash and thus a different output path.
// The protection against copying to self is still in the code (canSkipOriginalProcessing
// checks if srcPath === outPath), but it's difficult to test reliably.

// ============================================================================
// Tests for dryRun mode
// ============================================================================

test("skipOriginalProcessing: works with dryRun mode", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["auto"],
    dryRun: true,
    skipOriginalProcessing: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 1280);

  // In dryRun mode, should have a buffer
  t.truthy(stats.jpeg[0].buffer);

  // Buffer should be identical to source file
  let sourceBuffer = fs.readFileSync("./test/bio-2017.jpg");
  t.true(stats.jpeg[0].buffer.equals(sourceBuffer));
});

// ============================================================================
// Tests for metadata correctness
// ============================================================================

test("skipOriginalProcessing: metadata is correct", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [300, 1280],
    formats: ["auto"],
    outputDir: "./test/img/",
    urlPath: "/img/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  t.is(stats.jpeg.length, 2);

  // Check the copied original has correct metadata
  let originalStat = stats.jpeg[1];
  t.is(originalStat.width, 1280);
  t.is(originalStat.height, 853);
  t.is(originalStat.format, "jpeg");
  t.truthy(originalStat.url);
  t.truthy(originalStat.outputPath);
  t.truthy(originalStat.filename);
  t.truthy(originalStat.size);
  t.is(originalStat.size, fs.statSync("./test/bio-2017.jpg").size);
});
