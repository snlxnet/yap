#import "yap.typ": video, controls

#let accent = rgb("#a8a5ff")

#set page(fill: rgb("#2e2d39"))
#set text(fill: rgb("#eeeeee"), font: "comfortaa", size: 16pt, weight: "bold")
#show heading: set text(fill: accent, size: 24pt)
#show raw: set text(fill: accent)
#show link: it => text(fill: accent, underline(it))

= Getting started
+ Open this in #underline[Inkscape] or Adobe Illustrator
+ Draw any shape here: #v(9cm)
//+ #import "@preview/yap:0.1.0": video
//  #video("https://weldlab.github.io/video/omni.mp4")
+ Find its object in the layer and give it a name
+ Download any video, I've used #link("https://weldlab.github.io/video/omni.mp4")[this one]
+ Drag & drop the video onto the shape in the browser

Copy the background rectangle and move it to the right to make a second page.

= Presentation Mode
+ Create a text object and write something
+ Press `Ctrl + G` on it to make a group
+ Rename that group to start with `notes` (e.g., `notes 1`)
+ Put it behind the page background

= Export
Press `Ctrl + E` to save as a standalone HTML file.

#let set-controls(..args) = place(dx: -1000mm, controls(..args))

#set-controls()

