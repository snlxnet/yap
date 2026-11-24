// INIT-RELATED STUFF
const SLIDE_WORD = navigator.language.includes("ru") ? "Слайд" : "Slide";

let currentSlide = 0;
let lastIntervalId = 0;

const chSlide = new BroadcastChannel("slide");
const chPlay = new BroadcastChannel("play");
const chDom = new BroadcastChannel("domshare");
window.addEventListener("load", () => {
  reload();
  resetTimer();
  document.querySelector(".loading")?.remove()
  chDom.addEventListener("message", ({ data }) => {
    if (data === "Hi!") {
      chDom.postMessage(root.innerHTML)
      return
    }
  })
});

// RELOAD FUNCTIONS
function reload() {
  showAll()
  try {
    createVideos(root);
    createImages(root);
  } catch (e) {
    console.log("Images and videos appear to alerady be in place");
    console.warn(e);
  }
  reloadNotes()
  rebindControls()

  chDom.postMessage(root.innerHTML)
  showSlide(currentSlide);
}

function reloadNotes() {
  const notes = document.getElementById("notes");
  notes.innerHTML = "";

  const slides = [...document.querySelectorAll("#root>svg")]
  const noteBlocks = slides.map((slide) => {
    const textObjects = Array.from(slide.querySelectorAll("g>text"))
      .map(it => it.parentElement)
      .filter(it => it.id?.startsWith("note") || it.getAttribute("inkscape:label")?.startsWith("note"))
      .filter(isInPage)
      .flatMap(it => it.firstElementChild?.children.length ? Array.from(it.firstElementChild.children) : it)
      .map(it => `${it.textContent}\n`)
    const typstObjects = Array.from(findLabel(slide))
      .filter(({ label }) => label.startsWith("note://"))
      .map(
        ({ label, element }) =>
          label.replace("note://", "") || `<p>${element.textContent}</p>`,
      )
    return [...textObjects, ...typstObjects].join("").replaceAll("\n\n", "</p><p>")
  })

  if (noteBlocks.filter(Boolean).length > 0) {
    noteBlocks.map(wrapNotes).forEach((el) => notes.appendChild(el));
    document.body.classList.remove("book-mode");
  } else {
    document.body.classList.add("book-mode");
  }

  function wrapNotes(note, slideIdx) {
    const container = document.createElement("div");
    container.innerHTML = note || "<p></p>";
    const heading = document.createElement("h2");
    heading.textContent = `${SLIDE_WORD} ${slideIdx + 1}`;
    heading.id = "notes" + slideIdx;
    heading.classList.add("note-title");
    container.prepend(heading);
    return container;
  }
}

// CONTROLS
function rebindControls() {
  document.querySelectorAll("a").forEach((el) =>
    el.addEventListener("click", (event) => {
      event.stopPropagation();
    }),
  );
  document.getElementById("next").onclick = nextSlide;
  document.getElementById("prev").onclick = prevSlide;
}

function resetTimer() {
  const started = new Date();

  clearInterval(lastIntervalId);
  timer.textContent = "00:00";

  lastIntervalId = setInterval(() => {
    const seconds = (new Date() - started) / 1000;
    timer.textContent =
      pad(seconds / 60) + ":" + pad(seconds % 60);
  }, 1000);

  function pad(x) {
    return ("00" + Math.floor(x)).slice(-2);
  }
}

document.addEventListener("keydown", (event) => {
  const actions = {
    ArrowRight: nextSlide,
    ArrowDown: nextSlide,
    ArrowLeft: prevSlide,
    ArrowUp: prevSlide,
    Home: firstSlide,
    End: lastSlide,
  };

  actions[event.key]?.();
});

function firstSlide() {
  resetTimer();
  showSlide(0);
}
function lastSlide() {
  const slides = document.querySelectorAll("#root>svg");
  showSlide(slides.length - 1);
}

function nextSlide() {
  const slides = document.querySelectorAll("#root>svg");
  if (currentSlide + 1 === slides.length) {
    showSlide(0)
  } else {
    showSlide(currentSlide + 1);
  }
}

function prevSlide() {
  if (currentSlide === 0) {
    lastSlide();
  } else {
    showSlide(currentSlide - 1);
  }
}

function showAll() {
  const slides = document.querySelectorAll("#root>svg");
  slides.forEach((slide) => {
    slide.classList.add("visible");
  });
}

// SHOW SLIDE
function showSlide(idx) {
  currentSlide = idx;
  highlightNote(idx)

  document
    .querySelectorAll("#root>svg")
    .forEach((slide, currentIdx) => {
      slide
        .classList
        .toggle("visible", currentIdx === idx)
      slide
        .querySelectorAll("video")
        .forEach(v => {
          v.currentTime = 0
          currentIdx === idx ? v.play() : v.pause()
        })
    });
  chSlide.postMessage(idx);
}

function highlightNote(idx) {
  document
    .querySelectorAll(".note-title")
    .forEach((el) => el.classList.remove("highlight"));
  document.getElementById("notes" + idx)?.classList.add("highlight");
  console.log("notes" + idx, document.getElementById("notes" + idx));
}

// UTILITY / READ
function findLabel(root, label = "") {
  function decodeXUriComponent(s) {
    return s.replace(/_x([0-9A-Fa-f]{2,4})_/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }

  const value = label ? `="${label}"` : "";

  const typst = Array.from(
    root.querySelectorAll(`[data-typst-label${value}]`),
  ).map((element) => ({ element, label: element.dataset.typstLabel }));
  const inkscape = Array.from(
    root.querySelectorAll(`[inkscape\\:label${value}]`),
  ).map((element) => ({
    element,
    label: decodeXUriComponent(element.getAttribute("inkscape:label")),
  }));
  const generic = Array.from(
    root.querySelectorAll(`svg [id${value}]`),
  ).map((element) => ({ element, label: decodeXUriComponent(element.id) }));

  return [...typst, ...inkscape, ...generic];
}

function isInPage(element) {
  const [pageX, pageY, pageW, pageH] = element.closest("svg").getAttribute("viewBox").split(" ").map(it => +it)
  const { x, y, width, height } = element.getBBox();
  return !(x > pageX+pageW ||
      y > pageY+pageH ||
      x+width < pageX ||
      y+height < pageY
  )
}

// UTILITY / WRITE
function createVideos(root) {
  Array.from(findLabel(root))
    .filter(({ label }) => label.startsWith("vid://"))
    .map(({ label, element: parent }, idx) => {
      if (!isInPage(parent)) {
        return
      }

      const originalId = parent.id
      const uiid = "vi-" + label.slice(-15) // Unique Ish IDentifier

      const fill = parent.querySelector(".typst-shape");
      fill?.remove();

      let image = parent.querySelector("image");
      if (!image) {
        const { x, y, width, height } = parent.getBBox();
        const transform = [parent.getAttribute("transform"), `translate(${x} ${y})`].filter(Boolean).join(" ")
        const invTransform = `translate(${-x} ${-y})`
        parent.setAttribute("transform", invTransform)
        parent.id = "path-" + uiid
        parent.removeAttribute("inkscape:label")
        delete parent.dataset.typstLabel
        parent.outerHTML = `
          <defs>
            <clipPath id="clip-${parent.id}">
              ${parent.outerHTML}
            </clipPath>
          </defs>
          <g>
            <rect transform="${transform}" fill="red" width="${width}" height="${height}" data-label="${label}">
            </rect>
          </g>
        `;
        image = root.querySelector(`[data-label="${label}"]`);
      }

      const video = document.createElement("video");
      video.id = `video-${idx}`
      video.dataset.typstLabel = uiid
      video.loop = true;
      video.setAttribute("playsinline", "")
      video.style.background = "transparent"
      video.preload = "auto";
      video.src = label.replace("vid://", "");

      // Works around WebKit's bug 23113
      const canvas = document.createElement("canvas")
      image.appendChild(canvas);
      image.appendChild(video);

      image.outerHTML =
        `<foreignObject data-original-id="${originalId}" transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${parent.id})">` +
        image.innerHTML +
        `</foreignObject>
        <g id=${"controls-" + video.dataset.typstLabel} class="controls" transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${parent.id})">
        </g>`;
    });

  fixVideos(root)
}

function fixVideos(root) {
  const ua = navigator.userAgent;
  const isWebkit = (
    (ua.includes("AppleWebKit") && !ua.includes("Chrome") && !ua.includes("Chromium")) ||
    /\b(iPhone|iPad|iPod)\b/.test(ua)
  );

  const controls = {
    gap: getBox(findLabel(root, "player-gap")[0]?.element),
    progressNotFilled: findLabel(root, "player-progress-not-filled")[0]?.element,
    progressFilled: findLabel(root, "player-progress-filled")[0]?.element,
    head: findLabel(root, "player-head")[0]?.element,
    buttonPlay: findLabel(root, "player-button-play")[0]?.element,
    buttonPause: findLabel(root, "player-button-pause")[0]?.element,
    radius: getBox(findLabel(root, "player-radius")[0]?.element).width,
  }

  if (controls.progressNotFilled?.tagName?.toLowerCase() === "g") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    const el = controls.progressNotFilled.querySelector("path")
    const { width, height } = getBox(el)
    rect.setAttribute("width", width)
    rect.setAttribute("height", height)
    rect.setAttribute("transform", `translate(0, ${-height*100})`)
    rect.setAttribute("style", el.getAttribute("style"))
    rect.setAttribute("fill", window.getComputedStyle(el).fill)
    root.firstElementChild.appendChild(rect)
    controls.progressNotFilled = rect
  }
  if (controls.progressFilled?.tagName?.toLowerCase() === "g") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    const el = controls.progressFilled.querySelector("path")
    const { width, height } = getBox(el)
    rect.setAttribute("width", width)
    rect.setAttribute("height", height)
    rect.setAttribute("transform", `translate(0, ${-height*100})`)
    rect.setAttribute("style", el.getAttribute("style"))
    rect.setAttribute("fill", window.getComputedStyle(el).fill)
    root.firstElementChild.appendChild(rect)
    controls.progressFilled = rect
  }

  findLabel(root)
    .filter(it => it.element instanceof HTMLVideoElement)
    .map(it => it.label)
    .forEach(forVideo)

  function forVideo(label) {
    const video = findLabel(root, label)[0].element
    const controlBox = findLabel(root, "controls-"+label)[0]?.element
    if (!controlBox) {
      return
    }
    controlBox.innerHTML = ""

    let canvas = video.parentElement.querySelector("canvas")
    const ctx = canvas.getContext("2d");
    let loaded = false
    function frame() {
      requestAnimationFrame(frame);
      if (video.loaded && loaded) {
        if (video.paused) return;
      }
      loaded = video.loaded
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    if (isWebkit) {
      video.style.visibility = "hidden"
      frame()
    } else {
      canvas.remove()
      canvas = video
    }

    if (Object.values(controls).every(v => v !== undefined)) {
      addControls(canvas, video, controlBox, controls)
    }
  }
}

function addControls(canvas, video, box, template) {
  const size = video.parentElement.getBBox()
  const gap = template.gap

  const pauseSize = getBox(template.buttonPause)
  const pause = template.buttonPause.cloneNode(true)
  console.log({pauseSize})
  pause.setAttribute("transform", `translate(${gap.width}, ${size.height - pauseSize.height - gap.height})`)
  box.appendChild(pause)

  const playSize = getBox(template.buttonPlay)
  const play = template.buttonPlay.cloneNode(true)
  console.log({playSize})
  play.setAttribute("transform", `translate(${gap.width}, ${size.height - playSize.height - gap.height})`)
  box.appendChild(play)

  video.addEventListener("play", () => {
    pause.style.opacity = 1
    play.style.opacity = 0
  })
  video.addEventListener("pause", () => {
    pause.style.opacity = 0
    play.style.opacity = 1
  })

  const pbSize = getBox(template.progressNotFilled)
  const pb = template.progressNotFilled.cloneNode(true)
  pb.setAttribute("transform", `translate(${gap.width*2 + pauseSize.width}, ${size.height - playSize.height/2 - gap.height - pbSize.height/2})`)
  pb.setAttribute("width", size.width - gap.width*3 - pauseSize.width)
  pb.setAttribute("ry", template.radius)
  box.appendChild(pb)

  const pfSize = getBox(template.progressFilled)
  const pf = template.progressFilled.cloneNode(true)
  pf.setAttribute("transform", `translate(${gap.width*2 + pauseSize.width}, ${size.height - playSize.height/2 - gap.height - pfSize.height/2})`)
  pf.setAttribute("width", 0)
  pf.setAttribute("ry", template.radius)
  pf.style.pointerEvents = "none"
  box.appendChild(pf)

  const headSize = getBox(template.head)
  const head = template.head.cloneNode(true)
  head.setAttribute("transform", `translate(${gap.width*2 + pauseSize.width - headSize.width/2}, ${size.height - playSize.height/2 - gap.height - headSize.height/2})`)
  head.style.pointerEvents = "none"
  box.appendChild(head)

  video.addEventListener("timeupdate", () => {
    const full = size.width - gap.width*3 - pauseSize.width
    const progress = (video.currentTime / video.duration * full) || 0
    pf.setAttribute("width", progress)
    head.setAttribute("transform", `translate(${gap.width*2 + pauseSize.width + progress - headSize.width/2}, ${size.height - playSize.height/2 - gap.height - headSize.height/2})`)
  })

  function handleMouse({buttons, x}) {
    if (!buttons) {
      return
    }

    const { left, width } = pb.getBoundingClientRect()
    const progress = (x - left) / width

    video.currentTime = video.duration * progress
    chPlay.postMessage({id: video.id, time: video.currentTime})
  }
  canvas.addEventListener("mousemove", handleMouse)
  pb.addEventListener("mousemove", handleMouse)
  pb.addEventListener("mousedown", handleMouse)
  pb.addEventListener("touchmove", ({touches}) => handleMouse({buttons: 1, x: touches[0].clientX}))
  function playPause()  {
    chPlay.postMessage({id: video.id, play: video.paused})
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }
  canvas.addEventListener("click", playPause)
  play.addEventListener("click", playPause)
}

function createImages(root) {
  Array.from(root.querySelectorAll("[data-typst-label]"))
    .filter((element) => element.dataset.typstLabel?.startsWith("img"))
    .map((parent) => {
      const [metadata, url] = parent.dataset.typstLabel.split("://");
      const anchor = parent.querySelector(".typst-shape");
      const rectShape = anchor.attributes.getNamedItem("d").value.split(" ");
      const height = rectShape.at(3);
      const width = rectShape.at(5);
      const [_img, fit] = metadata.split("-");
      parent.innerHTML = `<foreignObject width="${width}" height="${height}"><img src="${url}" style="object-fit: ${fit}" /></foreignObject>`;
    });
}

// Utility function mostly by GPT-6 Luna
function getBox(element) {
  if (!element) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }
  }

  const svg = root.firstElementChild
  const box = element.getBBox();
  const toSvg = svg.getScreenCTM().inverse()
    .multiply(element.getScreenCTM());

  const corners = [
    new DOMPoint(box.x, box.y),
    new DOMPoint(box.x + box.width, box.y),
    new DOMPoint(box.x, box.y + box.height),
    new DOMPoint(box.x + box.width, box.y + box.height),
  ].map(point => point.matrixTransform(toSvg));

  const xs = corners.map(p => p.x);
  const ys = corners.map(p => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

