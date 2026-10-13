let extendScriptTimeoutId = -1;
let reloadDirentry = async () => {};
let updateSlidesToUseDirentry = async () => {};
load();

async function load() {
  slides.forEach((slide) => slide.remove());
  let idx = 1;

  const svgs = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(async (idx) => {
      const response = await fetch(`/slide${idx}.svg`, {
        cache: "no-cache",
      });
      return {
        idx,
        body: await response.text(),
      };
    }),
  );
  document.body.innerHTML += svgs
    .sort((a, b) => a.idx < b.idx)
    .map(({ body }) => body)
    .join("");

  const input = document.createElement("input");
  input.type = "file";
  input.setAttribute("multiple", "true");
  input.style.display = "none";

  const label = document.createElement("label");
  label.appendChild(input);
  label.style.display = "block";
  label.style.cursor = "pointer";
  getTypstLabel("zip").appendChild(label);

  const dirButton = document.createElement("button");
  dirButton.style.opacity = "0";
  getTypstLabel("dir").appendChild(dirButton);

  input.addEventListener("input", onFileSelect);
  dirButton.addEventListener("click", observeDirectory);

  reload();

  const extendScript = document.createElement("script");
  extendScript.id = "extend";
  extendScript.src = "extend.js";
  document.body.appendChild(extendScript);

  document.addEventListener("keydown", (event) => {
    if (event.key === "d" || event.key === "Enter") {
      download();
    }
  });

  document.querySelector('script[src="builder.js"]').remove();
}

async function onFileSelect(event) {
  const files = Array.from(event.target.files || []);
  console.log(event.target);

  if (!files.length) {
    return;
  }

  const oldSlides = document.querySelectorAll("body>svg");
  oldSlides.forEach((slide) => slide.remove());

  if (files[0].type.includes("zip")) {
    document.body.innerHTML += await readZip(files[0]);
  } else {
    document.body.innerHTML += await readSvgArray(files);
  }

  reload();
}

async function readSvgArray(files) {
  let body = "";
  for (let file of files) {
    body += await file.text();
  }
  return body;
}

async function readZip(file) {
  const zip = new JSZip();
  const { files } = await zip.loadAsync(file);
  let body = "";
  for (const file of Object.values(files)) {
    body += await file.async("string");
  }
  return body;
}

async function download() {
  await reloadDirentry();
  reload();
  showSlide(0);
  document.body.innerHTML += '<script id="extend" src="extend.js"></script>';

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
  element.setAttribute("download", "player.html");
  element.click();

  updateSlidesToUseDirentry();
  reload();
}

async function observeDirectory() {
  const root = await window.showDirectoryPicker();

  const prefixes = ["slide", "page"];
  for await (let entry of root.values()) {
    if (entry.name === "yap.typ") continue;

    if (entry.name.endsWith(".typ")) {
      prefixes.push(entry.name.slice(0, -4));
    }
  }

  reloadDirentry = async () => {
    const oldSlides = document.querySelectorAll("body>svg");
    oldSlides.forEach((slide) => slide.remove());

    document.body.innerHTML += await readSvgDirentry(root, prefixes);
    document.getElementById("extend")?.remove();
  };
  updateSlidesToUseDirentry = () => {
    clearTimeout(extendScriptTimeoutId);
    extendScriptTimeoutId = setTimeout(async () => {
      document.getElementById("extend")?.remove();
      const extend = document.createElement("script");
      extend.id = "extend";
      extend.innerHTML = await openFile(root, "extend.js").then(
        (f) => f.text(),
        () => "",
      );
      document.body.appendChild(extend);
      reload();
      fixDirentryMedia(root);
    }, 100);
  };

  const observer = new FileSystemObserver(async ([event]) => {
    await reloadDirentry();
    await updateSlidesToUseDirentry();
  });
  await observer.observe(root);

  await reloadDirentry();
  await updateSlidesToUseDirentry();
}

async function fixDirentryMedia(root) {
  Array.from(document.querySelectorAll("video"))
    .filter((video) => !video.getAttribute("src").includes("://"))
    .map(async (video) => {
      const src = video.getAttribute("src");
      const file = await openFile(root, src);
      const url = URL.createObjectURL(file);
      video.setAttribute("src", url);
    });

  Array.from(document.querySelectorAll("img")).map(async (img) => {
    const src = img.getAttribute("src");
    const file = await openFile(root, img.getAttribute("src"));
    const url = URL.createObjectURL(file);
    img.setAttribute("src", url);
    img.dataset.originalPath = src;
  });
}

async function readSvgDirentry(root, prefixes) {
  const pages = [];

  for await (let entry of root.values()) {
    const name = entry.name;

    if (!name.endsWith(".svg")) {
      continue;
    }

    if (prefixes.find((prefix) => name.startsWith(prefix))) {
      const body = await entry.getFile().then((f) => f.text());
      pages.push({ name, body });
    }
  }

  return pages
    .sort((a, b) => a.name.match(/\d+/)[0] - b.name.match(/\d+/)[0])
    .map(({ body }) => body)
    .join("\n");
}

async function openFile(root, path) {
  const parts = path.replaceAll("./", "").split("/").filter(Boolean);

  if (parts.length === 0) {
    return;
  } else if (parts.length === 1) {
    return root.getFileHandle(parts[0]).then((handle) => handle.getFile());
  }
  console.log("dir", path);

  const lastDir = await parts
    .slice(0, -1)
    .reduce(async (acc, curr) => await acc.getDirectoryHandle(curr), root);
  return lastDir.getFileHandle(parts.at(-1)).then((handle) => handle.getFile());
}
