extend();

function extend() {
  getTypstLabel("book").onclick = toggleBook;

  getTypstLabel("say-hi").onclick = () => alert("hi");

  const input = document.createElement("input");
  input.type = "color";
  getTypstLabel("input").appendChild(input);
}

function toggleBook() {
  const book = document.body.classList.toggle("book-mode");
  console.log(book);

  if (book) {
    document.body.innerHTML = document.body.innerHTML.replaceAll(
      "note://",
      "not-a-note://",
    );
  } else {
    document.body.innerHTML = document.body.innerHTML.replaceAll(
      "not-a-note://",
      "note://",
    );
  }

  reload();
  getTypstLabel("book").onclick = toggleBook;
}
