let P = [], S = {gasto:0, ventas:0, cogs:0}, pending = [];
const $ = id => document.getElementById(id), cop = n => "$" + Math.round(n).toLocaleString("es-CO");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){const e=document.createElement("div");e.id="toast";e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2200)}
async function api(url, body){
  const r = await fetch(url, body ? {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)} : {});
  if (r.status === 401) { location = "/login"; return; }
  const d = await r.json(); if (!r.ok) throw new Error(d.error || "Error"); return d;
}
async function load(){ const d = await api("/api/estado"); P = d.productos; S = d.resumen; render(); }
function render(){
  const f = $("q").value.toLowerCase(), out = P.filter(p => p.stock === 0), low = P.filter(p => p.stock > 0 && p.stock <= p.min);
  const inv = P.reduce((s,p) => s + p.stock * p.cost, 0), prof = S.ventas - S.gasto;
  $("kpis").innerHTML = [["Valor del inventario",cop(inv),""],["Gastado en compras",cop(S.gasto),""],["Total vendido",cop(S.ventas),""],
    ["Utilidad / pérdida",cop(prof),prof>=0?"pos":"neg"],["Unidades en bodega",P.reduce((s,p)=>s+p.stock,0),""]]
    .map(k=>`<div class="kpi"><small>${k[0]}</small><b class="${k[2]}">${k[1]}</b></div>`).join("");
  $("alerts").innerHTML = (out.length ? `<div class="alert"><span>🚨 <b>Agotados:</b> ${out.map(p=>esc(p.code)).join(", ")}. Es necesario pedir más mercancía.</span><button class="btn" id="ped">Pedir mercancía</button></div>` : "")
    + (low.length ? `<div class="alert" style="background:#8a5a00"><span>Stock bajo: ${low.map(p=>esc(p.code)).join(", ")}</span></div>` : "");
  if (out.length) $("ped").onclick = () => { pending = out; confirmOrder(); };
  $("grid").innerHTML = P.map((p,i)=>({p,i})).filter(({p})=>(p.code+p.name).toLowerCase().includes(f)).map(({p,i})=>{
    const t = p.stock===0 ? '<span class="tag t-out">AGOTADO</span>' : p.stock<=p.min ? '<span class="tag t-low">Bajo</span>' : '<span class="tag t-ok">Disponible</span>', sell = p.detal > 0;
    return `<div class="card ${p.stock?"":"out"}"><div class="code">${esc(p.code)} · ${esc(p.cat)}</div><h3>${esc(p.name)}</h3>
    <div class="stock">${p.stock} <small>uds</small>${t}</div><div class="pr"><span>Costo</span><b>${cop(p.cost)}</b></div>
    ${sell?`<div class="pr"><span>Detal</span><b>${cop(p.detal)}</b></div><div class="pr"><span>Mayorista</span><b>${cop(p.mayor)}</b></div>`:'<div class="pr"><span>Insumo, no se vende</span></div>'}
    <div class="row"><input type="number" min="1" value="1" id="n${i}" aria-label="Cantidad">${sell?`<select id="t${i}"><option value="detal">Venta al detal</option><option value="mayor">Venta al por mayor</option></select>`:'<span></span>'}</div>
    <div class="row2"><button class="btn sm" onclick="mover(${i},'entrada')">＋ Entrada</button><button class="btn sm ghost" onclick="mover(${i})">－ Salida</button></div></div>`}).join("") || "<p>Sin resultados.</p>";
}
async function mover(i, tipo){
  const n = parseInt($("n"+i).value); if (!(n > 0)) return toast("Ingresa una cantidad válida");
  const p = P[i]; tipo = tipo || (p.detal > 0 ? $("t"+i).value : "consumo");
  try { const d = await api("/api/movimiento", {codigo:p.code, cantidad:n, tipo}); await load(); toast("Registrado: "+p.name);
        if (d.agotado) { pending = [p]; $("dmsg").textContent = "Se agotó: "+p.code+" "+p.name+". ¿Deseas solicitar más mercancía al proveedor?"; $("dlg").showModal(); }
  } catch(e) { toast(e.message); }
}
async function confirmOrder(){ await api("/api/pedido", {codigos: pending.map(p=>p.code)}); toast("Pedido registrado para "+pending.length+" producto(s)"); pending = []; }
$("dyes").onclick = () => { $("dlg").close(); confirmOrder(); }; $("dno").onclick = () => $("dlg").close();
$("q").oninput = render; load();
