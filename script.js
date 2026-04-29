const TOTAL_BLOCKS = 128;
const BLOCK_SIZE_KB = 4;

const diskGrid = document.getElementById("diskGrid");
const bitmapStrip = document.getElementById("bitmapStrip");
const fileTable = document.getElementById("fileTable");
const fileContentInput = document.getElementById("fileContent");
const fileNameInput = document.getElementById("fileName");
const fileSizeInput = document.getElementById("fileSize");
const directoryPathInput = document.getElementById("directoryPath");
const allocationMethodInput = document.getElementById("allocationMethod");
const accessMethodInput = document.getElementById("accessMethod");


const totalBlocksText = document.getElementById("totalBlocks");
const freeBlocksText = document.getElementById("freeBlocks");
const usedBlocksText = document.getElementById("usedBlocks");
const corruptBlocksText = document.getElementById("corruptBlocks");
const usagePercentText = document.getElementById("usagePercent");

let disk = [];
let files = [];
let journal = [];

function initializeVisualDisk() {
  diskGrid.innerHTML = "";
  bitmapStrip.innerHTML = "";
  disk = [];

  for (let i = 0; i < TOTAL_BLOCKS; i++) {
    disk.push({
      id: i,
      status: "free",
      fileName: null
    });

    const block = document.createElement("div");
    block.className = "block free";
    block.textContent = i;
    block.title = `Block ${i}: Free`;
    diskGrid.appendChild(block);

    if (i < 64) {
      const bit = document.createElement("div");
      bit.className = "bit";
      bit.title = `Bitmap Bit ${i}: 0 = Free`;
      bitmapStrip.appendChild(bit);
    }
  }

  updateMetrics();
}

function addLog(message) {
  const terminals = document.querySelectorAll(".terminal");

  terminals.forEach((terminal) => {
    const log = document.createElement("p");
    log.textContent = `> ${message}`;
    terminal.appendChild(log);
    terminal.scrollTop = terminal.scrollHeight;
  });

  journal.push(message);
}

function getFreeBlocks() {
  return disk.filter(block => block.status === "free");
}

function allocateBlocks(requiredBlocks, method) {
  const freeBlocks = getFreeBlocks();

  if (freeBlocks.length < requiredBlocks) {
    return null;
  }

  if (method.includes("Contiguous")) {
    for (let i = 0; i <= disk.length - requiredBlocks; i++) {
      const slice = disk.slice(i, i + requiredBlocks);
      if (slice.every(block => block.status === "free")) {
        return slice.map(block => block.id);
      }
    }

    return null;
  }

  if (method.includes("Linked")) {
    return freeBlocks
      .sort(() => Math.random() - 0.5)
      .slice(0, requiredBlocks)
      .map(block => block.id);
  }

  if (method.includes("Indexed")) {
    const selected = freeBlocks.slice(0, requiredBlocks + 1).map(block => block.id);
    return selected;
  }

  return null;
}

function createFile() {
  const fileName = fileNameInput.value.trim();
  const fileSize = Number(fileSizeInput.value);
  const path = directoryPathInput.value.trim() || "/root";
  const allocationMethod = allocationMethodInput.value;
  const accessMethod = accessMethodInput.value;
  const content = fileContentInput.value.trim();

  if (!fileName || !fileSize || fileSize <= 0) {
    alert("Please enter a valid file name and file size.");
    return;
  }

  if (files.some(file => file.name === fileName && file.path === path)) {
    alert("A file with this name already exists in this directory.");
    return;
  }

  const requiredBlocks = Math.ceil(fileSize / BLOCK_SIZE_KB);
  const allocatedBlocks = allocateBlocks(requiredBlocks, allocationMethod);

  if (!allocatedBlocks) {
    alert("Not enough continuous/free space available for this allocation method.");
    addLog(`Allocation failed for ${fileName}. Insufficient space.`);
    return;
  }

  allocatedBlocks.forEach(blockId => {
    disk[blockId].status = "used";
    disk[blockId].fileName = fileName;
  });

  const newFile = {
  name: fileName,
  size: fileSize,
  path: path,
  allocationMethod: allocationMethod,
  accessMethod: accessMethod,
  blocks: allocatedBlocks,
  status: "Active",
  content: content,
  createdAt: new Date().toLocaleString(),
  lastAccessed: "Not accessed yet"
};

  files.push(newFile);

  addLog(`${fileName} created using ${allocationMethod}. Blocks allocated: ${allocatedBlocks.join(", ")}`);
  addLog(`Bitmap updated for ${requiredBlocks} allocated block(s).`);
  addLog(`Journal snapshot saved for ${fileName}.`);

  renderDisk();
  renderTable();
  renderDirectoryTree();
  updateMetrics();

  fileNameInput.value = "";
  fileSizeInput.value = "";
  fileContentInput.value = "";
}
function deleteFile() {
  const fileName = fileNameInput.value.trim();
  const path = directoryPathInput.value.trim() || "/root";

  if (!fileName) {
    alert("Enter the file name you want to delete.");
    return;
  }

  const fileIndex = files.findIndex(file => file.name === fileName && file.path === path);

  if (fileIndex === -1) {
    alert("File not found in this directory.");
    addLog(`Delete failed. ${fileName} not found.`);
    return;
  }

  const file = files[fileIndex];

  file.blocks.forEach(blockId => {
    disk[blockId].status = "free";
    disk[blockId].fileName = null;
  });

  files.splice(fileIndex, 1);

  addLog(`${fileName} deleted successfully.`);
  addLog(`Blocks ${file.blocks.join(", ")} released back to free-space bitmap.`);

  renderDisk();
  renderTable();
  renderDirectoryTree();
  updateMetrics();
  

  fileNameInput.value = "";
}
function readFile() {
  const fileName = fileNameInput.value.trim();
  const path = directoryPathInput.value.trim() || "/root";

  if (!fileName) {
    alert("Enter the file name you want to read.");
    return;
  }

  const file = files.find(file => file.name === fileName && file.path === path);

  if (!file) {
    alert("File not found.");
    addLog(`Read failed. ${fileName} not found.`);
    return;
  }

  if (file.status === "Corrupted") {
    alert("File is corrupted. Recover it before reading.");
    addLog(`Read failed. ${fileName} is corrupted.`);
    return;
  }

  addLog(`Reading file: ${file.name}`);
  addLog(`Access method used: ${file.accessMethod}`);

  const blockElements = diskGrid.querySelectorAll(".block");

  file.blocks.forEach((blockId, index) => {
    setTimeout(() => {
      blockElements[blockId].classList.add("reading");

      setTimeout(() => {
        blockElements[blockId].classList.remove("reading");
      }, 800);
    }, index * 500);
  });

  file.lastAccessed = new Date().toLocaleTimeString();
  showMetadata(file);
  alert(
  `File Name: ${file.name}\n` +
  `Path: ${file.path}\n` +
  `Blocks: ${file.blocks.join(", ")}\n\n` +
  `Content:\n${file.content || "No content stored in this file."}`
);
}
function downloadFile() {
  const fileName = fileNameInput.value.trim();
  const path = directoryPathInput.value.trim() || "/root";

  if (!fileName) {
    alert("Enter the file name you want to download.");
    return;
  }

  const file = files.find(file => file.name === fileName && file.path === path);

  if (!file) {
    alert("File not found.");
    addLog(`Download failed. ${fileName} not found.`);
    return;
  }

  const blob = new Blob([file.content || "No content stored."], {
    type: "text/plain"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = file.name.endsWith(".txt") ? file.name : `${file.name}.txt`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(link.href);

  addLog(`${file.name} exported/downloaded to local system.`);
}
function simulateCrash() {
  const usedBlocks = disk.filter(block => block.status === "used");

  if (usedBlocks.length === 0) {
    alert("Create some files first before simulating a crash.");
    return;
  }

  const crashCount = Math.max(1, Math.ceil(usedBlocks.length * 0.3));

  const shuffledBlocks = usedBlocks.sort(() => Math.random() - 0.5);
  const corruptedBlocks = shuffledBlocks.slice(0, crashCount);

  corruptedBlocks.forEach(block => {
    block.status = "corrupt";
  });

  files.forEach(file => {
    const hasCorruptBlock = file.blocks.some(blockId => disk[blockId].status === "corrupt");
    if (hasCorruptBlock) {
      file.status = "Corrupted";
    }
  });

  addLog(`Disk crash simulated. ${crashCount} block(s) corrupted.`);
  addLog(`Affected files marked as corrupted in File Allocation Table.`);
  addLog(`Recovery required using journal backup.`);

  renderDisk();
  renderTable();
  renderDirectoryTree();
  updateMetrics();
  updateRaidMonitor();
  updateInsightPanels();
}
function recoverFileSystem() {
  const corruptedBlocks = disk.filter(block => block.status === "corrupt");

  if (corruptedBlocks.length === 0) {
    alert("No corrupted blocks found. System is already stable.");
    return;
  }

  corruptedBlocks.forEach(block => {
    block.status = "recovered";
  });

  files.forEach(file => {
    const wasCorrupted = file.status === "Corrupted";

    if (wasCorrupted) {
      file.status = "Recovered";
    }
  });

  addLog(`Recovery started using journal backup.`);
  addLog(`${corruptedBlocks.length} corrupted block(s) restored.`);
  addLog(`File Allocation Table updated. Affected files marked as Recovered.`);
  addLog(`System returned to stable state.`);

  renderDisk();
  renderTable();
  renderDirectoryTree();
  updateMetrics();
  updateRaidMonitor();
  updateInsightPanels();
}
function updatePerformanceAfterDefrag() {
  const beforeBar = document.querySelector(".before");
  const afterBar = document.querySelector(".after");

  if (beforeBar && afterBar) {
    beforeBar.style.width = "75%";
    afterBar.style.width = "25%";
  }

  const performanceTexts = document.querySelectorAll(".perf-row strong");

  if (performanceTexts.length >= 2) {
    performanceTexts[0].textContent = "75 ms";
    performanceTexts[1].textContent = "25 ms";
  }
}
function defragmentDisk() {
  if (files.length === 0) {
    alert("No files available to defragment.");
    return;
  }

  let currentBlockIndex = 0;

  files.forEach(file => {
    const newBlocks = [];

    for (let i = 0; i < file.blocks.length; i++) {
      newBlocks.push(currentBlockIndex);
      currentBlockIndex++;
    }

    file.blocks = newBlocks;
  });

  disk.forEach(block => {
    block.status = "free";
    block.fileName = null;
  });

  files.forEach(file => {
    file.blocks.forEach(blockId => {
      disk[blockId].status = file.status === "Recovered" ? "recovered" : "used";
      disk[blockId].fileName = file.name;
    });
  });

  addLog("Defragmentation started.");
  addLog("Scattered file blocks reorganized into continuous memory regions.");
  addLog("Read/write performance optimized successfully.");
  addLog("Fragmentation reduced and disk access time improved.");

  renderDisk();
  renderTable();
  updateMetrics();
  renderDirectoryTree();
  updatePerformanceAfterDefrag();
  updateInsightPanels();
  updateRaidMonitor();
}
function scanDisk() {
  const totalUsed = disk.filter(block => block.status === "used" || block.status === "recovered").length;
  const totalFree = disk.filter(block => block.status === "free").length;
  const totalCorrupt = disk.filter(block => block.status === "corrupt").length;

  let fragmentedFiles = 0;

  files.forEach(file => {
    const sortedBlocks = [...file.blocks].sort((a, b) => a - b);

    for (let i = 1; i < sortedBlocks.length; i++) {
      if (sortedBlocks[i] !== sortedBlocks[i - 1] + 1) {
        fragmentedFiles++;
        break;
      }
    }
  });

  const fragmentationPercent = files.length === 0
    ? 0
    : Math.round((fragmentedFiles / files.length) * 100);

  const diskHealth = Math.max(0, 100 - (totalCorrupt * 5) - fragmentationPercent);

  addLog("Disk scan started.");
  addLog(`Total blocks scanned: ${TOTAL_BLOCKS}`);
  addLog(`Used blocks: ${totalUsed}, Free blocks: ${totalFree}, Corrupted blocks: ${totalCorrupt}`);
  addLog(`Fragmented files detected: ${fragmentedFiles}`);
  addLog(`Fragmentation level: ${fragmentationPercent}%`);
  addLog(`Estimated disk health: ${diskHealth}%`);

  updateDiskHealth(diskHealth, totalCorrupt, fragmentationPercent);
  updateInsightPanels(fragmentationPercent);


  alert(
    `Disk Scan Complete\n\n` +
    `Used Blocks: ${totalUsed}\n` +
    `Free Blocks: ${totalFree}\n` +
    `Corrupted Blocks: ${totalCorrupt}\n` +
    `Fragmentation: ${fragmentationPercent}%\n` +
    `Disk Health: ${diskHealth}%`
  );
}
function updateInsightPanels(fragmentationPercent = 0) {
  const corruptBlocks = disk.filter(block => block.status === "corrupt");
  const recoveredBlocks = disk.filter(block => block.status === "recovered");

  const health = Math.max(0, 100 - corruptBlocks.length * 5 - fragmentationPercent);

  const healthScore = document.getElementById("healthScore");
  const healthFill = document.getElementById("healthFill");
  const fragmentScore = document.getElementById("fragmentScore");
  const badSectorList = document.getElementById("badSectorList");

  if (healthScore) healthScore.textContent = `${health}%`;
  if (healthFill) healthFill.style.width = `${health}%`;
  if (fragmentScore) fragmentScore.textContent = `${fragmentationPercent}%`;

  if (badSectorList) {
    if (corruptBlocks.length === 0 && recoveredBlocks.length === 0) {
      badSectorList.textContent = "No bad sectors detected.";
    } else {
      badSectorList.innerHTML = `
        Corrupted Blocks: ${corruptBlocks.map(b => b.id).join(", ") || "None"}<br>
        Recovered Blocks: ${recoveredBlocks.map(b => b.id).join(", ") || "None"}
      `;
    }
  }
  
}
function runTerminalCommand() {
  const input = document.getElementById("terminalInput");
  const command = input.value.trim();

  if (!command) {
    alert("Please enter a command.");
    return;
  }

  addLog(`Command entered: ${command}`);

  const parts = command.split(" ");
  const action = parts[0].toLowerCase();
  const subAction = parts[1]?.toLowerCase();

  if (action === "create") {
    const name = parts[1];
    const size = Number(parts[2]);

    if (!name || !size) {
      addLog("Invalid command. Use: create filename size");
      return;
    }

    fileNameInput.value = name;
    fileSizeInput.value = size;
    directoryPathInput.value = "/root/terminal";
    createFile();
  }

  else if (action === "delete") {
    const name = parts[1];

    if (!name) {
      addLog("Invalid command. Use: delete filename");
      return;
    }

    fileNameInput.value = name;
    directoryPathInput.value = "/root/terminal";
    deleteFile();
  }

  else if (action === "scan") {
    scanDisk();
  }

  else if (action === "crash") {
    simulateCrash();
  }

  else if (action === "recover") {
    recoverFileSystem();
  }

  else if (action === "defrag") {
    defragmentDisk();
  }

  else if (action === "status") {
    showSystemStatus();
  }

  else if (action === "show" && subAction === "files") {
    showFilesCommand();
  }

  else if (action === "show" && subAction === "bitmap") {
    showBitmapCommand();
  }

  else if (action === "help") {
    showHelpCommand();
  }

  else {
    addLog("Unknown command. Type 'help' to see available commands.");
  }

  input.value = "";
}
function showSystemStatus() {
  const used = disk.filter(block => block.status === "used" || block.status === "recovered").length;
  const free = disk.filter(block => block.status === "free").length;
  const corrupt = disk.filter(block => block.status === "corrupt").length;

  addLog("System status report:");
  addLog(`Total blocks: ${TOTAL_BLOCKS}`);
  addLog(`Used blocks: ${used}`);
  addLog(`Free blocks: ${free}`);
  addLog(`Corrupted blocks: ${corrupt}`);
  addLog(`Total files: ${files.length}`);
}

function showFilesCommand() {
  if (files.length === 0) {
    addLog("No files found in directory.");
    return;
  }

  addLog("Files stored in system:");

  files.forEach(file => {
    addLog(`${file.name} | ${file.path} | Blocks: ${file.blocks.join(", ")} | Status: ${file.status}`);
  });
}

function showBitmapCommand() {
  const bitmap = disk.map(block => {
    if (block.status === "free") return "0";
    if (block.status === "used") return "1";
    if (block.status === "corrupt") return "X";
    if (block.status === "recovered") return "R";
  }).join("");

  addLog("Bitmap representation:");
  addLog(bitmap);
  addLog("Legend: 0 = Free, 1 = Used, X = Corrupt, R = Recovered");
}

function showHelpCommand() {
  addLog("Available file system commands:");
  addLog("create filename size  → create file and allocate blocks");
  addLog("delete filename       → delete file and free blocks");
  addLog("scan                  → scan disk for corruption and fragmentation");
  addLog("crash                 → simulate disk crash");
  addLog("recover               → recover corrupted blocks using journal");
  addLog("defrag                → defragment disk and optimize performance");
  addLog("status                → show disk status report");
  addLog("show files            → list all files and allocated blocks");
  addLog("show bitmap           → display bitmap free-space map");
  addLog("help                  → display command guide");
}
function updateDiskHealth(health, corruptBlocks, fragmentation) {
  const healthValue = document.querySelector(".health-card h2");
  const healthStatus = document.querySelector(".health-card p");

  if (healthValue) {
    healthValue.textContent = `${health}%`;
  }

  if (healthStatus) {
    if (corruptBlocks > 0) {
      healthStatus.textContent = "Warning • Corrupted blocks detected";
      healthStatus.style.color = "#fb7185";
    } else if (fragmentation > 40) {
      healthStatus.textContent = "Moderate • High fragmentation detected";
      healthStatus.style.color = "#facc15";
    } else {
      healthStatus.textContent = "Stable • No major issue detected";
      healthStatus.style.color = "#bbf7d0";
    }
  }
}
function updateRaidMonitor() {

  const corruptBlocks = disk.filter(block => block.status === "corrupt").length;

  const mirrorHealth = document.getElementById("mirrorHealth");
  const recoveryReady = document.getElementById("recoveryReady");
  const snapshotStatus = document.getElementById("snapshotStatus");
  const redundancyStatus = document.getElementById("redundancyStatus");

  if (corruptBlocks > 0) {

    mirrorHealth.textContent = "Degraded";
    mirrorHealth.style.color = "#fb7185";

    recoveryReady.textContent = "72%";
    recoveryReady.style.color = "#facc15";

    snapshotStatus.textContent = "Recovery Required";
    snapshotStatus.style.color = "#fb7185";

    redundancyStatus.textContent = "Partially Active";
    redundancyStatus.style.color = "#facc15";

  }

  else {

    mirrorHealth.textContent = "Stable";
    mirrorHealth.style.color = "#4ade80";

    recoveryReady.textContent = "98%";
    recoveryReady.style.color = "#4ade80";

    snapshotStatus.textContent = "Available";
    snapshotStatus.style.color = "#7dd3fc";

    redundancyStatus.textContent = "Enabled";
    redundancyStatus.style.color = "#4ade80";

  }

}
function renderDisk() {
  const blockElements = diskGrid.querySelectorAll(".block");
  const bitElements = bitmapStrip.querySelectorAll(".bit");

  disk.forEach((block, index) => {
    const element = blockElements[index];
    element.className = `block ${block.status}`;
    element.title = `Block ${block.id}: ${block.status.toUpperCase()} ${block.fileName ? "- " + block.fileName : ""}`;
  });

  bitElements.forEach((bit, index) => {
    if (!disk[index]) return;

    if (disk[index].status === "free") {
      bit.style.background = "#22c55e";
      bit.title = `Bitmap Bit ${index}: 0 = Free`;
    } else if (disk[index].status === "used") {
      bit.style.background = "#38bdf8";
      bit.title = `Bitmap Bit ${index}: 1 = Used`;
    } else if (disk[index].status === "corrupt") {
      bit.style.background = "#ef4444";
      bit.title = `Bitmap Bit ${index}: X = Corrupt`;
    } else if (disk[index].status === "recovered") {
      bit.style.background = "#facc15";
      bit.title = `Bitmap Bit ${index}: R = Recovered`;
    }
  });
}

function renderTable() {
  if (files.length === 0) {
    fileTable.innerHTML = `<tr><td colspan="5">No file records available.</td></tr>`;
    return;
  }

  fileTable.innerHTML = files.map(file => `
    <tr>
      <td>${file.name}</td>
      <td>${file.path}</td>
      <td>${file.blocks.join(", ")}</td>
      <td>${file.allocationMethod}</td>
      <td>${file.status}</td>
    </tr>
  `).join("");
}
function renderDirectoryTree() {
  const tree = document.getElementById("directoryTree");
  if (!tree) return;

  const folders = {};

  files.forEach(file => {
    const path = file.path || "/root";

    if (!folders[path]) {
      folders[path] = [];
    }

    folders[path].push(file);
  });

  let html = `<p>📁 root</p><ul>`;

  Object.keys(folders).forEach(path => {
    html += `<li>📁 ${path}
      <ul>
        ${folders[path].map(file => `<li>📄 ${file.name} <span>(${file.status})</span></li>`).join("")}
      </ul>
    </li>`;
  });

  html += `</ul>`;

  tree.innerHTML = html;
}

function showMetadata(file) {
  const viewer = document.getElementById("metadataViewer");

  if (!viewer || !file) return;

  viewer.innerHTML = `
    <div>
      <span>File Name</span>
      <strong>${file.name}</strong>
    </div>

    <div>
      <span>Directory Path</span>
      <strong>${file.path}</strong>
    </div>

    <div>
      <span>File Size</span>
      <strong>${file.size} KB</strong>
    </div>

    <div>
      <span>Allocation Method</span>
      <strong>${file.allocationMethod}</strong>
    </div>

    <div>
      <span>Access Method</span>
      <strong>${file.accessMethod}</strong>
    </div>

    <div>
      <span>Status</span>
      <strong>${file.status}</strong>
    </div>

    <div>
      <span>Created At</span>
      <strong>${file.createdAt}</strong>
    </div>

    <div>
      <span>Last Accessed</span>
      <strong>${file.lastAccessed}</strong>
    </div>
  `;
}
function updateMetrics() {
  const usedBlocks = disk.filter(block => block.status === "used").length;
  const freeBlocks = disk.filter(block => block.status === "free").length;
  const corruptBlocks = disk.filter(block => block.status === "corrupt").length;
  const usagePercent = Math.round((usedBlocks / TOTAL_BLOCKS) * 100);

  totalBlocksText.textContent = TOTAL_BLOCKS;
  usedBlocksText.textContent = usedBlocks;
  freeBlocksText.textContent = freeBlocks;
  corruptBlocksText.textContent = corruptBlocks;
  usagePercentText.textContent = `${usagePercent}%`;

  const gauge = document.querySelector(".gauge");
  if (gauge) {
    gauge.style.background = `conic-gradient(#38bdf8 ${usagePercent * 3.6}deg, #1e293b 0deg)`;
  }
}

const createBtn = document.querySelector(".form-card .primary");
const readBtn = document.querySelector(".form-card .gray");
const deleteBtn = document.querySelector(".form-card .red");
const crashBtn = document.querySelector(".bottom-grid .red");
const recoverBtn = document.querySelector(".bottom-grid .yellow");
const defragBtn = document.querySelector(".bottom-grid .green");
const scanBtn = document.querySelector(".scanner-card .green");
const downloadBtn = document.getElementById("downloadBtn");

createBtn.addEventListener("click", createFile);
readBtn.addEventListener("click", readFile);
deleteBtn.addEventListener("click", deleteFile);
crashBtn.addEventListener("click", simulateCrash);
recoverBtn.addEventListener("click", recoverFileSystem);
defragBtn.addEventListener("click", defragmentDisk);
scanBtn.addEventListener("click", scanDisk);
downloadBtn.addEventListener("click", downloadFile);

initializeVisualDisk();
const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(link => {

  link.addEventListener("click", () => {

    navLinks.forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");

  });

});
const terminalRunBtn = document.querySelector(".command-box .primary");

terminalRunBtn.addEventListener("click", runTerminalCommand);

document.getElementById("terminalInput").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    runTerminalCommand();
  }
});