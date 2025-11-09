# @mbforbes/eleventy-img

This is a fork of [@11ty/eleventy-img](https://github.com/11ty/eleventy-img) with the `skipOriginalProcessing` optimization.

## Why?

This fork adds the `skipOriginalProcessing` option which provides a speedup when generating responsive images that include the original width.

See the [main README](https://github.com/11ty/eleventy-img#readme) for full documentation.

## Additional Feature: skipOriginalProcessing

```javascript
import Image from "@mbforbes/eleventy-img";

let metadata = await Image(src, {
  widths: [500, 1000, 2000], // 2000 is original width
  formats: ["auto"],
  skipOriginalProcessing: true, // New
  sharpJpegOptions: {
    quality: 90,
  },
});
```

When enabled, the original-width output is copied directly instead of being re-processed, preserving exact quality and significantly improving performance.

**Performance**: For 50 images w/ 2 widths (original, 1/2 width), this speeds up builds by ~2.8x, from 54s to 19s.

See [benchmark/RESULTS.md](./benchmark/RESULTS.md) for detailed performance analysis.

## Upstream

This fork tracks [@11ty/eleventy-img](https://github.com/11ty/eleventy-img) and may be contributed back upstream.

Original repository: https://github.com/11ty/eleventy-img
