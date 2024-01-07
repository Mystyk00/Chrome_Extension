document.addEventListener("DOMContentLoaded", function () {
  const analyzeButton = document.getElementById("analyzeButton");
  const analyzeButtonContainer = analyzeButton.parentElement;
  const fontContainer = document.getElementById("fontContainer");
  const colorContainer = document.getElementById("colorContainer");
  const analyzeAgainContainer = document.getElementById(
    "analyzeAgainContainer"
  );

  const newAnalyzeAgainContainer = document.createElement("div");
  newAnalyzeAgainContainer.id = "newAnalyzeAgainContainer";
  analyzeButtonContainer.insertAdjacentElement(
    "afterend",
    newAnalyzeAgainContainer
  );

  const showColorsButton = document.createElement("button");
  showColorsButton.textContent = "OFF";
  showColorsButton.addEventListener("click", function () {
    toggleColorRepresentation();
  });
  analyzeButtonContainer.appendChild(showColorsButton);

  chrome.storage.sync.get("buttonClicked", function (result) {
    if (result.buttonClicked) {
      analyzeAndDisplay();
    } else {
      analyzeButton.style.display = "block";
    }
  });

  let colorsInLabel = false;

  function toggleColorRepresentation() {
    colorsInLabel = !colorsInLabel;
    updateButtonLabel();
    displayFontsAndColors(lastFonts, lastColors, lastContext);
  }

  function updateButtonLabel() {
    const buttonLabel = ` ${colorsInLabel ? "ON" : "OFF"}`;
    showColorsButton.textContent = buttonLabel;
  }

  let lastFonts, lastColors, lastContext;

  function analyzeAndDisplay() {
    analyzeButton.style.display = "none";
    fontContainer.style.display = "block";
    colorContainer.style.display = "block";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          function: analyzeFontsAndColorsOnPage,
        })
        .then((results) => {
          const resultObject = results[0].result;

          if (resultObject && resultObject.fonts && resultObject.colors) {
            const context = {
              fonts: resultObject.fonts,
              colors: resultObject.colors,
            };

            lastFonts = context.fonts;
            lastColors = context.colors;
            lastContext = context;

            saveDataToStorage(context);
            displayFontsAndColors(context.fonts, context.colors, context);
            createAnalyzeAgainButton(context, newAnalyzeAgainContainer);
            createDownloadButton(context, newAnalyzeAgainContainer);
          } else {
            console.error("Unexpected format of results:", results);
          }
        })
        .catch((error) => {
          console.error("Error executing script:", error);
        });
    });
  }

  analyzeButton.addEventListener("click", function () {
    chrome.storage.sync.set({ buttonClicked: true });
    analyzeAndDisplay();
  });

  function displayFontsAndColors(fonts, colors, context) {
    fontContainer.innerHTML = "";
    colorContainer.innerHTML = "";

    let fontRow;

    fonts.forEach((font, index) => {
      if (index % 3 === 0) {
        fontRow = document.createElement("div");
        fontRow.className = "font-row";
        fontContainer.appendChild(fontRow);
      }

      const fontElement = document.createElement("div");
      const fontNameWithoutSpacesAndQuotes = font.replace(/[\s']/g, "");
      fontElement.textContent = fontNameWithoutSpacesAndQuotes;
      fontRow.appendChild(fontElement);
    });

    let colorRow;

    colors.forEach((color, index) => {
      if (index % 2 === 0) {
        colorRow = document.createElement("div");
        colorRow.className = "color-row";
        colorContainer.appendChild(colorRow);
      }

      const colorElement = document.createElement("div");
      const rgbaValues = color.match(/\(([^)]+)\)/)[1].split(",");
      const alpha = parseFloat(rgbaValues[3]);

      if (colorsInLabel) {
        colorElement.textContent = colorsInLabel
          ? color
          : colorElement.style.color;
      } else {
        if (alpha === 0) {
          colorElement.style.color = "black";
        } else {
          colorElement.style.color = color;
        }
        colorElement.textContent = color;
      }

      if (index % 2 !== 1) {
        colorElement.textContent += "\t";
      }

      colorRow.appendChild(colorElement);
    });
  }

  function createAnalyzeAgainButton(context, container) {
    const analyzeAgainButton = document.createElement("button");
    analyzeAgainButton.textContent = "Analyze again";
    analyzeAgainButton.addEventListener("click", function () {
      container.innerHTML = "";
      analyzeAndDisplay();
    });
    container.appendChild(analyzeAgainButton);
  }

  function createDownloadButton(context, container) {
    if (!container.querySelector("#downloadButton")) {
      const downloadButton = document.createElement("button");
      downloadButton.id = "downloadButton";
      downloadButton.textContent = "Download";
      downloadButton.addEventListener("click", function () {
        downloadFontsAndColors(context);
      });
      container.appendChild(downloadButton);
    }
  }

  function downloadFontsAndColors(context) {
    const content = generateDownloadContent(context);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fonts_and_colors.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateDownloadContent(context) {
    let content = "Fonts:\n";
    content += context.fonts.join("\n");

    content += "\n\nColors:\n";
    context.colors.forEach((color, index) => {
      content += color;
      if (index % 2 === 0) {
        content += "\t";
      } else {
        content += "\n";
      }
    });

    return content;
  }

  function analyzeFontsAndColorsOnPage() {
    const all = document.getElementsByTagName("*");
    const uniqueFontFamilies = [];
    const uniqueColors = [];

    for (let i = 0; i < all.length; i++) {
      const computedStyle = getComputedStyle(all[i]);
      const fontFamily = computedStyle.getPropertyValue("font-family");
      const color = computedStyle.getPropertyValue("color");
      const backgroundColor =
        computedStyle.getPropertyValue("background-color");

      if (!uniqueFontFamilies.includes(fontFamily)) {
        uniqueFontFamilies.push(fontFamily);
      }

      if (!uniqueColors.includes(color)) {
        uniqueColors.push(color);
      }

      if (!uniqueColors.includes(backgroundColor)) {
        uniqueColors.push(backgroundColor);
      }
    }

    return {
      fonts: uniqueFontFamilies,
      colors: uniqueColors,
    };
  }

  function saveDataToStorage(data) {
    chrome.storage.sync.set({ analyzedData: data });
  }

  function loadDataFromStorage(callback) {
    chrome.storage.sync.get("analyzedData", function (result) {
      callback(result.analyzedData || {});
    });
  }

  loadDataFromStorage(function (savedData) {
    if (savedData.fonts && savedData.colors) {
      displayFontsAndColors(savedData.fonts, savedData.colors, savedData);
    }
  });
});
