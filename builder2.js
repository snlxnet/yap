async function loadCard(card, file) {
  const response = await fetch(file)
  const svg = await response.text()

  card.innerHTML = svg
}

async function selectTemplate(card) {
  await loadCard(card, "/format.svg")

  document.getElementById("bg-book").addEventListener("click", () => {
    alert("create book")
  })
  document.getElementById("bg-presentation").addEventListener("click", () => {
    alert("create presentation")
  })
}

// main greeting
async function loadMain() {
  const card = document.createElement("div")
  card.id = "card-wrapper"
  document.body.appendChild(card)
  await loadCard(card, "/card.svg")
  document.getElementById("button-new").addEventListener("click", () => selectTemplate(card))
  document.getElementById("button-open").addEventListener("click", () => {
    alert("open")
  })
}

const assoc = new Map()
let fs

async function loadA4() {
  fs = await navigator.storage.getDirectory()

  const root = document.getElementById("root")
  await loadCard(root, "/a4.svg")

  let hoverTarget = null
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

    console.log(file)

    const handle = await fs.getFileHandle(file.name, { create: true })
    const wr = await handle.createWritable()
    await wr.write(await file.bytes())
    await wr.close()
    console.log("written")
    assoc.set(e.target.id, file.name)
    e.target.dataset.typstLabel = "vid://"

    insertAssociated()
  })
}

loadA4()

async function insertAssociated() {
  assoc.forEach((_, id) => {
    const container = document.getElementById(id)
    if (container.tagName.toLowerCase() !== "video") {
      container.dataset.typstLabel = "vid://"
    }
  })
  createVideos(document)

  assoc.forEach(async (filename, id) => {
    const element = document.getElementById(id)
    if (!element) {
      return
    }

    const handle = await fs.getFileHandle(filename)
    const file = await handle.getFile()
    const url = URL.createObjectURL(file);
    const bytes = await file.bytes()
    console.log({file, url, bytes})
    element.src = url
  })
}
