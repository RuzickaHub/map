// MVP script: d3 tree renderer + simple editor/save
const RAW_JSON = 'data.json';
let DATA = null;
let selectedNodeId = null;

// helpers
function generateId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seg = ()=> letters[Math.floor(Math.random()*letters.length)] + Math.floor(Math.random()*10);
  return seg()+seg(); // e.g. A0A0
}
function downloadObjectAsJson(exportObj, exportName){
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", exportName);
  document.body.appendChild(a); a.click(); a.remove();
}

// load JSON (from repo raw when hosted, or relative when local)
async function loadDataFromUrl(url = RAW_JSON){
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error('Chyba při načítání data.json');
    const j = await res.json();
    DATA = j;
    render();
  }catch(e){
    console.error(e);
    alert('Nepodařilo se načíst data.json (zkontroluj CORS nebo cestu)');
  }
}

// build hierarchical structure for d3
function buildHierarchy(data){
  const nodes = data.nodes || {};
  const rootId = data.root;
  const map = new Map();
  Object.values(nodes).forEach(n => map.set(n.id, {...n}));
  // ensure children props exist
  map.forEach(v => v.children = (v.children || []).map(cid => map.get(cid)).filter(Boolean));
  return map.get(rootId);
}

/* D3 rendering */
const svg = d3.select('#svgCanvas');
const width = document.querySelector('.canvas').clientWidth;
const height = document.querySelector('.canvas').clientHeight;
const g = svg.append('g');

let zoom = d3.zoom().scaleExtent([0.2, 2]).on('zoom', (event)=> g.attr('transform', event.transform));
svg.call(zoom);

// render main
function render(){
  if(!DATA) return;
  g.selectAll('*').remove();
  const root = d3.hierarchy(buildHierarchy(DATA));
  const tree = d3.tree().nodeSize([140, 120]);
  tree(root);

  // links
  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class','link')
    .attr('d', d => {
      return `M${d.source.x},${d.source.y} C${d.source.x},${(d.source.y + d.target.y)/2} ${d.target.x},${(d.source.y + d.target.y)/2} ${d.target.x},${d.target.y}`;
    })
    .attr('fill','none')
    .attr('stroke','rgba(255,255,255,0.06)');

  // nodes
  const node = g.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class','node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('click', (event,d) => {
      event.stopPropagation();
      selectNode(d.data.id);
    });

  node.append('rect')
    .attr('x', -60).attr('y', -18).attr('width', 120).attr('height', 36)
    .attr('rx',8).attr('ry',8)
    .attr('fill', d => d.children && d.children.length ? '#062437' : '#041826')
    .attr('stroke','rgba(255,255,255,0.03)');

  node.append('text')
    .attr('class','label')
    .attr('text-anchor','middle')
    .attr('dy','0.2em')
    .text(d => d.data.title || d.data.id);

  node.append('text')
    .attr('class','id')
    .attr('text-anchor','middle')
    .attr('dy','1.6em')
    .text(d => d.data.id);

  // collapse on double click
  node.on('dblclick', (event,d)=> {
    event.stopPropagation();
    if(d.children){
      d._children = d.children;
      d.children = null;
    } else if(d._children){
      d.children = d._children; d._children = null;
    }
    // update underlying DATA children arrays
    syncDataChildren(DATA, root);
    render();
  });
}

// sync DATA.nodes children arrays from current d3 hierarchy
function syncDataChildren(data, root){
  // traverse root and set children arrays
  function walk(n){
    const arr = (n.children || []).map(c=>c.data.id);
    if(data.nodes[n.data.id]) data.nodes[n.data.id].children = arr;
    (n.children || []).forEach(walk);
  }
  walk(root);
  data.meta = data.meta || {};
  data.meta.modified = new Date().toISOString();
}

// selection & editor
function selectNode(id){
  selectedNodeId = id;
  const node = DATA.nodes[id];
  if(!node) return;
  document.getElementById('nodeId').textContent = id;
  document.getElementById('nodeTitle').value = node.title || '';
  document.getElementById('nodeTags').value = (node.tags || []).join(',');
  document.getElementById('nodeMd').value = (node.content && node.content.markdown) || '';
  document.getElementById('mdPreview').innerHTML = '';
}

// editor actions
document.getElementById('btnAddChild').addEventListener('click', ()=>{
  if(!selectedNodeId) return alert('Vyber uzel');
  const newId = generateId();
  DATA.nodes[newId] = { id:newId, title:'Nový uzel', type:'leaf', tags:[], content:{}, children:[] };
  DATA.nodes[selectedNodeId].children = DATA.nodes[selectedNodeId].children || [];
  DATA.nodes[selectedNodeId].children.push(newId);
  render();
  selectNode(newId);
});
document.getElementById('btnDeleteNode').addEventListener('click', ()=>{
  if(!selectedNodeId) return;
  if(selectedNodeId === DATA.root) return alert('Nelze smazat root');
  // remove from parent's children
  for(const k in DATA.nodes){
    const idx = (DATA.nodes[k].children||[]).indexOf(selectedNodeId);
    if(idx>=0){ DATA.nodes[k].children.splice(idx,1); break; }
  }
  // recursively delete subtree
  function del(id){
    (DATA.nodes[id].children||[]).forEach(del);
    delete DATA.nodes[id];
  }
  del(selectedNodeId);
  selectedNodeId = null;
  render();
});

document.getElementById('btnGenerateId').addEventListener('click', ()=>{
  const id = generateId();
  alert('Nové ID: ' + id + ' — můžeš ho použít v exportovaném JSONu.');
});

document.getElementById('nodeTitle').addEventListener('input', (e)=>{
  if(!selectedNodeId) return;
  DATA.nodes[selectedNodeId].title = e.target.value;
  render();
});
document.getElementById('nodeTags').addEventListener('input', (e)=>{
  if(!selectedNodeId) return;
  DATA.nodes[selectedNodeId].tags = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
});
document.getElementById('btnPreviewMd').addEventListener('click', ()=>{
  const md = document.getElementById('nodeMd').value || '';
  if(selectedNodeId){ DATA.nodes[selectedNodeId].content = DATA.nodes[selectedNodeId].content || {}; DATA.nodes[selectedNodeId].content.markdown = md; }
  document.getElementById('mdPreview').innerHTML = marked.parse(md);
});

// file actions
document.getElementById('btnReload').addEventListener('click', ()=> loadDataFromUrl(RAW_JSON));
document.getElementById('btnDownloadJson').addEventListener('click', ()=> {
  if(!DATA) return alert('Žádná data');
  downloadObjectAsJson(DATA, 'map-export.json');
});
document.getElementById('btnExportPng').addEventListener('click', ()=> {
  saveSvgAsPng(document.getElementById('svgCanvas'), 'map.png', {scale:2});
});
document.getElementById('btnUpload').addEventListener('click', ()=> document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=> {
    try{
      const obj = JSON.parse(r.result);
      DATA = obj;
      render();
    }catch(e){ alert('Chybný JSON'); }
  };
  r.readAsText(f);
});

// click outside to deselect
svg.on('click', ()=> {
  selectedNodeId = null;
  document.getElementById('nodeId').textContent = '—';
  document.getElementById('nodeTitle').value = '';
  document.getElementById('nodeTags').value = '';
  document.getElementById('nodeMd').value = '';
  document.getElementById('mdPreview').innerHTML = '';
});

// init
loadDataFromUrl();
window.addEventListener('resize', ()=> {
  // re-render to recalc sizes if needed
  render();
});
