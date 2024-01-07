function createContainers() {
  const fontContainer = document.createElement("div");
  fontContainer.id = "fontContainer";
  document.body.appendChild(fontContainer);

  const colorContainer = document.createElement("div");
  colorContainer.id = "colorContainer";
  document.body.appendChild(colorContainer);

  const analyzeAgainContainer = document.createElement("div");
  analyzeAgainContainer.id = "analyzeAgainContainer";
  document.body.appendChild(analyzeAgainContainer);
}

createContainers();
