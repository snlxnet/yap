const SLIDE_WORD = navigator.language.includes("ru") ? "Слайд" : "Slide";

let slides = [];
let currentSlide = 0;
let lastIntervalId = 0;

const channel = new BroadcastChannel("control");
window.addEventListener("load", () => {
  reload();
  channel.addEventListener("message", ({ data: idx }) => showSlide(idx, true));
});

function reload() {
  slides = document.querySelectorAll("body>svg");

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
    document.querySelectorAll("video").forEach((video) => {
      video.removeAttribute("controls");
    });
  } else {
    document.body.classList.add("book-mode");
    document.querySelectorAll("video").forEach((video) => {
      video.setAttribute("controls", "true");
    });
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
  if (idx === 0) {
    createTimer();
  }

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
      slide.querySelectorAll("foreignObject").forEach((foreign) => {
        const size = foreign.parentElement.getBBox();
        foreign.setAttribute("width", size.width);
        foreign.setAttribute("height", size.height);
      });
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
  Array.from(findLabel(root))
    .filter(({ label }) => label.startsWith("vid://"))
    .map(({ label, element }) => {
      const video = document.createElement("video");
      const fill = element.querySelector(".typst-shape");
      fill?.remove();
      let image = element.querySelector("image");
      if (!image) {
        const width = element.width.baseVal.value;
        const height = element.height.baseVal.value;
        const x = element.x.baseVal.value;
        const y = element.y.baseVal.value;
        element.outerHTML = `
          <g>
            <rect transform="translate(${x} ${y})" fill="red" width="${width}" height="${height}" data-label="${label}">
            </rect>
          </g>
        `;
        image = root.querySelector(`[data-label="${label}"]`);
      }
      const src = label.replace("vid://", "");
      video.src = src.startsWith("http") ? src : "./" + src;
      video.loop = true;
      video.preload = "auto";
      image.appendChild(video);
      image.outerHTML =
        `<foreignObject transform="${image.attributes.transform?.value || ""}" width="${image.attributes.width.value}" height="${image.attributes.height.value}">` +
        image.innerHTML +
        `</foreignObject>`;
    });
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
