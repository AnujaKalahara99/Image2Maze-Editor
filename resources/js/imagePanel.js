class ImagePanel {
  constructor() {
    this.previewImage = document.getElementById("previewImage");
    this.dropZoneText = document.getElementById("dropZoneText");
    this.imagePanel = document.getElementById("imagePanel");
    this.toggleImageBtn = document.getElementById("toggleImage");
    this.toggleGridBtn = document.getElementById("toggleGrid");

    // Create canvas overlay for grid
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add(
      "absolute",
      "top-0",
      "left-0"
      // "pointer-events-none"
    );
    this.ctx = this.canvas.getContext("2d");

    // Add canvas to panel
    this.imagePanel.style.position = "relative";
    this.imagePanel.appendChild(this.canvas);

    // Add grid data storage
    this.gridData = Array(20)
      .fill()
      .map(() => Array(20).fill(0));
    this.selectedCell = null;

    // Add draw mode state
    this.isDrawMode = false;

    // Add callback for grid updates
    this.onGridUpdate = null;

    // Add drag state tracking
    this.isDragging = false;
    this.lastWallInfo = null;

    // Add toggle state
    this.isImageVisible = true;
    this.isGridVisible = true;

    // Setup toggle handlers
    this.setupToggleHandlers();

    // Add click handler
    // this.canvas.classList.remove("pointer-events-none");
    this.canvas.addEventListener("click", (e) => {
      if (this.isDrawMode) {
        this.handleDrawModeClick(e);
      } else {
        this.handleCanvasClick(e);
      }
    });

    // Add resize observer because the image overlay grid will not automatically align when resizing window
    this.resizeObserver = new ResizeObserver(() => {
      if (this.previewImage.src) {
        this.drawGrid();
      }
    });

    this.resizeObserver.observe(this.imagePanel);
    this.resizeObserver.observe(this.previewImage);

    // Add window resize listener for good measure
    // window.addEventListener("resize", () => {
    //   if (this.previewImage.src) {
    //     this.drawGrid();
    //   }
    // });

    // Update mouse down handler for drag start
    this.canvas.addEventListener("mousedown", (e) => {
      if (this.isDrawMode) {
        const wallInfo = this.getCellAndWallFromClick(e);
        if (wallInfo.wallInfo) {
          this.isDragging = true;
          this.lastWallInfo = wallInfo;
          // Don't call handleDrawModeClick here, let the click event handle it
        }
      }
    });

    // Add mouse up handler for drag end
    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.lastWallInfo = null;
    });

    // Modify mousemove handler to support dragging
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDrawMode) {
        const wallInfo = this.getCellAndWallFromClick(e);
        if (this.isDragging && wallInfo.wallInfo) {
          const isSameWall =
            this.lastWallInfo &&
            this.lastWallInfo.cellX === wallInfo.cellX &&
            this.lastWallInfo.cellY === wallInfo.cellY &&
            this.lastWallInfo.wallInfo.wall === wallInfo.wallInfo.wall;

          if (!isSameWall) {
            this.handleDrawModeClick(e);
            this.lastWallInfo = wallInfo;
          }
        } else {
          // Handle hover effect Later, logic is off here
          // this.handleDrawModeHover(e);
        }
      }
    });

    // Add mouse leave handler for drag cleanup
    this.canvas.addEventListener("mouseleave", () => {
      if (this.isDrawMode) {
        this.drawGrid(); // Clear hover effect
        // Don't reset isDragging here to allow dragging back into canvas
      }
    });
  }

  setupToggleHandlers() {
    this.toggleImageBtn.addEventListener("click", () => {
      this.isImageVisible = !this.isImageVisible;
      this.updateVisibility();
      this.toggleImageBtn.textContent = this.isImageVisible
        ? "Hide Image"
        : "Show Image";
      this.toggleImageBtn.classList.toggle("bg-blue-500", this.isImageVisible);
      this.toggleImageBtn.classList.toggle("bg-gray-500", !this.isImageVisible);
    });

    this.toggleGridBtn.addEventListener("click", () => {
      this.isGridVisible = !this.isGridVisible;
      this.updateVisibility();
      this.toggleGridBtn.textContent = this.isGridVisible
        ? "Hide Grid"
        : "Show Grid";
      this.toggleGridBtn.classList.toggle("bg-blue-500", this.isGridVisible);
      this.toggleGridBtn.classList.toggle("bg-gray-500", !this.isGridVisible);
    });
  }

  updateVisibility() {
    // Update image visibility
    if (this.previewImage.src) {
      this.previewImage.style.visibility = this.isImageVisible
        ? "visible"
        : "hidden";
    }

    // Update grid visibility
    this.canvas.style.visibility = this.isGridVisible ? "visible" : "hidden";

    // If both are hidden, show a message
    if (!this.isImageVisible && !this.isGridVisible) {
      this.dropZoneText.classList.remove("hidden");
      this.dropZoneText.innerHTML = `
        <p class="text-xl text-gray-400">Image and grid hidden</p>
        <p class="text-sm text-gray-400">Use toggles above to show</p>
      `;
    } else {
      if (this.previewImage.src) {
        this.dropZoneText.classList.add("hidden");
      }
    }
  }

  //PUBLIC METHOD
  displayImage(imagePath) {
    // Get file extension to determine mime type
    const ext = imagePath.split(".").pop().toLowerCase();
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
    };
    const mimeType = mimeTypes[ext] || "image/jpeg";

    // Convert file path to data URL
    Neutralino.filesystem
      .readBinaryFile(imagePath)
      .then((data) => {
        // Create blob from array buffer
        const blob = new Blob([new Uint8Array(data)], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Set up image load handler
        this.previewImage.onload = () => {
          console.log("Image loaded successfully");
          this.previewImage.classList.remove("hidden");
          this.previewImage.style.visibility = this.isImageVisible
            ? "visible"
            : "hidden";
          if (this.isImageVisible || this.isGridVisible) {
            this.dropZoneText.classList.add("hidden");
          }
          this.drawGrid();
          URL.revokeObjectURL(url);
        };

        // Set up error handler
        this.previewImage.onerror = (e) => {
          console.error("Error loading image:", e);
          this.clearImage();
          // Show error message
          this.dropZoneText.innerHTML = `
            <p class="text-xl text-red-500">Error loading image</p>
            <p class="text-sm text-red-400">Please try another image</p>
          `;
        };

        // Set the image source
        this.previewImage.src = url;
      })
      .catch((error) => {
        console.error("Error reading file:", error);
        this.clearImage();
        // Show error message
        this.dropZoneText.innerHTML = `
          <p class="text-xl text-red-500">Error reading file</p>
          <p class="text-sm text-red-400">${error.message}</p>
        `;
      });
  }

  drawGrid() {
    if (!this.isGridVisible) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    // Wait for next frame to ensure measurements are accurate
    requestAnimationFrame(() => {
      const rect = this.previewImage.getBoundingClientRect();
      const containerRect = this.imagePanel.getBoundingClientRect();

      // Calculate the actual image dimensions
      const width = rect.width;
      const height = rect.height;

      // Calculate grid dimensions to maintain aspect ratio
      const gridSize = Math.min(width, height);
      const gridX = (width - gridSize) / 2;
      const gridY = (height - gridSize) / 2;

      // Calculate the offset to center the grid on the image
      const offsetX = rect.left - containerRect.left + gridX;
      const offsetY = rect.top - containerRect.top + gridY;

      // Update canvas size to match container size
      this.canvas.width = containerRect.width;
      this.canvas.height = containerRect.height;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const cellWidth = gridSize / this.gridData[0].length;
      const cellHeight = gridSize / this.gridData.length;

      this.ctx.strokeStyle = "rgba(255, 0, 217, 0.5)";
      this.ctx.lineWidth = 1;

      // Draw vertical lines
      for (let i = 0; i <= this.gridData[0].length; i++) {
        const x = offsetX + i * cellWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x, offsetY);
        this.ctx.lineTo(x, offsetY + gridSize);
        this.ctx.stroke();
      }

      // Draw horizontal lines
      for (let i = 0; i <= this.gridData.length; i++) {
        const y = offsetY + i * cellHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, y);
        this.ctx.lineTo(offsetX + gridSize, y);
        this.ctx.stroke();
      }

      // Draw walls and selected cell
      this.drawWallsAndSelection(
        offsetX,
        offsetY,
        cellWidth,
        cellHeight,
        gridSize
      );
    });
  }

  drawWallsAndSelection(offsetX, offsetY, cellWidth, cellHeight, gridSize) {
    // Draw all configured walls
    for (let y = 0; y < this.gridData.length; y++) {
      for (let x = 0; x < this.gridData[0].length; x++) {
        const cellX = offsetX + x * cellWidth;
        const cellY = offsetY + y * cellHeight;
        const wallConfig = this.gridData[y][x];

        if (wallConfig > 0) {
          this.drawWalls(
            cellX,
            cellY,
            cellWidth,
            cellHeight,
            wallConfig,
            false
          );
        }
      }
    }

    // Highlight selected cell if exists
    if (this.selectedCell) {
      const { x, y } = this.selectedCell;
      const cellX = offsetX + x * cellWidth;
      const cellY = offsetY + y * cellHeight;

      this.ctx.fillStyle = "rgba(198, 195, 0, 0.2)";
      this.ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

      // Draw selected cell walls with stronger color
      const wallConfig = this.gridData[y][x];
      if (wallConfig > 0) {
        this.drawWalls(cellX, cellY, cellWidth, cellHeight, wallConfig, true);
      }
    }
  }

  drawWalls(cellX, cellY, cellWidth, cellHeight, wallConfig, isSelected) {
    this.ctx.strokeStyle = isSelected
      ? "rgb(247, 255, 14)"
      : "rgba(255, 0, 0, 1)";
    this.ctx.lineWidth = isSelected ? 3 : 2;

    // North wall (8)
    if (wallConfig & 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(cellX, cellY);
      this.ctx.lineTo(cellX + cellWidth, cellY);
      this.ctx.stroke();
    }
    // East wall (4)
    if (wallConfig & 4) {
      this.ctx.beginPath();
      this.ctx.moveTo(cellX + cellWidth, cellY);
      this.ctx.lineTo(cellX + cellWidth, cellY + cellHeight);
      this.ctx.stroke();
    }
    // South wall (2)
    if (wallConfig & 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(cellX, cellY + cellHeight);
      this.ctx.lineTo(cellX + cellWidth, cellY + cellHeight);
      this.ctx.stroke();
    }
    // West wall (1)
    if (wallConfig & 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(cellX, cellY);
      this.ctx.lineTo(cellX, cellY + cellHeight);
      this.ctx.stroke();
    }
  }

  clearImage() {
    if (this.previewImage.src) {
      URL.revokeObjectURL(this.previewImage.src);
    }
    this.previewImage.src = "";
    this.previewImage.classList.add("hidden");
    this.dropZoneText.classList.remove("hidden");
    this.dropZoneText.innerHTML = `
      <p class="text-xl">No image loaded</p>
      <p class="text-sm">Image will appear here</p>
    `;

    // Clear grid
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.updateVisibility();
  }

  handleCanvasClick(event) {
    if (!this.previewImage.src) return;

    const rect = this.previewImage.getBoundingClientRect();
    const containerRect = this.imagePanel.getBoundingClientRect();

    const clickX =
      event.clientX - containerRect.left - (rect.left - containerRect.left);
    const clickY =
      event.clientY - containerRect.top - (rect.top - containerRect.top);

    // Check if click is within image bounds
    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height)
      return;

    // Calculate cell coordinates
    const cellX = Math.floor((clickX / rect.width) * 20);
    const cellY = Math.floor((clickY / rect.height) * 20);

    this.selectedCell = { x: cellX, y: cellY };
    this.drawGrid(); // Redraw grid to show selection

    // Notify the control panel
    if (this.onCellSelect) {
      this.onCellSelect(cellX, cellY, this.gridData[cellY][cellX]);
    }
  }

  updateCellWalls(x, y, newConfig) {
    this.gridData[y][x] = newConfig;

    // Update adjacent cells
    const changes = [
      { dx: 0, dy: -1, thisWall: 8, otherWall: 2 }, // North
      { dx: 1, dy: 0, thisWall: 4, otherWall: 1 }, // East
      { dx: 0, dy: 1, thisWall: 2, otherWall: 8 }, // South
      { dx: -1, dy: 0, thisWall: 1, otherWall: 4 }, // West
    ];

    changes.forEach(({ dx, dy, thisWall, otherWall }) => {
      const newX = x + dx;
      const newY = y + dy;

      if (newX >= 0 && newX < 20 && newY >= 0 && newY < 20) {
        const hasWall = newConfig & thisWall;
        const adjacentCell = this.gridData[newY][newX];

        if (hasWall) {
          // Add wall to adjacent cell
          this.gridData[newY][newX] = adjacentCell | otherWall;
        } else {
          // Remove wall from adjacent cell
          this.gridData[newY][newX] = adjacentCell & ~otherWall;
        }
      }
    });

    this.drawGrid();

    // Trigger update callback
    if (this.onGridUpdate) {
      this.onGridUpdate();
    }
  }

  getGridData() {
    return this.gridData;
  }

  async resizeGrid(width, height) {
    // Create new grid with specified dimensions
    const newGrid = Array(height)
      .fill()
      .map(() => Array(width).fill(0));

    // Copy existing data where possible
    const minHeight = Math.min(height, this.gridData.length);
    const minWidth = Math.min(width, this.gridData[0].length);

    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        newGrid[y][x] = this.gridData[y][x];
      }
    }

    this.gridData = newGrid;
    this.selectedCell = null;
    this.drawGrid();
  }

  async loadGridData(data) {
    await this.resizeGrid(data.dimensions.width, data.dimensions.height);
    this.gridData = data.cells;
    this.selectedCell = null;
    this.drawGrid();
  }

  setDrawMode(enabled) {
    this.isDrawMode = enabled;
    this.canvas.style.cursor = enabled ? "crosshair" : "pointer";
    if (!enabled) {
      this.isDragging = false;
      this.lastWallInfo = null;
      this.drawGrid();
      if (this.onGridUpdate) {
        this.onGridUpdate();
      }
    }
  }

  handleDrawModeClick(event) {
    const { cellX, cellY, wallInfo } = this.getCellAndWallFromClick(event);
    if (
      wallInfo &&
      cellX >= 0 &&
      cellX < this.gridData[0].length &&
      cellY >= 0 &&
      cellY < this.gridData.length
    ) {
      const currentConfig = this.gridData[cellY][cellX];
      // During drag, we always want to add walls (not toggle)
      const newConfig = this.isDragging
        ? currentConfig | wallInfo.bit // Set the bit during drag
        : currentConfig ^ wallInfo.bit; // Toggle the bit on normal click

      this.updateCellWalls(cellX, cellY, newConfig);

      // Update lastWallInfo even for single clicks
      this.lastWallInfo = { cellX, cellY, wallInfo };

      // Trigger grid update callback
      if (this.onGridUpdate) {
        this.onGridUpdate();
      }
    }
  }

  getCellAndWallFromClick(event) {
    const rect = this.previewImage.getBoundingClientRect();
    const containerRect = this.imagePanel.getBoundingClientRect();

    const clickX =
      event.clientX - containerRect.left - (rect.left - containerRect.left);
    const clickY =
      event.clientY - containerRect.top - (rect.top - containerRect.top);

    const width = rect.width;
    const height = rect.height;
    const gridSize = Math.min(width, height);
    const cellSize = gridSize / this.gridData.length;

    const offsetX = (width - gridSize) / 2;
    const offsetY = (height - gridSize) / 2;

    const gridX = clickX - offsetX;
    const gridY = clickY - offsetY;

    const cellX = Math.floor(gridX / cellSize);
    const cellY = Math.floor(gridY / cellSize);

    // Calculate position within cell (0-1)
    const cellPosX = (gridX % cellSize) / cellSize;
    const cellPosY = (gridY % cellSize) / cellSize;

    // Determine which wall was clicked
    const wallThreshold = 0.15; // Clickable area for walls
    const cornerThreshold = 0.25; // Area to ignore near corners
    let wall = null;
    let bit = null;

    // Ignore clicks near corners
    const isNearCorner =
      (cellPosX < cornerThreshold || cellPosX > 1 - cornerThreshold) &&
      (cellPosY < cornerThreshold || cellPosY > 1 - cornerThreshold);

    if (!isNearCorner) {
      if (
        cellPosY < wallThreshold &&
        cellPosX >= cornerThreshold &&
        cellPosX <= 1 - cornerThreshold
      ) {
        // North wall - middle section only
        wall = "north";
        bit = 8;
      } else if (
        cellPosY > 1 - wallThreshold &&
        cellPosX >= cornerThreshold &&
        cellPosX <= 1 - cornerThreshold
      ) {
        // South wall - middle section only
        wall = "south";
        bit = 2;
      } else if (
        cellPosX < wallThreshold &&
        cellPosY >= cornerThreshold &&
        cellPosY <= 1 - cornerThreshold
      ) {
        // West wall - middle section only
        wall = "west";
        bit = 1;
      } else if (
        cellPosX > 1 - wallThreshold &&
        cellPosY >= cornerThreshold &&
        cellPosY <= 1 - cornerThreshold
      ) {
        // East wall - middle section only
        wall = "east";
        bit = 4;
      }
    }

    return {
      cellX,
      cellY,
      wallInfo: wall ? { wall, bit } : null,
    };
  }

  convertToArray(wallConfig = "NESW") {
    const width = this.gridData[0].length;
    const height = this.gridData.length;
    const output = [];

    // Create mapping from NESW to bit positions
    const configMap = {};
    wallConfig.split("").forEach((dir, index) => {
      const bit = 1 << (3 - index); // Convert position to bit (8,4,2,1)
      configMap[dir.toUpperCase()] = bit;
    });

    // Convert grid data to output format
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const cell = this.gridData[y][x];
        let newCell = 0;

        // Map each wall to its new position based on configuration
        if (cell & 8) newCell |= configMap["N"] || 0; // North
        if (cell & 4) newCell |= configMap["E"] || 0; // East
        if (cell & 2) newCell |= configMap["S"] || 0; // South
        if (cell & 1) newCell |= configMap["W"] || 0; // West

        row.push(newCell);
      }
      output.push(row);
    }

    return output;
  }

  convertToMms() {
    const width = this.gridData[0].length;
    const height = this.gridData.length;
    let output = "";

    // Helper function to draw horizontal walls
    const drawHorizontalWalls = (y, x) => {
      const cell = this.gridData[y][x];
      return cell & 8 ? "---" : "   "; // Check north wall
    };

    // Helper function to draw vertical walls
    const drawVerticalWalls = (y, x) => {
      const cell = this.gridData[y][x];
      return cell & 1 ? "|" : " "; // Check west wall
    };

    // Draw the maze row by row
    for (let y = 0; y < height; y++) {
      // Draw horizontal walls and posts for current row
      output += "o";
      for (let x = 0; x < width; x++) {
        output += drawHorizontalWalls(y, x) + "o";
      }
      output += "\n";

      // Draw vertical walls and cell spaces
      if (y < height) {
        for (let x = 0; x < width; x++) {
          if (x === 0) {
            output += drawVerticalWalls(y, x);
          }
          output += "   "; // Cell space
          output += x < width - 1 ? drawVerticalWalls(y, x + 1) : "";
        }
        // Add last wall if it exists (east wall of last cell)
        const lastCell = this.gridData[y][width - 1];
        if (lastCell & 4) output += "|";
        output += "\n";
      }
    }

    // Draw bottom walls for last row
    output += "o";
    for (let x = 0; x < width; x++) {
      const cell = this.gridData[height - 1][x];
      output += (cell & 2 ? "---" : "   ") + "o"; // Check south wall
    }
    output += "\n";

    return output;
  }
}
