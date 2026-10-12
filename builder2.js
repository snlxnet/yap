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

async function loadA4() {
  const root = document.getElementById("root")
  const svg = await loadCard(root, "/a4.svg")

  let hoverTarget = null
  addEventListener("dragover", (e) => {
    e.preventDefault()

    if (hoverTarget?.style) {
      hoverTarget.style.filter = ""
    }
    if (e.target.tagName === "svg") {
      hoverTarget = null
      return
    }
    hoverTarget = e.target
    hoverTarget.style.transition = "0.2s ease-in-out"
    hoverTarget.style.filter = "brightness(0.7)"
  })
  addEventListener("drop", (e) => {
    if (hoverTarget?.style) {
      hoverTarget.style.filter = ""
    }
    if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
      e.preventDefault();
    }
    const files = [...e.dataTransfer.items].map(i => i.getAsFile())
    console.log(files)
    // TODO save to OPFS
  })
}

loadA4()
