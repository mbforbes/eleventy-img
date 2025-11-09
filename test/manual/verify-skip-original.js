import fs from "node:fs";
import eleventyImage from "./img.js";

// Helper to compare files
function filesAreIdentical(file1, file2) {
  const buffer1 = fs.readFileSync(file1);
  const buffer2 = fs.readFileSync(file2);
  return buffer1.equals(buffer2);
}

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + " KB";
}

console.log("\n=== Testing skipOriginalProcessing Feature ===\n");

// Clean output directory
const outputDir = "./test/img-manual/";
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}

(async () => {
  const sourceImage = "./test/bio-2017.jpg";
  const sourceStats = fs.statSync(sourceImage);

  console.log("📁 Source Image:");
  console.log(`   Path: ${sourceImage}`);
  console.log(`   Size: ${formatBytes(sourceStats.size)}\n`);

  // Test 1: WITH skipOriginalProcessing (should copy)
  console.log("🔵 Test 1: skipOriginalProcessing = true");
  console.log("   (Original size should be copied, smaller sizes processed)\n");

  const stats1 = await eleventyImage(sourceImage, {
    widths: [300, 640, 1280], // 1280 is original width
    formats: ["auto"],
    outputDir: outputDir,
    skipOriginalProcessing: true,
    useCache: false,
    sharpJpegOptions: {
      mozjpeg: true,
      quality: 90,
    },
  });

  console.log("   Results:");
  for (let img of stats1.jpeg) {
    const outputStats = fs.statSync(img.outputPath);
    const isIdentical = filesAreIdentical(sourceImage, img.outputPath);
    const icon = isIdentical ? "✅ IDENTICAL (copied)" : "🔧 PROCESSED";

    console.log(`   ${img.width}px: ${formatBytes(outputStats.size)} ${icon}`);
    console.log(`          ${img.outputPath}`);
  }

  // Test 2: WITHOUT skipOriginalProcessing (should process all)
  console.log("\n🔴 Test 2: skipOriginalProcessing = false (default)");
  console.log("   (All sizes should be processed, none identical)\n");

  const stats2 = await eleventyImage(sourceImage, {
    widths: [300, 640, 1280],
    formats: ["auto"],
    outputDir: outputDir + "no-skip/",
    skipOriginalProcessing: false, // explicitly disabled
    useCache: false,
    sharpJpegOptions: {
      mozjpeg: true,
      quality: 90,
    },
  });

  console.log("   Results:");
  for (let img of stats2.jpeg) {
    const outputStats = fs.statSync(img.outputPath);
    const isIdentical = filesAreIdentical(sourceImage, img.outputPath);
    const icon = isIdentical ? "✅ IDENTICAL" : "🔧 PROCESSED (re-compressed)";

    console.log(`   ${img.width}px: ${formatBytes(outputStats.size)} ${icon}`);
    console.log(`          ${img.outputPath}`);
  }

  // Test 3: Multiple formats (only matching format should be copied)
  console.log("\n🟡 Test 3: Multiple formats");
  console.log("   (JPEG should be copied, WebP should be processed)\n");

  const stats3 = await eleventyImage(sourceImage, {
    widths: [1280],
    formats: ["jpeg", "webp"],
    outputDir: outputDir + "multi-format/",
    skipOriginalProcessing: true,
    useCache: false,
  });

  console.log("   Results:");
  if (stats3.jpeg) {
    for (let img of stats3.jpeg) {
      const outputStats = fs.statSync(img.outputPath);
      const isIdentical = filesAreIdentical(sourceImage, img.outputPath);
      const icon = isIdentical ? "✅ IDENTICAL (copied)" : "🔧 PROCESSED";

      console.log(`   JPEG: ${formatBytes(outputStats.size)} ${icon}`);
      console.log(`         ${img.outputPath}`);
    }
  }

  if (stats3.webp) {
    for (let img of stats3.webp) {
      const outputStats = fs.statSync(img.outputPath);
      const isIdentical = filesAreIdentical(sourceImage, img.outputPath);
      const icon = isIdentical ? "✅ IDENTICAL" : "🔧 PROCESSED (format conversion)";

      console.log(`   WebP: ${formatBytes(outputStats.size)} ${icon}`);
      console.log(`         ${img.outputPath}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log("✅ When skipOriginalProcessing is enabled:");
  console.log("   - Original size + matching format = COPIED (preserves exact quality)");
  console.log("   - Smaller sizes = PROCESSED (applies quality settings)");
  console.log("   - Different formats = PROCESSED (format conversion required)");
  console.log("\n🔍 You can now inspect the files in ./test/img-manual/");
  console.log("");
})();
