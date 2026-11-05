const SLIDE_WORD = navigator.language.includes("ru") ? "Слайд" : "Slide";

let slides = [];
let currentSlide = 0;
let lastIntervalId = 0;

const channel = new BroadcastChannel("control");
const domshare = new BroadcastChannel("domshare");
window.addEventListener("load", () => {
  reload();
  firstSlide()
  document.querySelector(".loading")?.remove()
  channel.addEventListener("message", ({ data: idx }) => showSlide(idx, true));
  domshare.addEventListener("message", ({ data }) => {
    if (data === "Hi!") {
      domshare.postMessage(root.innerHTML)
      return
    }
  })
});

const videoObserver = new IntersectionObserver(([{isIntersecting, target}]) => {
  if (target.closest(".book-mode")) {
    return
  }

  if (isIntersecting && target.play) {
    target.play()
  } else if (target.pause) {
    target.pause()
  }
})

function reload() {
  slides = document.querySelectorAll("#root>svg");

  showAll()
  try {
    createVideos(root);
    createImages(root);
  } catch (e) {
    console.log("Images and videos appear to alerady be in place");
    console.warn(e);
  }
  updateDisplayMode();

  domshare.postMessage(root.innerHTML)
  showSlide(currentSlide);
}

function updateDisplayMode() {
  const notes = document.getElementById("notes");
  notes.innerHTML = "";
  const noteBlocks = findNotes();

  if (noteBlocks.filter(Boolean).length > 0) {
    noteBlocks.map(wrapNotes).forEach((el) => notes.appendChild(el));
    document.body.classList.remove("book-mode");
  } else {
    document.body.classList.add("book-mode");
  }

  document.querySelectorAll("a").forEach((el) =>
    el.addEventListener("click", (event) => {
      event.stopPropagation();
    }),
  );
  document.getElementById("next").onclick = nextSlide;
  document.getElementById("prev").onclick = prevSlide;
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
  createTimer();

  showSlide(0);
}
function lastSlide() {
  showSlide(slides.length - 1);
}

function nextSlide() {
  console.log(currentSlide, slides.length, slides);
  if (currentSlide + 1 === slides.length) {
    firstSlide();
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
  slides.forEach((slide) => {
    slide.classList.add("visible");
  });
}

function showSlide(idx, quiet = false) {
  document
    .querySelectorAll(".note-title")
    .forEach((el) => el.classList.remove("highlight"));
  document.getElementById("notes" + idx)?.classList.add("highlight");
  console.log("notes" + idx, document.getElementById("notes" + idx));

  currentSlide = idx;

  slides.forEach((slide, currentIdx) => {
    let videos = Array.from(slide.querySelectorAll("video"));
    if (currentIdx !== idx) {
      slide.classList.remove("visible");
      videos.forEach((video) => {
        video.pause();
        requestAnimationFrame(() => (video.currentTime = 0));
      });
    } else {
      slide.classList.add("visible");
      try {
        videos.forEach((video) => video.play());
      } catch (e) {
        console.error(e);
      }
    }
  });
  if (!quiet) {
    channel.postMessage(idx);
  }
}

function findNotes() {
  const slideList = [...slides]
  return slideList.map((slide) => {
    const textObjects = Array.from(slide.querySelectorAll("g>text"))
      .map(it => it.parentElement)
      .filter(it => it.id?.startsWith("note") || it.getAttribute("inkscape:label")?.startsWith("note"))
      .filter(isInViewBox)
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

function createTimer() {
  const started = new Date();

  clearInterval(lastIntervalId);
  // implicit getElementById
  timer.textContent = "00:00";

  lastIntervalId = setInterval(() => {
    const seconds = (new Date() - started) / 1000;
    timer.textContent =
      prettifyNumber(seconds / 60) + ":" + prettifyNumber(seconds % 60);
  }, 1000);
}

function prettifyNumber(x) {
  if (x > 100) {
    return Math.floor(x);
  }

  return ("00" + Math.floor(x)).slice(-2);
}

function decodeXUriComponent(s) {
  return s.replace(/_x([0-9A-Fa-f]{2,4})_/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function findLabel(root, label = "") {
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
  const illustratorCorel = Array.from(
    root.querySelectorAll(`svg [id${value}]`),
  ).map((element) => ({ element, label: decodeXUriComponent(element.id) }));

  return [...typst, ...inkscape, ...illustratorCorel];
}

function isInViewBox(element) {
  const [pageX, pageY, pageW, pageH] = element.closest("svg").getAttribute("viewBox").split(" ").map(it => +it)
  const { x, y, width, height } = element.getBBox();
  if (x > pageX+pageW ||
      y > pageY+pageH ||
      x+width < pageX ||
      y+height < pageY
  ) {
    return false
  }

  return true
}

function createVideos(root) {
  Array.from(findLabel(root))
    .filter(({ label }) => label.startsWith("vid://"))
    .map(({ label, element }, idx) => {
      console.log({label, element})
      const originalId = element.id
      const video = document.createElement("video");
      video.id = `video-${idx}`
      video.dataset.typstLabel = crypto.randomUUID()
      const fill = element.querySelector(".typst-shape");
      fill?.remove();
      let image = element.querySelector("image");
      if (!image) {
        const { x, y, width, height } = element.getBBox();
        if (!isInViewBox(element)) {
          return
        }
        const transform = [element.getAttribute("transform"), `translate(${x} ${y})`].filter(Boolean).join(" ")
        const invTransform = `translate(${-x} ${-y})`
        element.setAttribute("transform", invTransform)
        element.id = "path-" + video.dataset.typstLabel
        element.removeAttribute("inkscape:label")
        delete element.dataset.typstLabel
        element.outerHTML = `
          <defs>
            <clipPath id="clip-${element.id}">
              ${element.outerHTML}
            </clipPath>
          </defs>
          <g>
            <rect transform="${transform}" fill="red" width="${width}" height="${height}" data-label="${label}">
            </rect>
          </g>
        `;
        image = root.querySelector(`[data-label="${label}"]`);
      }
      video.src = label.replace("vid://", "");
      video.loop = true;
      video.style.background = "transparent"
      video.preload = "auto";
      image.appendChild(video);
      image.outerHTML =
        `<foreignObject data-original-id="${originalId}" transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${element.id})">` +
        image.innerHTML +
        `</foreignObject>
        <g id=${"controls-" + video.dataset.typstLabel} class="controls" transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${element.id})">
        </g>`;
    });

  fixVideos(root)
}

function fixVideos(root) {
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
    rect.setAttribute("fill", el.getAttribute("fill"))
    rect.setAttribute("style", el.getAttribute("style"))
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
    rect.setAttribute("fill", el.getAttribute("fill"))
    rect.setAttribute("style", el.getAttribute("style"))
    root.firstElementChild.appendChild(rect)
    controls.progressFilled = rect
  }

  findLabel(root)
    .filter(it => it.element instanceof HTMLVideoElement)
    .map(it => it.label)
    .forEach(forVideo)

  function forVideo(label) {
    const addedVideo = findLabel(root, label)[0].element
    videoObserver.observe(addedVideo)
    const controlBox = findLabel(root, "controls-"+label)[0]?.element
    if (!controlBox) {
      return
    }
    controlBox.innerHTML = ""
    if (Object.values(controls).every(v => v !== undefined)) {
      console.log({addedVideo, controlBox, label})
      addControls(addedVideo, controlBox, controls)
    }
  }
}

function addControls(video, box, template) {
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
    const progress = video.currentTime / video.duration * full
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
  }
  video.addEventListener("mousemove", handleMouse)
  pb.addEventListener("mousemove", handleMouse)
  pb.addEventListener("mousedown", handleMouse)
  pb.addEventListener("touchmove", ({touches}) => handleMouse({buttons: 1, x: touches[0].clientX}))
  function playPause()  {
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }
  video.addEventListener("click", playPause)
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

function getTypstLabel(label) {
  const anchor = findLabel(document, label)[0]?.element;

  if (!anchor) {
    return undefined;
  }

  const existing = anchor.querySelector("foreignObject");

  if (existing) {
    return existing;
  }

  const foreign = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  anchor.appendChild(foreign);

  return foreign;
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

