const SLIDE_WORD = navigator.language.includes("ru") ? "Слайд" : "Slide";

let slides = [];
let currentSlide = 0;
let lastIntervalId = 0;

const channel = new BroadcastChannel("control");
window.addEventListener("load", () => {
  reload();
  firstSlide()
  channel.addEventListener("message", ({ data: idx }) => showSlide(idx, true));
});

const videoObserver = new IntersectionObserver(([{isIntersecting, target}]) => {
  if (isIntersecting && target.play) {
    target.play()
  } else if (target.pause) {
    target.pause()
  }
})

function reload() {
  slides = document.querySelectorAll("#root>svg");

  updateDisplayMode();
  try {
    createVideos(document.body);
    createImages(document.body);
  } catch (e) {
    console.log("Images and videos appear to alerady be in place");
    console.warn(e);
  }
  showSlide(currentSlide);
}

function updateDisplayMode() {
  const notes = document.getElementById("notes");
  notes.innerHTML = "";
  const noteBlocks = Array.from(slides).map(findNotes);

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
  document.getElementById("full").onclick = fullscreen;
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
    f: fullscreen,
  };

  actions[event.key]?.();
});

function fullscreen() {
  document.body.requestFullscreen();
  document.getElementById("notes").innerHTML = "";
  firstSlide();
}

document.body.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    return;
  }
  reload();
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

function findNotes(parent) {
  return Array.from(findLabel(parent))
    .filter(({ label }) => label.startsWith("note://"))
    .map(
      ({ label, element }) =>
        label.replace("note://", "") || `<p>${element.textContent}</p>`,
    )
    .join("\n");
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

function createVideos(root) {
  const controls = {
    gap: findLabel(root, "player-gap")[0].element.getBBox(),
    progressNotFilled: findLabel(root, "player-progress-not-filled")[0].element,
    progressFilled: findLabel(root, "player-progress-filled")[0].element,
    head: findLabel(root, "player-head")[0].element,
    buttonPlay: findLabel(root, "player-button-play")[0].element,
    buttonPause: findLabel(root, "player-button-pause")[0].element,
  }
  console.log(controls)

  Array.from(findLabel(root))
    .filter(({ label }) => label.startsWith("vid://"))
    .map(({ label, element }, idx) => {
      console.log({label, element})
      const video = document.createElement("video");
      video.id = element.id || `video-${idx}`
      const fill = element.querySelector(".typst-shape");
      fill?.remove();
      let image = element.querySelector("image");
      if (!image) {
        const { x, y, width, height } = element.getBBox();
        const transform = [element.getAttribute("transform"), `translate(${x} ${y})`].filter(Boolean).join(" ")
        const invTransform = `translate(${-x} ${-y})`
        element.setAttribute("transform", invTransform)
        element.id = "path-" + element.id
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
      const src = label.replace("vid://", "");
      video.src = src.startsWith("http") ? src : "./" + src;
      video.loop = true;
      video.style.background = "transparent"
      video.preload = "auto";
      image.appendChild(video);
      image.outerHTML =
        `<foreignObject transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${element.id})">` +
        image.innerHTML +
        `</foreignObject>
        <g id=${"controls-" + video.id} transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}" clip-path="url(#clip-${element.id})">
        </g>`;
      const addedVideo = document.getElementById(video.id)
      videoObserver.observe(addedVideo)
      addControls(addedVideo, document.getElementById("controls-"+video.id), controls)
    });
}

function addControls(video, box, template) {
  const size = video.parentElement.getBBox()
  const gap = template.gap

  const pauseSize = template.buttonPause.getBBox()
  const pause = template.buttonPause.cloneNode(true)
  console.log({pauseSize})
  pause.setAttribute("transform", `translate(${-pauseSize.x + gap.width}, ${-pauseSize.y + size.height - pauseSize.height - gap.height})`)
  box.appendChild(pause)

  const playSize = template.buttonPlay.getBBox()
  const play = template.buttonPlay.cloneNode(true)
  console.log({playSize})
  play.setAttribute("transform", `translate(${-playSize.x + gap.width}, ${-playSize.y + size.height - playSize.height - gap.height})`)
  box.appendChild(play)

  video.addEventListener("play", () => {
    pause.style.opacity = 1
    play.style.opacity = 0
  })
  video.addEventListener("pause", () => {
    pause.style.opacity = 0
    play.style.opacity = 1
  })

  const pbSize = template.progressNotFilled.getBBox()
  const pb = template.progressNotFilled.cloneNode(true)
  pb.setAttribute("transform", `translate(${-pbSize.x + gap.width*2 + pauseSize.width}, ${-pbSize.y + size.height - pbSize.height - gap.height})`)
  pb.setAttribute("width", size.width - gap.width*3 - pauseSize.width)
  box.appendChild(pb)

  const pfSize = template.progressFilled.getBBox()
  const pf = template.progressFilled.cloneNode(true)
  pf.setAttribute("transform", `translate(${-pfSize.x + gap.width*2 + pauseSize.width}, ${-pfSize.y + size.height - pfSize.height - gap.height})`)
  pf.setAttribute("width", 0)
  box.appendChild(pf)
  video.addEventListener("timeupdate", () => pf.setAttribute("width", video.currentTime / video.duration * pbSize.width))
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
