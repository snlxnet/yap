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

async function load() {
  const card = document.createElement("div")
  card.id = "card-wrapper"
  document.body.appendChild(card)
  await loadCard(card, "/card.svg")
  document.getElementById("button-new").addEventListener("click", () => selectTemplate(card))
  document.getElementById("button-open").addEventListener("click", () => {
    alert("open")
  })
}

load()
