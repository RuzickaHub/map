
    // Tree state management
    const treeState = {
      root: true,
      node1: true,
      node2: true
    };
    // DOM elements
    const treeContainer = document.querySelector('.tree-container');
    const connectionsSvg = document.getElementById('connections');
    // Node references
    const nodeRefs = {
      root: document.querySelector('[data-id="root"]'),
      node1: document.querySelector('[data-id="node1"]'),
      node2: document.querySelector('[data-id="node2"]'),
      node11: document.querySelector('[data-id="node11"]'),
      node12: document.querySelector('[data-id="node12"]'),
      node21: document.querySelector('[data-id="node21"]'),
      node22: document.querySelector('[data-id="node22"]')
    };
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
          chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
        }
        if (childrenContainer) {
          childrenContainer.style.display = 'flex';
        }
      } else {
        // Collapsed state
        if (chevron) {
          chevron.classList.remove('chevron-down');
          chevron.classList.add('chevron-right');
          chevron.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
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
      // Start from right side of parent button
      const x1 = startPos.right;
      const y1 = startPos.y;
      // End at left side of child button
      const x2 = endPos.left;
      const y2 = endPos.y;
      // Control point for smooth curve
      const midX = x1 + (x2 - x1) / 2;
      // Create smooth bezier curve from right side to left side
      return `
                <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" 
                      class="connection" 
                      opacity="${isVisible ? 1 : 0}" />
            `;
    }
    // Update all connection lines
    function updateConnections() {
      const connections = [
        drawConnection('root', 'node1', treeState.root),
        drawConnection('root', 'node2', treeState.root),
        drawConnection('node1', 'node11', treeState.root && treeState.node1),
        drawConnection('node1', 'node12', treeState.root && treeState.node1),
        drawConnection('node2', 'node21', treeState.root && treeState.node2),
        drawConnection('node2', 'node22', treeState.root && treeState.node2)
      ].join('');
      connectionsSvg.innerHTML = connections;
    }
    // Initialize the tree
    function initTree() {
      // Set up event listeners for all nodes
      Object.keys(nodeRefs).forEach(nodeId => {
        const node = nodeRefs[nodeId];
        if (node) {
          // Only add click listeners to nodes that have children
          const hasChildren = node.querySelector('.chevron') !== null;
          if (hasChildren) {
            node.addEventListener('click', () => toggleNode(nodeId));
          }
          // Initialize UI state
          updateNodeUI(node, nodeId);
        }
      });
      // Initial connection lines
      updateConnections();
      // Update on window resize
      window.addEventListener('resize', updateConnections);
    }
    // Start the application
    document.addEventListener('DOMContentLoaded', initTree);