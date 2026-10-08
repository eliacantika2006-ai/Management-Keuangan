const STORAGE_KEY = "uangku_transactions_v1";
const TARGET_KEY = "uangku_target_v1";
const THEME_KEY = "uangku_theme_v1";

const incomeCategories = ["Uang Saku","Gaji","Beasiswa","Freelance","Lainnya"];
const expenseCategories = ["Makanan","Transportasi","Kuliah","Pulsa & Internet","Belanja","Hiburan","Kesehatan","Kos","Lainnya"];

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
let target = Number(localStorage.getItem(TARGET_KEY) || 1500000);
let editingId = null;

const $ = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat("id-ID", {style:"currency", currency:"IDR", maximumFractionDigits:0}).format(Number(n)||0);
const todayISO = () => new Date().toISOString().slice(0,10);
const formatDate = (s) => new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function sampleData(){
  const d = new Date();
  const date = (daysAgo) => { const x=new Date(d); x.setDate(x.getDate()-daysAgo); return x.toISOString().slice(0,10); };
  return [
    {id:uid(),type:"income",amount:2500000,category:"Uang Saku",note:"Uang saku bulanan",date:date(12)},
    {id:uid(),type:"expense",amount:25000,category:"Makanan",note:"Makan siang",date:date(10)},
    {id:uid(),type:"expense",amount:15000,category:"Transportasi",note:"Ongkos kuliah",date:date(8)},
    {id:uid(),type:"expense",amount:50000,category:"Pulsa & Internet",note:"Paket internet",date:date(5)},
    {id:uid(),type:"expense",amount:35000,category:"Kuliah",note:"Fotokopi materi",date:date(3)},
    {id:uid(),type:"expense",amount:75000,category:"Hiburan",note:"Nongkrong bersama teman",date:date(1)}
  ];
}
if(!transactions){
  transactions = sampleData();
  save();
}

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); localStorage.setItem(TARGET_KEY, String(target)); }

function currentMonthTx(){
  const now = new Date();
  return transactions.filter(t => {const d=new Date(t.date+"T00:00:00"); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();});
}
function totals(list){
  return list.reduce((a,t)=>{t.type==="income"?a.income+=Number(t.amount):a.expense+=Number(t.amount);return a},{income:0,expense:0});
}
function getFiltered(){
  const q = $("searchInput").value.toLowerCase().trim();
  const type = $("typeFilter").value, cat=$("categoryFilter").value, period=$("periodFilter").value, sort=$("sortFilter").value;
  let arr = transactions.filter(t => {
    const text=(t.note+" "+t.category).toLowerCase();
    if(q && !text.includes(q)) return false;
    if(type!=="all" && t.type!==type) return false;
    if(cat!=="all" && t.category!==cat) return false;
    if(period!=="all" && !inPeriod(t.date,period)) return false;
    return true;
  });
  arr.sort((a,b)=>{
    if(sort==="newest") return b.date.localeCompare(a.date);
    if(sort==="oldest") return a.date.localeCompare(b.date);
    if(sort==="highest") return b.amount-a.amount;
    return a.amount-b.amount;
  });
  return arr;
}
function inPeriod(dateStr, period){
  const d=new Date(dateStr+"T00:00:00"), now=new Date(); d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  if(period==="today") return d.getTime()===now.getTime();
  if(period==="week"){const start=new Date(now); const day=start.getDay()||7; start.setDate(start.getDate()-day+1); return d>=start&&d<=now;}
  if(period==="month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  return true;
}

function updateDashboard(){
  const month=totals(currentMonthTx()), all=totals(transactions), balance=all.income-all.expense;
  $("balanceValue").textContent=rupiah(balance); $("incomeValue").textContent=rupiah(month.income);
  $("expenseValue").textContent=rupiah(month.expense); $("transactionCount").textContent=transactions.length;
  $("balanceStatus").textContent=balance>0?"Keuangan masih positif":balance<0?"Pengeluaran melebihi pemasukan":"Belum ada transaksi";
  const spent=month.expense, pct=target?Math.min((spent/target)*100,100):0;
  $("targetSpent").textContent=rupiah(spent); $("targetLimit").textContent=rupiah(target); $("targetProgress").style.width=pct+"%"; $("targetPercent").textContent=Math.round((target?spent/target*100:0))+"%";
  $("targetMessage").textContent=spent>target?"Target terlampaui!":spent>=target*.8?"Hati-hati, mendekati batas.":"Aman, tetap konsisten!";
  $("targetProgress").style.background=spent>target?"#d94b4b":spent>=target*.8?"#e2a33a":"var(--primary)";
  renderFlowChart(); renderRecent(); renderInsight(); renderTable(); renderCategoryFilter(); renderStats();
}

function renderFlowChart(){
  const mode=$("flowPeriod").value, tx=mode==="month"?currentMonthTx():transactions, t=totals(tx), max=Math.max(t.income,t.expense,1);
  $("flowChart").innerHTML=`<div class="bar-group"><div class="bar" style="height:${Math.max(5,t.income/max*145)}px" title="${rupiah(t.income)}"></div><div class="bar expense" style="height:${Math.max(5,t.expense/max*145)}px" title="${rupiah(t.expense)}"></div></div>`;
  $("flowChart").insertAdjacentHTML("afterend",`<div class="bar-labels"><span>↗ Pemasukan ${rupiah(t.income)}</span><span>↘ Pengeluaran ${rupiah(t.expense)}</span></div>`);
}
function renderRecent(){
  const arr=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  $("recentTransactions").innerHTML=arr.length?arr.map(txRow).join(""):`<div class="empty-state"><div class="empty-icon">₭</div><p>Belum ada transaksi.</p></div>`;
}
function txRow(t){
  return `<div class="transaction-item"><div class="tx-icon ${t.type}">${t.type==="income"?"↗":"↘"}</div><div class="tx-info"><strong>${escapeHtml(t.note)}</strong><span>${escapeHtml(t.category)} · ${formatDate(t.date)}</span></div><div class="tx-value ${t.type}">${t.type==="income"?"+":"-"}${rupiah(t.amount)}</div></div>`;
}
function renderInsight(){
  const month=currentMonthTx(), t=totals(month), boxes=[];
  if(!month.length) boxes.push(["Mulai dari sini","Belum ada transaksi bulan ini. Tambahkan transaksi pertamamu untuk mendapatkan insight."]);
  else {
    const expenses=month.filter(x=>x.type==="expense"), by={}; expenses.forEach(x=>by[x.category]=(by[x.category]||0)+Number(x.amount));
    const top=Object.entries(by).sort((a,b)=>b[1]-a[1])[0];
    if(top) boxes.push(["Pengeluaran terbesar",`Kategori ${top[0]} menjadi pengeluaran terbesar bulan ini sebesar ${rupiah(top[1])}.`]);
    boxes.push(["Kondisi keuangan",t.expense>t.income?"Pengeluaranmu lebih besar daripada pemasukan. Coba kurangi pengeluaran yang tidak terlalu penting.":"Pemasukanmu masih lebih besar atau sama dengan pengeluaran. Pertahankan kebiasaan mencatat transaksi!"]);
    const pct=target?t.expense/target*100:0;
    if(pct>=80) boxes.push(["Target bulanan",`Pengeluaran sudah mencapai ${Math.round(pct)}% dari target. Perhatikan pengeluaran berikutnya.`]);
  }
  $("insightContent").innerHTML=boxes.map(x=>`<div class="insight-box"><strong>✦ ${x[0]}</strong>${x[1]}</div>`).join("");
}
function renderCategoryFilter(){
  const current=$("categoryFilter").value;
  const cats=[...new Set(transactions.map(t=>t.category))].sort();
  $("categoryFilter").innerHTML=`<option value="all">Semua kategori</option>`+cats.map(c=>`<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  $("categoryFilter").value=cats.includes(current)?current:"all";
}
function renderTable(){
  const arr=getFiltered(), body=$("transactionTableBody");
  $("transactionEmpty").classList.toggle("hidden",arr.length!==0); body.innerHTML=arr.map(t=>`<tr>
    <td>${formatDate(t.date)}</td><td><strong>${escapeHtml(t.note)}</strong></td><td>${escapeHtml(t.category)}</td>
    <td><span class="badge ${t.type}">${t.type==="income"?"Pemasukan":"Pengeluaran"}</span></td>
    <td><strong class="${t.type==="income"?"income":"expense"}">${t.type==="income"?"+":"-"}${rupiah(t.amount)}</strong></td>
    <td><button class="action-btn" onclick="editTransaction('${t.id}')">Edit</button><button class="action-btn delete" onclick="deleteTransaction('${t.id}')">Hapus</button></td>
  </tr>`).join("");
}
function renderStats(){
  const mode=$("statsPeriod").value, tx=mode==="month"?currentMonthTx():transactions, t=totals(tx), max=Math.max(t.income,t.expense,1);
  $("statsFlowChart").innerHTML=`<div class="stat-bar-wrap"><div class="stat-bar" style="height:${Math.max(8,t.income/max*230)}px"></div><label>Pemasukan</label><strong>${rupiah(t.income)}</strong></div><div class="stat-bar-wrap"><div class="stat-bar expense" style="height:${Math.max(8,t.expense/max*230)}px"></div><label>Pengeluaran</label><strong>${rupiah(t.expense)}</strong></div>`;
  const by={}; tx.filter(x=>x.type==="expense").forEach(x=>by[x.category]=(by[x.category]||0)+Number(x.amount));
  const entries=Object.entries(by).sort((a,b)=>b[1]-a[1]), maxCat=entries[0]?.[1]||1;
  $("categoryChart").innerHTML=entries.length?entries.map(([name,val])=>`<div class="cat-row"><span class="cat-name">${escapeHtml(name)}</span><div class="cat-track"><div class="cat-fill" style="width:${val/maxCat*100}%"></div></div><span class="cat-value">${rupiah(val)}</span></div>`).join(""):`<div class="empty-state"><p>Belum ada data pengeluaran.</p></div>`;
}

function openModal(tx=null){
  editingId=tx?.id||null; $("modalTitle").textContent=tx?"Edit Transaksi":"Tambah Transaksi";
  $("transactionId").value=editingId||""; $("amountInput").value=tx?.amount||""; $("dateInput").value=tx?.date||todayISO(); $("noteInput").value=tx?.note||"";
  document.querySelectorAll('input[name="type"]').forEach(r=>r.checked=(r.value===(tx?.type||"income")));
  updateCategoryOptions(tx?.category);
  $("transactionModal").classList.remove("hidden"); setTimeout(()=>$("amountInput").focus(),50);
}
function updateCategoryOptions(selected){
  const type=document.querySelector('input[name="type"]:checked').value, cats=type==="income"?incomeCategories:expenseCategories;
  $("categoryInput").innerHTML=cats.map(c=>`<option ${c===selected?"selected":""} value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
}
function closeModal(){ $("transactionModal").classList.add("hidden"); editingId=null; $("transactionForm").reset(); $("dateInput").value=todayISO(); }
function addOrUpdate(e){
  e.preventDefault();
  const type=document.querySelector('input[name="type"]:checked').value, amount=Number($("amountInput").value), date=$("dateInput").value, category=$("categoryInput").value, note=$("noteInput").value.trim();
  if(!amount||amount<=0||!date||!category||!note){showToast("Lengkapi semua data transaksi","!");return;}
  if(editingId){ const tx=transactions.find(x=>x.id===editingId); Object.assign(tx,{type,amount,date,category,note}); showToast("Transaksi berhasil diperbarui!");}
  else {transactions.push({id:uid(),type,amount,date,category,note});showToast("Transaksi berhasil ditambahkan!");}
  save(); closeModal(); updateDashboard();
}
function editTransaction(id){ const tx=transactions.find(x=>x.id===id);if(tx)openModal(tx); }
function deleteTransaction(id){ if(!confirm("Apakah kamu yakin ingin menghapus transaksi ini?"))return;transactions=transactions.filter(x=>x.id!==id);save();updateDashboard();showToast("Transaksi berhasil dihapus!"); }
window.editTransaction=editTransaction; window.deleteTransaction=deleteTransaction;

function showToast(msg,icon="✓"){ $("toastMessage").textContent=msg;$("toastIcon").textContent=icon;$("toast").classList.remove("hidden");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>$("toast").classList.add("hidden"),2600); }
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(s){return escapeHtml(s);}

function navigate(section){
  document.querySelectorAll(".page-section").forEach(s=>s.classList.remove("active-section"));
  $(section).classList.add("active-section");
  document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.section===section));
  const names={dashboard:"Dashboard",transaksi:"Transaksi",statistik:"Statistik",tentang:"Tentang"};
  $("pageTitle").textContent=names[section]||"Dashboard";
  if(location.hash!=="#"+section) history.replaceState(null,"","#"+section);
  $("sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.section)}));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
function openAdd(){openModal();}
$("addTransactionBtn").addEventListener("click",openAdd);$("addTransactionBtn2").addEventListener("click",openAdd);$("emptyAddBtn").addEventListener("click",openAdd);
$("closeModalBtn").addEventListener("click",closeModal);$("cancelModalBtn").addEventListener("click",closeModal);$("transactionForm").addEventListener("submit",addOrUpdate);
document.querySelectorAll('input[name="type"]').forEach(r=>r.addEventListener("change",()=>updateCategoryOptions()));
["searchInput","typeFilter","categoryFilter","periodFilter","sortFilter"].forEach(id=>$(id).addEventListener("input",renderTable));
$("flowPeriod").addEventListener("change",updateDashboard);$("statsPeriod").addEventListener("change",renderStats);
$("editTargetBtn").addEventListener("click",()=>{$("targetInput").value=target;$("targetModal").classList.remove("hidden");});
$("closeTargetBtn").addEventListener("click",()=>$("targetModal").classList.add("hidden"));$("cancelTargetBtn").addEventListener("click",()=>$("targetModal").classList.add("hidden"));
$("targetForm").addEventListener("submit",e=>{e.preventDefault();target=Number($("targetInput").value);save();$("targetModal").classList.add("hidden");updateDashboard();showToast("Target pengeluaran diperbarui!");});
$("resetDataBtn").addEventListener("click",()=>{if(confirm("Hapus semua transaksi dan kembalikan target ke Rp1.500.000?")){transactions=[];target=1500000;save();updateDashboard();showToast("Semua data telah direset.");}});
$("mobileMenuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light");});
if(localStorage.getItem(THEME_KEY)==="dark")document.body.classList.add("dark");

function exportCSV(){
  if(!transactions.length){showToast("Belum ada transaksi untuk diekspor","!");return;}
  const rows=[["Tanggal","Keterangan","Kategori","Jenis","Nominal"]];
  transactions.forEach(t=>rows.push([t.date,t.note,t.category,t.type==="income"?"Pemasukan":"Pengeluaran",t.amount]));
  const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`uangku-transaksi-${todayISO()}.csv`; a.click(); URL.revokeObjectURL(url);
  showToast("Data berhasil diekspor ke CSV!");
}
$("exportCsvBtn").addEventListener("click",exportCSV);

$("currentDate").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
if(location.hash && ["dashboard","transaksi","statistik","tentang"].includes(location.hash.slice(1)))navigate(location.hash.slice(1));
updateDashboard();
