let embedVideos = false
let fs
let assoc = new Map()
let lastRawSVG = ""
let currentDocName = ""

// loadMain()
fetch("/a4.svg").then(r => r.text()).then(t => load("a4.svg", t))
document.addEventListener("keydown", (event) => {
  if (event.key === "d" || event.key === "Enter") {
    download();
  }
});

async function loadSvg(card, file) {
  const response = await fetch(file)
  const svg = await response.text()

  card.innerHTML = svg
}

// main greeting
async function loadMain() {
  const card = document.createElement("div")
  card.id = "card-wrapper"
  root.appendChild(card)
  await loadSvg(card, "/card.svg")
  document.getElementById("button-new").addEventListener("click", () => selectTemplate(card))
  document.getElementById("button-open").addEventListener("click", async () => {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          accept: { "image/svg+xml": [".svg"] }
        }
      ]
    })

    loadHandle(handle)
  })

  addEventListener("dragover", (e) => e.preventDefault())
  addEventListener("drop", dropToOpen)
}

async function dropToOpen(event) {
  event.preventDefault()
  const handle = await event.dataTransfer.items[0]?.getAsFileSystemHandle()
  if (!handle || !handle.name.endsWith(".svg")) {
    return
  }
  loadHandle(handle)
}

async function loadHandle(handle) {
  async function loadFile() {
    const svg = await handle.getFile().then(f => f.text())
    await load(handle.name, svg)
  }

  const observer = new FileSystemObserver(loadFile)
  observer.observe(handle)
  loadFile()
}

async function load(name, svg) {
  assoc = new Map(JSON.parse(localStorage.getItem(name) || null))
  fs = await navigator.storage.getDirectory()

  const root = document.getElementById("root")
  root.innerHTML = svg
  lastRawSVG = svg
  currentDocName = name
  createPages()
  await insertVideoUrls(assoc)
  createVideos(document)

  let hoverTarget = null
  removeEventListener("dragover", dropToOpen)
  removeEventListener("drop", dropToOpen)

  addEventListener("dragover", (e) => {
    e.preventDefault()

    if (hoverTarget?.style) {
      hoverTarget.style.filter = ""
    }
    if (e.target.tagName === "svg" || !e.target.id) {
      hoverTarget = null
      return
    }
    hoverTarget = e.target
    hoverTarget.style.transition = "0.2s ease-in-out"
    hoverTarget.style.filter = "invert(0.2)"
  })
  addEventListener("drop", async (e) => {
    if (hoverTarget?.style) {
      hoverTarget.style.filter = ""
    }
    if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
      e.preventDefault();
    }
    const file = e.dataTransfer.items[0]?.getAsFile()
    if (!file) {
      return
    }

    console.log(e.target, hoverTarget)

    const handle = await fs.getFileHandle(file.name, { create: true })
    const wr = await handle.createWritable()
    await wr.write(await file.bytes())
    await wr.close()
    console.log("written")
    assoc.set(e.target.id, file.name)
    localStorage.setItem(name, JSON.stringify(Array.from(assoc.entries())))
    e.target.dataset.typstLabel = "vid://"

    await insertVideoUrls(assoc)
    createVideos(document)
  })
}

async function insertVideoUrls() {
  createPages()

  const promises = [...assoc.entries()].map(async ([id, filename]) => {
    const elements = [...document.querySelectorAll("#" + id)]

    const promises = elements.map(async (element) => {
      const handle = await fs.getFileHandle(filename)
      const file = await handle.getFile()
      const url = await fileToUrl(file);
      element.dataset.typstLabel = "vid://" + url
    })

    return Promise.all(promises)
  })
  await Promise.all(promises)

  console.log(promises)
}

async function fileToUrl(file) {
  if (!embedVideos) {
    return URL.createObjectURL(file)
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve("")
    reader.readAsDataURL(file)
  })
}

function createPages() {
  const old = document.querySelectorAll(".generated-page")

  const first = document.querySelector("#root>svg")
  const { width, height } = first.viewBox.baseVal

  const pages = [...first.querySelectorAll(`rect[width="${width}"][height="${height}"]`)]
    .map(element => ({x: element.x.baseVal.value, y: element.y.baseVal.value}))
    .filter(page => page.x !== 0 || page.y !== 0)

  console.log(pages)

  pages.map(page => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const attrs = [...first.attributes]
    attrs.forEach(attr => {
      if (!"id viewBox".split(" ").includes(attr.name)) {
        svg.setAttribute(attr.name, attr.value)
      }
    })

    svg.setAttribute("viewBox", [page.x, page.y, width, height].join(" "))
    svg.innerHTML = first.innerHTML
    svg.classList.add("generated-page")
    root.appendChild(svg)
  })

  old.forEach(el => el.remove())
}

async function download() {
  firstSlide()

  embedVideos = true
  root.innerHTML = lastRawSVG
  await insertVideoUrls()
  embedVideos = false

  const runtime = await fetch("runtime.js").then((res) => res.text());
  const html = Array.from(document.children)
    .map((child) => child.innerHTML)
    .join("\n")
    .replace(
      `<script src="runtime.js"></script>`,
      `<script>${runtime}</script>`,
    );

  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
  );
  element.setAttribute("download", "yap.html");
  element.click();

  load(currentDocName, lastRawSVG)
}

