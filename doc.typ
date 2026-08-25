#import "@preview/tidy:0.4.3"
#import "@preview/catppuccin:1.1.0": catppuccin, flavors, show-module
#import "yap.typ": notes, video, use-local
#use-local()

#let flavor = flavors.mocha
#let teal = flavor.colors.teal.rgb
#let white = flavor.colors.text.rgb

#set text(font: "JetBrains Mono", size: 14pt)
#show raw: set text(font: "JetBrains Mono", size: 14pt)
#set align(horizon)
#show: catppuccin.with(flavor)

#set page(
  paper: "a5",
  flipped: true,
  margin: (top: 3cm, bottom: 1cm, x: 1cm),
  fill: flavor.colors.mantle.rgb,
  header: place(dy: 10mm, {
    set text(16pt)

    box(
      fill: rgb("#1e1e2e"),
      stroke: 1mm + teal,
      radius: 1em,
      outset: (y: 5mm, x: 5mm),
      grid(
        columns: (1fr, auto),
        align: horizon,
        link(
          "https://snlx.net",
          image(
            "logo.svg",
            height: 1.2em,
          ),
        ),
        [project *yap* | #text(fill: teal)[2026]]
      ),
    )
  }),
)

#set align(center)
#text(size: 24pt)[Browser-optimized paged export]\
#v(2mm)
With videos and speaker notes
#v(1cm)

#let button(color, message) = box(
  baseline: 0.6em,
  inset: 0.6em,
  stroke: 1mm + color,
  fill: rgb("12345600"),
  radius: 0.6em,
  text(fill: color, message),
)

#button(white)[(Zipped) SVGs]<zip>
#h(2mm)
#button(teal)[Folder with SVGs]<dir>\

#align(bottom)[enter = save]

#notes[
  yap is a presentation builder with video and speaker note support.
]

#pagebreak()
#set page(columns: 2)

```typst
#import "@preview/yap:0.1.0":*

// tell the compiler it has local video files
#use-local()

#figure(
  video("omni.mp4"),
  caption: "Example video",
)

#notes[Usage w/ Typst]
```

#figure(
  video("omni.mp4"),
  caption: "Example video",
)

#notes[Here's how to use it with Typst]

#set page(columns: 1)
#pagebreak()
\*This slide should be overwritten by one made with Inkscape\*
#pagebreak()

#text(size: 24pt)[Slide mode & Book mode]

#button(white)[Toggle book mode]<book>

#notes[
  If your doc has `#notes`, it is considered a presentation.
  Presentations have this sidebar with the fullscreen button.

  Save the presentation (with enter), open a tab with the saved file
  on the primary screen and another one on the projector,
  fullscreen the projector one. They will sync.

  If you don't have notes, the doc will be rendered
  as a list of pages. If your screen is wide enough,
  it will fit 2 or 3 pages at once, then you need to scroll.
]

#pagebreak()
#set align(left)
#notes[JS API]

Yap's functionality can be easily extended:
#stack(
  dir: ltr,
  [
    ```typst
    // your-file.typ
    #set box(width: 2cm, height: 1cm)

    #box(fill: teal)<say-hi>

    #box(stroke: teal)<input>
    ```
    #v(5mm)
    ```js
    // extend.js
    getTypstLabel("say-hi").onclick = () => alert("hi")

    const input = document.createElement("input")
    input.type = "color"
    getTypstLabel("input").appendChild(input)
    ```
  ],
  h(5mm),
  [
    #set box(width: 2cm, height: 1cm)

    #box(fill: teal)<say-hi>

    #box(stroke: teal)<input>
  ]
)

You can also create `theme.css` which will be auto linked.

#pagebreak()
#notes[Typst API]

#let docs = tidy.parse-module(read("yap.typ"))
#set align(top+left)
#set text(size: 11pt)
#show raw: set text(size: 11pt)
#show-module(docs, show-outline: false)

#align(bottom+center)[\@snlxnet 2026]
