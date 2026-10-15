const fsNotSupported = !window.FileSystemObserver
const lang = new URLSearchParams(location.search).get("lang") || "en"

let embedVideos = false
let fs
let assoc = new Map()
let lastRawSVG = ""
let currentDocName = ""
let card = ""

loadMain()
document.addEventListener("keydown", (event) => {
  if (event.key === "d" || event.key === "Enter") {
    download();
  }
});

function makeCard(className) {
  document.getElementById("card-wrapper")?.remove()
  const cardWrapper = document.createElement("div")
  cardWrapper.id = "card-wrapper"
  cardWrapper.classList.add(className)
  document.body.prepend(cardWrapper)
  cardWrapper.innerHTML = card
}

// main greeting
async function loadMain() {
  const response = await fetch(`/card-${lang}.svg`)
  card = await response.text()
  makeCard("greeting")

  if (fsNotSupported) {
    document.getElementById("unsupported-browser").style.display = "inline"
  }

  document.getElementById("button-new").addEventListener("click", async () => {
    const template = await fetch(`/template-${lang}.svg`).then(r => r.text())

    const handle = await window.showSaveFilePicker({
      types: [
        {
          accept: { "image/svg+xml": [".svg"] }
        }
      ]
    })
    const wr = await handle.createWritable()
    await wr.write(template)
    await wr.close()

    loadHandle(handle)
  })
  document.getElementById("button-open").addEventListener("click", async () => {
    if (fsNotSupported) {
      const f = document.createElement("input")
      f.type = "file"
      f.setAttribute("accept", "image/svg+xml")
      f.click()
      f.oninput = async () => {
        const file = f.files[0]
        if (file.name.endsWith(".zip")) {
          loadZip(file)
        } else {
          load(file.name, await file.text())
        }
        f.remove()
      }
      return
    }

    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          accept: { "image/svg+xml": [".svg"], "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] }
        }
      ]
    })

    loadHandle(handle)
  })

  window.ondragover = (e) => e.preventDefault()
  window.ondrop = dropToOpen
}

async function dropToOpen(event) {
  event.preventDefault()
  const item = await event.dataTransfer.items[0]
  const handle = item?.getAsFileSystemHandle()
  if (!handle || !handle.name.endsWith(".svg")) {
    return
  }
  loadHandle(handle)
}

async function loadHandle(handle) {
  if (handle.name.endsWith(".zip")) {
    loadZip(await handle.getFile())
    return
  }

  async function loadFile(evt) {
    console.log({evt})
    try {
      const file = await handle.getFile()
      const svg = await file.text()
      console.log("Loaded new file", {svg, handle, file})
      await load(handle.name, svg)
    } catch(e) {
      console.warn(e)
      setTimeout(() => loadFile("retry"), 500)
    }
  }

  const observer = new FileSystemObserver(loadFile)
  observer.observe(handle)
  loadFile()
}

async function loadZip(file) {
  const zip = new JSZip();
  const { files } = await zip.loadAsync(file);
  let body = "";
  for (const file of Object.values(files)) {
    body += await file.async("string");
  }

  load(file.name, body)
}

async function load(name, svg) {
  document.getElementById("card-wrapper")?.remove()

  assoc = new Map(JSON.parse(localStorage.getItem(name) || null))
  fs = await navigator.storage.getDirectory()

  const root = document.getElementById("root")
  root.innerHTML = svg
  lastRawSVG = svg
  currentDocName = name
  createPages()
  await insertVideoUrls(assoc)
  reload()

  let hoverTarget = null

  window.ondragover = (e) => {
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
  }
  window.ondrop = async (e) => {
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
    await wr.write(await file.arrayBuffer())
    await wr.close()
    console.log("written")
    assoc.set(e.target.id, file.name)
    localStorage.setItem(name, JSON.stringify(Array.from(assoc.entries())))
    e.target.dataset.typstLabel = "vid://"

    await insertVideoUrls(assoc)
    reload()
  }
}

async function insertVideoUrls() {
  createPages()

  const promises = [...assoc.entries()].map(async ([id, filename]) => {
    if (!id) {
      return
    }
    const elements = [...document.querySelectorAll("#" + id)]

    const promises = elements.map(async (element) => {
      if (!isInViewBox(element)) {
        return
      }
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
  const [_x, _y, width, height] = first.getAttribute("viewBox").split(" ")

  const pages = [...first.querySelectorAll(`rect[width="${width}"][height="${height}"]`)]
    .map(element => ({x: element.getAttribute("x"), y: element.getAttribute("y")}))
    .filter(page => +page.x || +page.y)

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

  const loadScript = document.createElement("script")
  loadScript.id = "load-script"
  loadScript.innerHTML = `loader.style.display = "inline"`
  document.body.prepend(loadScript)
  makeCard("loading")
  loader.style.display = "inline"

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

  document.getElementById("load-script").remove()
  load(currentDocName, lastRawSVG)
}

