const paletteEl = document.querySelector("#palette");
const addColorButton = document.querySelector("#add-color");
const removeColorButton = document.querySelector("#remove-color");
const generateButton = document.querySelector("#generate");
const toastEl = document.querySelector("#toast");

let polishes = [];
let palette = [];

const MAX_BLOCKS = 10;
const MIN_BLOCKS = 1;


async function init() {
  try {
    const response = await fetch("polishes.json");

    if (!response.ok) {
      throw new Error("Could not load polishes.json");
    }

    polishes = await response.json();

    if (!Array.isArray(polishes) || polishes.length === 0) {
      throw new Error("polishes.json is empty.");
    }

    palette = Array.from(
      { length: 5 },
      () => createSlot()
    );

    generateAll();

  } catch (error) {
    console.error(error);

    paletteEl.innerHTML = `
      <div class="empty-state">
        <h2>couldn't load your polish collection</h2>
        <p>
          make sure <strong>polishes.json</strong>
          is in the same folder as this page.
        </p>
      </div>
    `;
  }
}


function createSlot() {
  return {
    polish: null,
    locked: false
  };
}


function getCandidates(excludedNames = []) {
  return polishes.filter(
    polish => !excludedNames.includes(polish.name)
  );
}


function pickPolish(excludedNames = []) {
  const candidates = getCandidates(excludedNames);

  if (candidates.length === 0) {
    return null;
  }

  return candidates[
    Math.floor(Math.random() * candidates.length)
  ];
}


function generateAll() {
  const usedNames = [];

  palette.forEach(slot => {
    if (slot.locked && slot.polish) {
      usedNames.push(slot.polish.name);
    }
  });

  for (const slot of palette) {
    if (slot.locked && slot.polish) {
      continue;
    }

    const polish = pickPolish(usedNames);

    if (polish) {
      slot.polish = polish;
      usedNames.push(polish.name);
    }
  }

  render();
}


function regenerateSlot(index) {
  const slot = palette[index];

  if (slot.locked) {
    return;
  }

  const usedNames = palette
    .filter(
      (otherSlot, otherIndex) =>
        otherIndex !== index && otherSlot.polish
    )
    .map(otherSlot => otherSlot.polish.name);

  const polish = pickPolish(usedNames);

  if (!polish) {
    showToast("no unused polishes available");
    return;
  }

  slot.polish = polish;

  render();
}


function render() {
  paletteEl.innerHTML = "";

  palette.forEach((slot, index) => {

    const block = document.createElement("article");

    block.className = "color-block";

    if (slot.polish) {
      block.style.backgroundColor = slot.polish.hex;
      block.style.color = getContrastColor(slot.polish.hex);
    } else {
      block.style.backgroundColor = "#ddd";
      block.style.color = "#111";
    }

    block.innerHTML = `
      <div class="block-content">

        <h2 class="polish-name">
          ${
            slot.polish
              ? escapeHtml(slot.polish.name)
              : "no polish"
          }
        </h2>

        <p class="polish-color">
          ${
            slot.polish
              ? escapeHtml(slot.polish.hex.toUpperCase())
              : ""
          }
        </p>

      </div>

      <div class="block-actions">

        <button
          class="block-button"
          data-action="regenerate"
          title="Regenerate this color"
          aria-label="Regenerate this color"
          ${slot.locked ? "disabled" : ""}
        >↻</button>

        <button
          class="block-button ${slot.locked ? "locked" : ""}"
          data-action="lock"
          title="${
            slot.locked
              ? "Unlock this color"
              : "Lock this color"
          }"
          aria-label="${
            slot.locked
              ? "Unlock this color"
              : "Lock this color"
          }"
        >${slot.locked ? "🔒" : "🔓"}</button>

        <button
          class="block-button"
          data-action="remove"
          title="Remove this color"
          aria-label="Remove this color"
        >×</button>

      </div>
    `;


    block.addEventListener("click", event => {

      const button = event.target.closest("[data-action]");

      if (!button) {
        return;
      }

      const action = button.dataset.action;


      if (action === "regenerate") {
        regenerateSlot(index);
      }


      if (action === "lock") {
        slot.locked = !slot.locked;
        render();
      }


      if (action === "remove") {

        if (palette.length <= MIN_BLOCKS) {
          showToast("you need at least one color");
          return;
        }

        palette.splice(index, 1);

        render();
      }

    });


    paletteEl.appendChild(block);

  });
}


addColorButton.addEventListener("click", () => {

  if (palette.length >= MAX_BLOCKS) {
    showToast(`maximum ${MAX_BLOCKS} colors`);
    return;
  }

  palette.push(createSlot());

  const newSlot = palette[palette.length - 1];

  const usedNames = palette
    .slice(0, -1)
    .filter(slot => slot.polish)
    .map(slot => slot.polish.name);

  newSlot.polish = pickPolish(usedNames);

  render();

});


removeColorButton.addEventListener("click", () => {

  if (palette.length <= MIN_BLOCKS) {
    showToast("you need at least one color");
    return;
  }

  palette.pop();

  render();

});


generateButton.addEventListener(
  "click",
  generateAll
);


function showToast(message) {

  toastEl.textContent = message;

  toastEl.classList.add("show");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);

}


function getContrastColor(hex) {

  const cleanHex = hex.replace("#", "");

  const r = parseInt(
    cleanHex.slice(0, 2),
    16
  );

  const g = parseInt(
    cleanHex.slice(2, 4),
    16
  );

  const b = parseInt(
    cleanHex.slice(4, 6),
    16
  );

  const luminance =
    (0.299 * r) +
    (0.587 * g) +
    (0.114 * b);

  return luminance > 160
    ? "#111111"
    : "#ffffff";
}


function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


init();
