Browser-optimized paged export for Typst
with videos, speaker notes, and custom elements.

## Usage with Typst

```typst
#import "@preview/yap:0.1.0": video, notes

#video("example.mp4")
#notes[Speaker notes]
```

If you're using the [Typst web app](https://typst.app),
export as SVG, you'll get a zip.
If you're using the local compiler,
run `typst watch main.typ main{p}.svg`.

Go to the [yap webapp](https://yap.snlx.net)
and select the exported zip or the project folder
(folders are auto-reloaded when the content changes).
You can also find more usage examples and the full API spec there.

When you're done, press `enter` in the viewer to save the document to disk.

## Usage with Inkscape, Illustrator, Corel

Typst may not be the best solution for everyone in every situation,
so yap now supports these.

1. Create a rectangle and name the object `vid://` plus the file name,
   for example, `vid://omni.mp4`
2. Export as SVG and call it `slide1.svg`, `slide2.svg`, etc.

## Extending

There are 2 files to play with:

- `theme.css` if you want to change how the viewer looks
- `extend.js` if you need custom behavior

You can create `box`es or `block`s with `<labels>` from within typst
and then get them as though they are HTML divs using the `getTypstLabel("label")`
function in `extend.js`.

## Background

yap was initially built for a talk at my uni
because different versions of PowerPoint and LibreOffice
handle videos and speaker notes differently and don't play together,
but the browser is the same-ish everywhere.

Then someone I know (non-programmer) needed a way
to make something like a PDF but with embedded videos.
Typst looks like a perfect fit for that, except... No video support.
