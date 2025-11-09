#!/usr/bin/env node

/**
 * Generates test images (currently 50) with slight variations for benchmarking.
 * Each image gets a tiny tint variation to ensure unique file hashes.
 */

import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const SOURCE_IMAGE = "./test/exif-sample-large.jpg";
const OUTPUT_DIR = "./benchmark/images";
const IMAGE_COUNT = 50;

console.log("🖼️  Benchmark Image Generator");
console.log("================================\n");

// Create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  console.log("⚠️  Output directory exists, cleaning...");
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`📁 Created ${OUTPUT_DIR}/\n`);

console.log(`Generating ${IMAGE_COUNT} images with variations...`);
console.log("(This will take a few minutes)\n");

const startTime = Date.now();
let completed = 0;
const batchSize = 50; // Process in batches to show progress

async function generateImage(index) {
  // Add a very subtle variation based on index
  // This makes each file unique without significantly changing the image
  const brightnessVariation = 100 + (index % 3) - 1; // 99, 100, or 101
  const saturationVariation = 100 + (index % 5); // 100-104

  const outputPath = `${OUTPUT_DIR}/${index}.jpg`;

  // Use ImageMagick to create a slightly varied version
  const cmd = `magick "${SOURCE_IMAGE}" -modulate ${brightnessVariation},${saturationVariation},100 "${outputPath}"`;

  await execAsync(cmd);
}

async function processBatch(start, end) {
  const promises = [];
  for (let i = start; i < end && i < IMAGE_COUNT; i++) {
    promises.push(generateImage(i));
  }
  await Promise.all(promises);
  completed += promises.length;

  const percent = ((completed / IMAGE_COUNT) * 100).toFixed(1);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(
    `\r  Progress: ${completed}/${IMAGE_COUNT} (${percent}%) - ${elapsed}s elapsed`
  );
}

async function main() {
  try {
    // Process in batches
    for (let i = 0; i < IMAGE_COUNT; i += batchSize) {
      await processBatch(i, i + batchSize);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n✅ Generated ${IMAGE_COUNT} images in ${totalTime}s`);

    // Verify file sizes
    const files = fs.readdirSync(OUTPUT_DIR);
    const sampleSize = fs.statSync(`${OUTPUT_DIR}/0.jpg`).size;
    console.log(`\n📊 Stats:`);
    console.log(`   Files created: ${files.length}`);
    console.log(`   Sample size: ${(sampleSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `   Total size: ${((sampleSize * files.length) / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(`\n✨ Ready for benchmarking!`);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
