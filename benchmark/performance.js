#!/usr/bin/env node

/**
 * Benchmarks eleventy-img performance with and without skipOriginalProcessing.
 * Processes images at original width + half width.
 */

import fs from "node:fs";
import eleventyImage from "./img.js";

const IMAGES_DIR = "./benchmark/images";
const OUTPUT_DIR_SKIP = "./benchmark/output-skip";
const OUTPUT_DIR_NO_SKIP = "./benchmark/output-no-skip";
const ORIGINAL_WIDTH = 4048;
const HALF_WIDTH = 2024;

// Process a subset for faster testing (set to null to process all)
const LIMIT = process.argv[2] ? parseInt(process.argv[2]) : null;

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatRate(imagesPerSecond) {
  return `${imagesPerSecond.toFixed(2)} img/s`;
}

async function processImages(skipOriginal, outputDir, imageFiles) {
  const startTime = Date.now();
  let processed = 0;
  const total = imageFiles.length;

  console.log(`\nProcessing ${total} images...`);

  // Process images one at a time to avoid overwhelming the system
  for (const file of imageFiles) {
    const imagePath = `${IMAGES_DIR}/${file}`;

    await eleventyImage(imagePath, {
      widths: [HALF_WIDTH, ORIGINAL_WIDTH],
      formats: ["auto"],
      outputDir: outputDir,
      skipOriginalProcessing: skipOriginal,
      useCache: true, // Use cache to simulate real-world usage
      sharpJpegOptions: {
        mozjpeg: true,
        quality: 90,
      },
    });

    processed++;

    if (processed % 50 === 0 || processed === total) {
      const elapsed = Date.now() - startTime;
      const rate = (processed / elapsed) * 1000;
      const percent = ((processed / total) * 100).toFixed(1);
      process.stdout.write(
        `\r  Progress: ${processed}/${total} (${percent}%) - ${formatRate(
          rate
        )} - ${formatTime(elapsed)} elapsed`
      );
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(); // New line after progress

  return {
    totalTime,
    imageCount: total,
    imagesPerSecond: (total / totalTime) * 1000,
  };
}

function formatResults(label, results) {
  console.log(`\n${label}:`);
  console.log(`  Images processed: ${results.imageCount}`);
  console.log(`  Total time: ${formatTime(results.totalTime)}`);
  console.log(
    `  Average time per image: ${formatTime(
      results.totalTime / results.imageCount
    )}`
  );
  console.log(`  Throughput: ${formatRate(results.imagesPerSecond)}`);
}

async function main() {
  console.log("🚀 eleventy-img Performance Benchmark");
  console.log("======================================\n");
  console.log(`Image size: ${ORIGINAL_WIDTH}x3036 (3.9MB JPEG)`);
  console.log(`Widths: [${HALF_WIDTH}, ${ORIGINAL_WIDTH}] (half + original)`);
  console.log(`Format: auto (JPEG → JPEG)`);
  console.log(`Quality: 90 (mozjpeg)`);

  // Check if benchmark images exist
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`\n❌ Error: ${IMAGES_DIR} not found!`);
    console.error(`Run: node benchmark-generate-images.js first\n`);
    process.exit(1);
  }

  // Get list of images
  let imageFiles = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (LIMIT) {
    imageFiles = imageFiles.slice(0, LIMIT);
    console.log(`\n⚠️  Testing with first ${LIMIT} images only`);
  }

  console.log(`\nFound ${imageFiles.length} images to process\n`);

  // Clean output directories
  [OUTPUT_DIR_SKIP, OUTPUT_DIR_NO_SKIP].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir, { recursive: true });
  });

  // Test 1: WITHOUT skipOriginalProcessing (baseline)
  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: skipOriginalProcessing = false (baseline)");
  console.log("=".repeat(60));
  console.log("Both widths will be processed through Sharp");

  const resultsNoSkip = await processImages(
    false,
    OUTPUT_DIR_NO_SKIP,
    imageFiles
  );
  formatResults("Results (WITHOUT skipOriginalProcessing)", resultsNoSkip);

  // Test 2: WITH skipOriginalProcessing
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: skipOriginalProcessing = true (optimized)");
  console.log("=".repeat(60));
  console.log("Original width will be copied, half width will be processed");

  const resultsSkip = await processImages(true, OUTPUT_DIR_SKIP, imageFiles);
  formatResults("Results (WITH skipOriginalProcessing)", resultsSkip);

  // Comparison
  console.log("\n" + "=".repeat(60));
  console.log("COMPARISON");
  console.log("=".repeat(60));

  const speedup = resultsNoSkip.totalTime / resultsSkip.totalTime;
  const timeSaved = resultsNoSkip.totalTime - resultsSkip.totalTime;
  const percentFaster = ((speedup - 1) * 100).toFixed(1);

  console.log(`\nTime saved: ${formatTime(timeSaved)}`);
  console.log(`Speedup: ${speedup.toFixed(2)}x faster`);
  console.log(`Performance improvement: ${percentFaster}%`);

  // Verify one file was copied correctly
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION");
  console.log("=".repeat(60));

  const originalFile = `${IMAGES_DIR}/0.jpg`;
  const originalSize = fs.statSync(originalFile).size;
  const originalBuffer = fs.readFileSync(originalFile);

  // Find which output file is identical to the original
  const skipOutputFiles = fs
    .readdirSync(OUTPUT_DIR_SKIP)
    .filter((f) => f.endsWith(`-${ORIGINAL_WIDTH}.jpeg`));

  let foundIdentical = false;
  for (const file of skipOutputFiles) {
    const filePath = `${OUTPUT_DIR_SKIP}/${file}`;
    const fileBuffer = fs.readFileSync(filePath);

    if (originalBuffer.equals(fileBuffer)) {
      const fileSize = fs.statSync(filePath).size;
      console.log(`\n✅ Found byte-for-byte identical copy!`);
      console.log(
        `   Original: ${originalFile} (${(originalSize / 1024 / 1024).toFixed(
          2
        )} MB)`
      );
      console.log(
        `   Copied:   ${file} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`
      );
      foundIdentical = true;
      break;
    }
  }

  if (!foundIdentical) {
    console.log(`\n❌ ERROR: No identical file found!`);
    console.log(
      `   Checked ${skipOutputFiles.length} files at original width.`
    );
  }

  console.log("\n✨ Benchmark complete!\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
