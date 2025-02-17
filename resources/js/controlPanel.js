class ControlPanel {
  constructor(imagePanel) {
    this.imagePanel = imagePanel;
    this.loadImageBtn = document.getElementById("loadImageBtn");
    this.controlsContainer = document.getElementById("controlsContainer");
    this.currentX = 0;
    this.currentY = 0;
    this.isImageLoaded = false;
    this.currentImagePath = null; // Add this to track current image path

    // Tab elements
    this.tabs = {
      file: {
        button: document.getElementById("fileTab"),
        content: document.getElementById("fileContent"),
      },
      grid: {
        button: document.getElementById("gridTab"),
        content: document.getElementById("gridContent"),
      },
      draw: {
        button: document.getElementById("drawTab"),
        content: document.getElementById("drawContent"),
      },
      export: {
        button: document.getElementById("exportTab"),
        content: document.getElementById("exportContent"),
      },
    };

    // Set up cell selection callback
    this.imagePanel.onCellSelect = (x, y, currentConfig) => {
      this.currentX = x;
      this.currentY = y;
      this.showCellControls(x, y, currentConfig);
      this.switchTab("grid"); // Switch to grid tab when cell is selected
    };

    this.setupEventListeners();
    this.switchTab("file"); // Start with file tab active
    this.setupFileTabHandlers();
    this.setupExportHandlers();
  }

  setupEventListeners() {
    this.loadImageBtn.addEventListener("click", () => this.handleLoadImage());
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));

    // Set up tab switching with draw mode handling
    Object.entries(this.tabs).forEach(([tabName, tab]) => {
      tab.button.addEventListener("click", () => {
        this.switchTab(tabName);
        // Enable draw mode only when draw tab is active
        this.imagePanel.setDrawMode(tabName === "draw");
        // Update grid display when switching to grid tab
        if (tabName === "grid") {
          this.updateGridDisplay();
        }
      });
    });
  }

  switchTab(tabName) {
    // Hide all content and deactivate all tabs
    Object.values(this.tabs).forEach((tab) => {
      tab.content.classList.add("hidden");
      tab.button.classList.remove("border-blue-500", "text-blue-600");
      tab.button.classList.add("border-transparent", "text-gray-600");
    });

    // Show selected content and activate tab
    const selectedTab = this.tabs[tabName];
    selectedTab.content.classList.remove("hidden");
    selectedTab.button.classList.remove("border-transparent", "text-gray-600");
    selectedTab.button.classList.add("border-blue-500", "text-blue-600");
  }

  handleKeyPress(e) {
    if (!this.imagePanel.previewImage.src) return; // Only handle keys when image is loaded

    const gridData = this.imagePanel.getGridData();
    const currentConfig = gridData[this.currentY][this.currentX];

    switch (e.key.toLowerCase()) {
      // Wall controls
      case "w":
        this.toggleWall(8); // North
        break;
      case "d":
        this.toggleWall(4); // East
        break;
      case "s":
        this.toggleWall(2); // South
        break;
      case "a":
        this.toggleWall(1); // West
        break;

      // Navigation
      case "arrowup":
        if (this.currentY > 0) {
          this.moveToCell(this.currentX, this.currentY - 1);
        }
        break;
      case "arrowright":
        if (this.currentX < 19) {
          this.moveToCell(this.currentX + 1, this.currentY);
        }
        break;
      case "arrowdown":
        if (this.currentY < 19) {
          this.moveToCell(this.currentX, this.currentY + 1);
        }
        break;
      case "arrowleft":
        if (this.currentX > 0) {
          this.moveToCell(this.currentX - 1, this.currentY);
        }
        break;
      case "enter":
        // Move to next cell, wrap to next row if at end
        if (this.currentX < 19) {
          this.moveToCell(this.currentX + 1, this.currentY);
        } else if (this.currentY < 19) {
          this.moveToCell(0, this.currentY + 1);
        }
        break;
    }
  }

  toggleWall(bit) {
    const currentConfig =
      this.imagePanel.getGridData()[this.currentY][this.currentX];
    const newConfig = currentConfig ^ bit;
    this.imagePanel.updateCellWalls(this.currentX, this.currentY, newConfig);
    this.showCellControls(this.currentX, this.currentY, newConfig);
  }

  moveToCell(x, y) {
    this.currentX = x;
    this.currentY = y;
    const currentConfig = this.imagePanel.getGridData()[y][x];
    this.imagePanel.selectedCell = { x, y };
    this.imagePanel.drawGrid();
    this.showCellControls(x, y, currentConfig);
  }

  showCellControls(x, y, currentConfig) {
    const gridData = this.imagePanel.getGridData();
    const gridHtml = this.create2DGridDisplay(gridData, x, y);

    this.controlsContainer.innerHTML = `
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Cell (${x}, ${y})</h3>
        <div class="grid grid-cols-3 gap-2 w-48 mx-auto">
          <div></div>
          <button id="northWall" class="p-2 border ${
            currentConfig & 8 ? "bg-red-500 text-white" : ""
          }">N</button>
          <div></div>
          <button id="westWall" class="p-2 border ${
            currentConfig & 1 ? "bg-red-500 text-white" : ""
          }">W</button>
          <div class="p-2 border bg-gray-100"></div>
          <button id="eastWall" class="p-2 border ${
            currentConfig & 4 ? "bg-red-500 text-white" : ""
          }">E</button>
          <div></div>
          <button id="southWall" class="p-2 border ${
            currentConfig & 2 ? "bg-red-500 text-white" : ""
          }">S</button>
          <div></div>
        </div>
        <div class="mt-4">
          <p class="text-sm">Wall Config: ${currentConfig
            .toString(2)
            .padStart(4, "0")}</p>
        </div>
        <div class="mt-4">
          <button id="clearCell" class="px-4 py-2 bg-gray-500 text-white rounded">Clear Cell</button>
        </div>
      </div>
      <div class="mt-8">
        <h4 class="text-lg font-semibold mb-2">Grid Data</h4>
        <div class="text-xs font-mono bg-gray-100 p-2 rounded overflow-auto">
          ${gridHtml}
        </div>
      </div>
    `;

    // Add wall toggle handlers
    const walls = [
      { id: "northWall", bit: 8 },
      { id: "eastWall", bit: 4 },
      { id: "southWall", bit: 2 },
      { id: "westWall", bit: 1 },
    ];

    walls.forEach(({ id, bit }) => {
      document.getElementById(id).addEventListener("click", () => {
        const newConfig = currentConfig ^ bit; // Toggle the bit
        this.imagePanel.updateCellWalls(x, y, newConfig);
        this.showCellControls(x, y, newConfig);
      });
    });

    document.getElementById("clearCell").addEventListener("click", () => {
      this.imagePanel.updateCellWalls(x, y, 0);
      this.showCellControls(x, y, 0);
    });
  }

  create2DGridDisplay(gridData, selectedX, selectedY) {
    return `
      <div class="inline-block bg-gray-300 p-px">
        ${gridData
          .map(
            (row, y) => `
            <div class="flex">
              ${row
                .map(
                  (cell, x) => `
                  <div class="w-6 h-6 flex items-center justify-center bg-white m-px ${
                    x === selectedX && y === selectedY ? "bg-red-200" : ""
                  }">${cell || "·"}</div>
                `
                )
                .join("")}
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  async handleLoadImage() {
    try {
      // Get grid dimensions first
      const width = parseInt(document.getElementById("gridWidth").value);
      const height = parseInt(document.getElementById("gridHeight").value);

      if (
        isNaN(width) ||
        isNaN(height) ||
        width < 1 ||
        height < 1 ||
        width > 50 ||
        height > 50
      ) {
        alert("Please enter valid grid dimensions (1-50)");
        return;
      }

      const options = {
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] },
        ],
      };

      const files = await Neutralino.os.showOpenDialog(
        "Select an image",
        options
      );

      if (files && files.length > 0) {
        const imagePath = files[0];
        this.currentImagePath = imagePath;

        // Try to load associated JSON file
        const jsonPath = this.getAssociatedJsonPath(imagePath);
        let gridDataLoaded = false;

        try {
          const jsonExists = await Neutralino.filesystem.getStats(jsonPath);
          if (jsonExists) {
            const content = await Neutralino.filesystem.readFile(jsonPath);
            const gridData = JSON.parse(content);

            if (this.validateGridData(gridData)) {
              await this.imagePanel.loadGridData(gridData);
              gridDataLoaded = true;
              console.log("Loaded associated grid data:", jsonPath);
            }
          }
        } catch (error) {
          console.log("No associated grid data found:", error);
        }

        // If no valid grid data was loaded, initialize new grid
        if (!gridDataLoaded) {
          await this.imagePanel.resizeGrid(width, height);
        }

        // Load the image
        await this.imagePanel.displayImage(imagePath);

        // Initialize the right panel with the first cell and switch to grid tab
        this.currentX = 0;
        this.currentY = 0;
        this.showCellControls(0, 0, 0);
        this.switchTab("grid");
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      alert("Error loading image: " + error.message);
    }
  }

  setupFileTabHandlers() {
    // Grid data save/load handlers
    document.getElementById("loadGridData").addEventListener("click", () => {
      this.loadGridData();
    });
    document.getElementById("saveGridData").addEventListener("click", () => {
      this.saveGridData();
    });

    // Add Ctrl+S handler
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        this.saveGridData();
      }
    });

    // Add Ctrl+Shift+S handler for "Save As"
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        this.saveGridDataAs();
      }
    });
  }

  async applyGridSize() {
    const width = parseInt(document.getElementById("gridWidth").value);
    const height = parseInt(document.getElementById("gridHeight").value);

    if (
      isNaN(width) ||
      isNaN(height) ||
      width < 1 ||
      height < 1 ||
      width > 50 ||
      height > 50
    ) {
      alert("Please enter valid grid dimensions (1-50)");
      return;
    }

    try {
      // Initialize the grid with the specified size
      await this.imagePanel.resizeGrid(width, height);

      // Load the image
      const files = await Neutralino.os.showOpenDialog("Select an image", {
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] },
        ],
      });

      if (files && files.length > 0) {
        await this.imagePanel.displayImage(files[0]);

        // Hide grid size controls after applying
        document.getElementById("gridSizeControls").classList.add("hidden");

        // Initialize the right panel with the first cell and switch to grid tab
        this.currentX = 0;
        this.currentY = 0;
        this.showCellControls(0, 0, 0);
        this.switchTab("grid");
      }
    } catch (error) {
      alert("Error initializing grid: " + error.message);
    }
  }

  async saveGridData() {
    try {
      if (!this.currentImagePath) {
        return this.saveGridDataAs(); // Fall back to save as if no current image
      }

      const defaultPath = this.getAssociatedJsonPath(this.currentImagePath);
      const gridData = {
        dimensions: {
          width: this.imagePanel.gridData[0].length,
          height: this.imagePanel.gridData.length,
        },
        cells: this.imagePanel.gridData,
      };

      await Neutralino.filesystem.writeFile(
        defaultPath,
        JSON.stringify(gridData, null, 2)
      );
      alert("Grid configuration saved successfully!");
    } catch (error) {
      console.error("Error saving grid configuration:", error);
      // If default save fails, fall back to save as
      await this.saveGridDataAs();
    }
  }

  async saveGridDataAs() {
    try {
      const options = {
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: this.currentImagePath
          ? this.getAssociatedJsonPath(this.currentImagePath)
          : "grid_config.json",
      };

      const filePath = await Neutralino.os.showSaveDialog(
        "Save grid configuration",
        options
      );

      if (!filePath) return;

      const gridData = {
        dimensions: {
          width: this.imagePanel.gridData[0].length,
          height: this.imagePanel.gridData.length,
        },
        cells: this.imagePanel.gridData,
      };

      await Neutralino.filesystem.writeFile(
        filePath,
        JSON.stringify(gridData, null, 2)
      );
      alert("Grid configuration saved successfully!");
    } catch (error) {
      alert("Error saving grid configuration: " + error.message);
    }
  }

  getAssociatedJsonPath(imagePath) {
    // Remove the image extension and add .json
    return imagePath.replace(/\.[^/.]+$/, "") + ".json";
  }

  async loadGridData() {
    try {
      const options = {
        filters: [{ name: "JSON", extensions: ["json"] }],
      };

      const files = await Neutralino.os.showOpenDialog(
        "Load grid configuration",
        options
      );

      if (!files || !files.length) return;

      const content = await Neutralino.filesystem.readFile(files[0]);
      const gridData = JSON.parse(content);

      // Validate the loaded data
      if (!this.validateGridData(gridData)) {
        throw new Error("Invalid grid data format");
      }

      // Update grid size inputs
      document.getElementById("gridWidth").value = gridData.dimensions.width;
      document.getElementById("gridHeight").value = gridData.dimensions.height;

      // Update the grid
      await this.imagePanel.loadGridData(gridData);
      this.showCellControls(0, 0, 0);
    } catch (error) {
      alert("Error loading grid configuration: " + error.message);
    }
  }

  validateGridData(data) {
    const currentWidth = parseInt(document.getElementById("gridWidth").value);
    const currentHeight = parseInt(document.getElementById("gridHeight").value);

    return (
      data &&
      typeof data === "object" &&
      data.dimensions &&
      typeof data.dimensions.width === "number" &&
      typeof data.dimensions.height === "number" &&
      data.dimensions.width === currentWidth &&
      data.dimensions.height === currentHeight &&
      Array.isArray(data.cells) &&
      data.cells.length === data.dimensions.height &&
      data.cells.every(
        (row) =>
          Array.isArray(row) &&
          row.length === data.dimensions.width &&
          row.every(
            (cell) => typeof cell === "number" && cell >= 0 && cell <= 15
          )
      )
    );
  }

  // Add new method to update grid display
  updateGridDisplay() {
    if (this.controlsContainer.innerHTML) {
      // Only update if controls are showing
      const gridData = this.imagePanel.getGridData();
      const gridHtml = this.create2DGridDisplay(
        gridData,
        this.currentX,
        this.currentY
      );
      const gridDisplayDiv =
        this.controlsContainer.querySelector(".text-xs.font-mono");
      if (gridDisplayDiv) {
        gridDisplayDiv.innerHTML = gridHtml;
      }
    }
  }

  // Modify handleDrawModeClick in ImagePanel to trigger update
  setDrawMode(enabled) {
    this.isDrawMode = enabled;
    this.canvas.style.cursor = enabled ? "crosshair" : "pointer";
    if (!enabled) {
      this.drawGrid();
      if (this.onGridUpdate) {
        this.onGridUpdate();
      }
    }
  }

  setupExportHandlers() {
    const convertArrayBtn = document.getElementById("convertArrayBtn");
    const convertMmsBtn = document.getElementById("convertMmsBtn");
    const copyTextBtn = document.getElementById("copyTextBtn");
    const copyPythonBtn = document.getElementById("copyPythonBtn");
    const copyCppBtn = document.getElementById("copyCppBtn");
    const exportOutput = document.getElementById("exportOutput");
    const wallConfig = document.getElementById("wallConfig");

    // Convert to Array button
    convertArrayBtn.addEventListener("click", () => {
      const array = this.imagePanel.convertToArray(wallConfig.value);
      exportOutput.data = array;
      exportOutput.value = this.convertTo2DString(array);
    });

    // Convert to MMS button
    convertMmsBtn.addEventListener("click", () => {
      const mms = this.imagePanel.convertToMms();
      exportOutput.value = mms;
    });

    // Copy buttons
    copyTextBtn.addEventListener("click", () => {
      Neutralino.clipboard.writeText(exportOutput.value);
    });

    copyPythonBtn.addEventListener("click", () => {
      const array = exportOutput.data;
      const pythonArray =
        "[\n" +
        array.map((row) => "    [" + row.join(", ") + "]").join(",\n") +
        "\n]";
      Neutralino.clipboard.writeText(pythonArray);
    });

    copyCppBtn.addEventListener("click", () => {
      const array = exportOutput.data;
      const height = array.length;
      const width = array[0].length;
      const cppArray =
        // `const int MAZE_HEIGHT = ${height};\n` +
        // `const int MAZE_WIDTH = ${width};\n` +
        // `uint8_t maze[MAZE_HEIGHT][MAZE_WIDTH] = {\n` +
        `{\n` +
        array.map((row) => "    {" + row.join(", ") + "}").join(",\n") +
        "\n};";
      Neutralino.clipboard.writeText(cppArray);
    });

    // Add input validation for wall configuration
    wallConfig.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^NESW]/gi, "").toUpperCase();
    });
  }

  convertTo2DString(array) {
    const width = array[0].length;
    const height = array.length;
    let output = "";

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = array[y][x];
        // Convert to MMS format (you may need to adjust this based on MMS requirements)
        output += cell.toString();
        if (x < width - 1) output += " ";
      }
      output += "\n";
    }

    return output;
  }
}
