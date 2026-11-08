#let vidata = plugin("vidata.wasm") // source: https://github.com/snlxnet/vidata

#let fs-enabled = state("yap-enable-fs", false)
#let use-local() = fs-enabled.update((_current) => true)

/// Speaker notes for the current page.
/// Intended for presentations.
/// Show up on the left in the viewer.
#let notes(
  /// The text of the note.
  /// You can only use
  /// regular text, *bold*, _italic_,
  /// #link("https://snlx.net/yaptyp", underline[links]),
  /// - lists
  /// 1. and other lists
  ///
  /// -> content
  body
) = {
  let to-html(it) = {
    if type(it) == str {
      it
    } else if type(it) != content {
      str(it)
    } else if it.func() == parbreak {
      "</p><p>"
    } else if it.has("text") {
      it.text
    } else if it.has("children") {
      it.children.map(to-html).join()
    } else if it.has("body") {
      let wrapper = if it.func() == strong {
        ("<strong>", "</strong>")
      } else if it.func() == emph {
        ("<em>", "</em>")
      } else if it.func() == heading {
        let level = str(it.depth)
        ("#"*level+" ", "\n")
      } else if it.func() == link {
        ("<a href=\""+it.dest+"\">", "</a>")
      } else if it.func() == list.item {
        ("<ul><li>", "</li></ul>")
      } else if it.func() == enum.item {
        ("<ol><li>", "</li></ol>")
      } else {
        ("", )
      }
      wrapper.first() + to-html(it.body) + wrapper.last()
    } else if it == [ ] {
      " "
    }
  }

  let url = "note://<p>" + to-html(body).replace("</ul> <ul>", "").replace("</ol> <ol>", "") + "</p>"
  place(top + left)[#box(width: 0mm, height: 0mm, fill: none, stroke: none)#label(url)]
}

/// A video.
///
/// You can use it as though it is an image,
/// wrapping it in boxes, figures, etc.
///
/// -> content
#let video(
  /// A path to a video file.
  /// Only tested with .mp4, but may work with other formats.
  ///
  /// -> path
  source,
  /// The ratio between the top and left sides of the video.
  ///
  /// Examples: landscape `"16/9"`, landscape `"4/3"`,
  /// portrait `"9/16"`, square `"1/1"`, in pixels `"640/480"`,
  /// as a decimal fraction `"1.333"`.
  ///
  /// Default: `"16/9"` or taken from the actual file if you've called `#use-local()`
  ///
  /// -> str
  aspect-ratio: "16/9",
  /// The width of the video.
  ///
  /// -> auto | relative
  width: auto,
  /// The height of the video.
  ///
  /// -> auto | relative
  height: auto,
) = context {
  let vertical = none

  let placeholder = ```xml
    <svg viewBox="0 0 WIDTH HEIGHT" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:h5="http://www.w3.org/1999/xhtml">
    </svg>
  ```.text

  // Auto aspect ratio
  if (not source.contains("://")) and fs-enabled.get() and source.ends-with(".mp4") {
    let metadata = vidata.from(read(source, encoding: none))
    let video = eval(str(metadata)).find(track => track.type == "Video")
    vertical = video.height > video.width

    placeholder = placeholder.replace("WIDTH", str(video.width)).replace("HEIGHT", str(video.height))
  }

  // Manual aspect ratio
  {
    let width = float(eval(aspect-ratio))
    let height = 1.0
    if vertical == none {
      vertical = height > width
    }
    placeholder = placeholder
      .replace("WIDTH", str(width*1000))
      .replace("HEIGHT", str(height*1000))
  }

  // Build the placeholder image
  placeholder = image(
    bytes(placeholder),
    format: "svg",
  )

  [#box(fill: rgb("12345678"), width: width, align(center+horizon, placeholder))#label("vid://" + source)]
}

/// An external image.
/// Typst's default `#image`'s
/// are embedded into the SVG, resulting in large file sizes, which
/// can be a problem if used in a website.
/// YapTyp's `#img` loads them separately.
#let img(
  /// -> path
  source,
  /// -> auto | relative
  width: auto,
  /// -> auto | relative
  height: auto,
  /// "cover" or "contain"
  /// -> str
  fit: "cover",
) = [#box(fill: rgb("12345678"), hide(image(source, width: width, height: height, fit: fit)))#label("img-" + fit + "://" + source)]

/// The video controls element.
/// Calling this will place it within the page, use `set-controls` instead.
#let controls(
  h: 12mm,
  gap: 3mm,
  rad: 3mm,
  base: rgb("#121212"),
  playing: rgb("#a8a5ff"),
  stop: rgb("#ff8383"),
  handle-width: 5mm,
  handle-color: rgb("#eee")
) = {
  let transparent = rgb("#00000000")
  place[
    #box(
      height: h,
      width: h,
      fill: playing,
      radius: rad,
    )[
      #set text(fill: rgb("#2e2d39"), 24pt, baseline: -0.1em)
      #align(center+horizon, sym.triangle.filled.r)
    ]<player-button-play>
  ]
  place[
    #box(
      height: h,
      width: h,
      fill: stop,
      radius: rad,
    )[
      #set text(fill: rgb("#2e2d39"), 24pt)
      #align(center+horizon, rotate(90deg, sym.eq))
    ]<player-button-pause>
  ]
  place(dy: h+gap)[
    #box(width: gap, height: gap, fill: black)<player-gap>
    player-gap
  ]
  place(dy: 2*h+gap)[
    #box(width: rad, height: rad, fill: black)<player-radius>
    player-radius
  ]
  place(dx: h+gap)[
    #box(
      height: h,
      width: 120mm,
      fill: rgb("#121212"),
    )<player-progress-not-filled>
  ]
  place(dx: h+gap)[
    #box(
      height: h,
      width: 80mm,
      fill: playing,
    )<player-progress-filled>
  ]
  place(dx: h+gap+80mm-handle-width/2, dy: -h*0.1)[
    #box(
      height: h*1.2,
      width: handle-width,
      fill: handle-color,
      radius: rad/2,
    )[
      #align(
        horizon+center,
        box(width: 0.5mm, height: h*0.7, fill: base, radius: 1mm)
      )
    ]<player-head>
  ]
}

/// Create a video controls element off-page.
/// Arguments are the same as `controls`.
#let set-controls(..args) = place(dx: -1000mm, controls(..args))

