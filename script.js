const canvas = document.getElementById("canvas");
const scanFile = document.getElementById("scanFile");

let scanCodes = new Set(); 
let isDrawing = false;
let startX, startY;
let tempRect = null;

let currentRect = null; 


function parseArii(input) {
  const arii = [];
  input.split(",").forEach(item => {
    const part = item.trim();
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let i = start; i <= end; i++) {
          arii.push(i.toString());
        }
      }
    } else if (part) {
      arii.push(part);
    }
  });
  return arii;
}


function exportaHarta() {
  const rects = Array.from(document.querySelectorAll(".rect")).map(rect => ({
    code: rect.dataset.code,
    arii: JSON.parse(rect.dataset.arii || "[]"),
    left: parseFloat(rect.style.left),
    top: parseFloat(rect.style.top),
    width: parseFloat(rect.style.width),
    height: parseFloat(rect.style.height)
  }));

  const dataStr = JSON.stringify(rects, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "harta_exportata.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}



scanFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    scanCodes = new Set(
      event.target.result
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== "")
    );
    updateColors();
    scanFile.value = ""; 
  };
  reader.readAsText(file);
});

canvas.addEventListener("mousedown", e => {
  if (e.target !== canvas) return; 

  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  tempRect = document.createElement("div");
  tempRect.className = "rect";
  tempRect.style.left = `${startX}px`;
  tempRect.style.top = `${startY}px`;
  tempRect.style.width = "0px";
  tempRect.style.height = "0px";
  tempRect.style.opacity = "0.6";
  canvas.appendChild(tempRect);
});

canvas.addEventListener("mousemove", e => {
  if (!isDrawing || !tempRect) return;

  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  const width = currentX - startX;
  const height = currentY - startY;

  tempRect.style.width = `${Math.abs(width)}px`;
  tempRect.style.height = `${Math.abs(height)}px`;
  tempRect.style.left = `${width < 0 ? currentX : startX}px`;
  tempRect.style.top = `${height < 0 ? currentY : startY}px`;
});

canvas.addEventListener("mouseup", e => {
  if (!isDrawing || !tempRect) return;
  isDrawing = false;

  const width = parseInt(tempRect.style.width);
  const height = parseInt(tempRect.style.height);

  if (width < 10 || height < 10) {
    canvas.removeChild(tempRect);
    tempRect = null;
    return;
  }

  const code = prompt("Cod amplasament (ex: A100 sau Perete):");
  if (!code) {
    canvas.removeChild(tempRect);
    tempRect = null;
    return;
  }

  const ariiRaw = prompt("Coduri arii separate prin virgula sau interval (ex: 10001-10010,10015):");
  if (!ariiRaw) {
    canvas.removeChild(tempRect);
    tempRect = null;
    return;
  }

  const arii = parseArii(ariiRaw);

  tempRect.dataset.code = code;
  tempRect.dataset.arii = JSON.stringify(arii);
  tempRect.innerText = code;
  tempRect.style.opacity = "1";

  updateColors();
  tempRect = null;
});

canvas.addEventListener("click", e => {
  if (!e.target.classList.contains("rect")) return;

  e.stopPropagation();

  currentRect = e.target;
  openEditModal(currentRect);
});

function openEditModal(rect) {
  const editModal = document.getElementById("editModal");
  const modalCode = document.getElementById("modalCode");
  const ariiList = document.getElementById("ariiList");
  const newAriaInput = document.getElementById("newAriaInput");

  modalCode.value = rect.dataset.code || "";

  const ariiArr = JSON.parse(rect.dataset.arii || "[]").slice().sort((a,b) => +a - +b);

  newAriaInput.value = "";
  ariiList.innerHTML = "";
  ariiArr.forEach(aria => {
    addAriaToList(aria, ariiList);
  });

  editModal.style.display = "flex";
  modalCode.focus();

  const addAriaBtn = document.getElementById("addAriaBtn");
  addAriaBtn.onclick = () => {
    const val = newAriaInput.value.trim();
    if (!val) return;

    const items = Array.from(ariiList.querySelectorAll(".aria-item span")).map(sp => sp.textContent);
    if (items.includes(val)) {
      alert("Această arie există deja în listă.");
      return;
    }

    addAriaToList(val, ariiList);
    newAriaInput.value = "";
  };
}

function addAriaToList(aria, container) {
  const div = document.createElement("div");
  div.className = "aria-item";

  const span = document.createElement("span");
  span.textContent = aria;

  const btn = document.createElement("button");
  btn.textContent = "Șterge";
  btn.title = "Șterge aria";
  btn.onclick = () => {
    div.remove();
  };

  div.appendChild(span);
  div.appendChild(btn);
  container.appendChild(div);
}

document.getElementById("modalSave").addEventListener("click", () => {
  if (!currentRect) return;

  const modalCode = document.getElementById("modalCode");
  const ariiList = document.getElementById("ariiList");

  const newCode = modalCode.value.trim();
  if (!newCode) {
    alert("Codul amplasament nu poate fi gol!");
    modalCode.focus();
    return;
  }

  const arii = Array.from(ariiList.querySelectorAll(".aria-item span"))
    .map(span => span.textContent)
    .filter(a => a !== "");

  currentRect.dataset.code = newCode;
  currentRect.dataset.arii = JSON.stringify(arii);
  currentRect.innerText = newCode;

  updateColors();

  closeModal();
  currentRect = null;
});

document.getElementById("modalCancel").addEventListener("click", () => {
  closeModal();
  currentRect = null;
});

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

// --- Șterge amplasamentul curent
document.getElementById("deleteRect").addEventListener("click", () => {
  if (!currentRect) return;

  if (confirm(`Ștergi amplasamentul ${currentRect.dataset.code}?`)) {
    currentRect.remove();
    closeModal();
    currentRect = null;
  }
});

function updateColors() {
  document.querySelectorAll(".rect").forEach(rect => {
    const arii = JSON.parse(rect.dataset.arii || "[]");
    const areNescanate = arii.some(cod => scanCodes.has(cod));
    rect.style.backgroundColor = areNescanate ? "#ef9a9a" : "#a5d6a7";
  });
}


document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const rects = JSON.parse(event.target.result);
      if (!Array.isArray(rects)) throw new Error("Format invalid");

      document.querySelectorAll(".rect").forEach(r => r.remove());

      rects.forEach(r => {
        const rect = document.createElement("div");
        rect.className = "rect";
        rect.style.left = `${r.left}px`;
        rect.style.top = `${r.top}px`;
        rect.style.width = `${r.width}px`;
        rect.style.height = `${r.height}px`;
        rect.dataset.code = r.code;
        rect.dataset.arii = JSON.stringify(r.arii || []);
        rect.innerText = r.code;
        canvas.appendChild(rect);
      });

      updateColors(); 
      e.target.value = ""; 
    } catch (err) {
      alert("Eroare la importul hărții: fișier JSON invalid.");
    }
  };

  reader.readAsText(file);
});
