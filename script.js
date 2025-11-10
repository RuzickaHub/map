// Tree state management
const treeState = {};
const nodeRefs = {};

// DOM elements
let treeContainer;
let connectionsSvg;
let treeRoot;

// Create node element from data
function createNodeElement(nodeData) {
  const hasChildren = nodeData.children && nodeData.children.length > 0;
  
  const button = document.createElement('button');
  button.className = `node-button level-${nodeData.level}`;
  button.dataset.id = nodeData.id;
  
  if (hasChildren) {
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'chevron chevron-down');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '6 9 12 15 18 9');
    
    chevron.appendChild(polyline);
    button.appendChild(chevron);
  }
  
  button.appendChild(document.createTextNode(nodeData.label));
  
  return button;
}

// Build tree structure recursively
function buildTree(nodeData, parentElement) {
  // Initialize state
  treeState[nodeData.id] = nodeData.expanded !== false;
  
  const treeNode = document.createElement('div');
  treeNode.className = 'tree-node';
  
  const button = createNodeElement(nodeData);
  nodeRefs[nodeData.id] = button;
  
  if (nodeData.children && nodeData.children.length > 0) {
    const branch = document.createElement('div');
    branch.className = 'branch';
    
    branch.appendChild(button);
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'node-children';
    childrenContainer.style.display = treeState[nodeData.id] ? 'flex' : 'none';
    
    nodeData.children.forEach(child => {
      buildTree(child, childrenContainer);
    });
    
    branch.appendChild(childrenContainer);
    treeNode.appendChild(branch);
  } else {
    treeNode.appendChild(button);
  }
  
  parentElement.appendChild(treeNode);
}

// Toggle node expansion
function toggleNode(nodeId) {
  const node = nodeRefs[nodeId];
  if (!node) return;
  
  // Toggle state
  treeState[nodeId] = !treeState[nodeId];
  
  // Update UI
  updateNodeUI(node, nodeId);
  
  // Update connection lines
  updateConnections();
}

// Update node UI based on state
function updateNodeUI(node, nodeId) {
  const chevron = node.querySelector('.chevron');
  const childrenContainer = node.parentElement.querySelector('.node-children');
  
  if (treeState[nodeId]) {
    // Expanded state
    if (chevron) {
      chevron.classList.remove('chevron-right');
      chevron.classList.add('chevron-down');
      const polyline = chevron.querySelector('polyline');
      if (polyline) {
        polyline.setAttribute('points', '6 9 12 15 18 9');
      }
    }
    if (childrenContainer) {
      childrenContainer.style.display = 'flex';
    }
  } else {
    // Collapsed state
    if (chevron) {
      chevron.classList.remove('chevron-down');
      chevron.classList.add('chevron-right');
      const polyline = chevron.querySelector('polyline');
      if (polyline) {
        polyline.setAttribute('points', '9 18 15 12 9 6');
      }
    }
    if (childrenContainer) {
      childrenContainer.style.display = 'none';
    }
  }
}

// Get node position for connection lines
function getNodePosition(node) {
  if (!node) return null;
  
  const rect = node.getBoundingClientRect();
  const containerRect = treeContainer.getBoundingClientRect();
  
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top - containerRect.top + rect.height / 2,
    right: rect.right - containerRect.left,
    left: rect.left - containerRect.left,
    width: rect.width,
    height: rect.height
  };
}

// Draw connection line between two nodes
function drawConnection(startId, endId, isVisible) {
  const startPos = getNodePosition(nodeRefs[startId]);
  const endPos = getNodePosition(nodeRefs[endId]);
  
  if (!startPos || !endPos || !isVisible) {
    return '';
  }
  
  const x1 = startPos.right;
  const y1 = startPos.y;
  const x2 = endPos.left;
  const y2 = endPos.y;
  const midX = x1 + (x2 - x1) / 2;
  
  return `
    <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" 
          class="connection" 
          opacity="${isVisible ? 1 : 0}" />
  `;
}

// Get all parent-child relationships from tree data
function getConnections(nodeData, parentId = null, parentExpanded = true) {
  const connections = [];
  
  if (parentId) {
    connections.push({
      parent: parentId,
      child: nodeData.id,
      visible: parentExpanded
    });
  }
  
  if (nodeData.children && nodeData.children.length > 0) {
    const isExpanded = treeState[nodeData.id];
    nodeData.children.forEach(child => {
      connections.push(...getConnections(child, nodeData.id, parentExpanded && isExpanded));
    });
  }
  
  return connections;
}

// Update all connection lines
function updateConnections() {
  const treeData = window.loadedTreeData;
  if (!treeData) return;
  
  const connections = getConnections(treeData.tree);
  const svg = connections.map(conn => 
    drawConnection(conn.parent, conn.child, conn.visible)
  ).join('');
  
  connectionsSvg.innerHTML = svg;
}

// Set up event listeners for nodes
function setupEventListeners() {
  Object.keys(nodeRefs).forEach(nodeId => {
    const node = nodeRefs[nodeId];
    if (node) {
      const hasChildren = node.querySelector('.chevron') !== null;
      if (hasChildren) {
        node.addEventListener('click', () => toggleNode(nodeId));
      }
      updateNodeUI(node, nodeId);
    }
  });
}

// Load and initialize tree from JSON
async function loadTree() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    
    // Store data globally for connection updates
    window.loadedTreeData = data;
    
    // Build tree structure
    buildTree(data.tree, treeRoot);
    
    // Set up interactions
    setupEventListeners();
    
    // Draw initial connections
    updateConnections();
    
    // Update on window resize
    window.addEventListener('resize', updateConnections);
    
  } catch (error) {
    console.error('Chyba při načítání stromu:', error);
    treeRoot.innerHTML = '<p style="color: #ef4444;">Nepodařilo se načíst data stromu.</p>';
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  treeContainer = document.querySelector('.tree-container');
  connectionsSvg = document.getElementById('connections');
  treeRoot = document.getElementById('tree-root');
  
  loadTree();
});