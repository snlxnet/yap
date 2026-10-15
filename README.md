<img src="card-en.svg" alt="yap - presentation & interactive book engine" style="width: 100%">

[Open](https://yap.snlx.net)

## Getting started
Open the saved file in *Illustrator* / Corel / Inkscape

Try drawing a shape or deleting this text and saving.

## Adding videos
Create an object (rectangle, ellipse, closed path,
closed path with holes in it) and save.

Open your file explorer, find a video you want to insert
and drag it onto the new element in your browser.

The video controls can be customized too.
Just keep their names and make sure the progress
bar is a rectangle.

## Adding pages / slides
A page and a slide are the same thing.
Since SVG doesn't support multiple pages natively,
a page is a rectangle sized the same as the artboard.

Pages are ordered hierarchically. If you create a layer
above this and draw a page on it, that page will be
third. Note that the pages must not overlap.

## Usage in Typst
```
#import "@preview/yap:0.1.0": video, notes

#video("example.mp4")
#notes[Speaker notes]
```

Export as SVG and open the zip file in [the app](https://yap.snlx.net)
