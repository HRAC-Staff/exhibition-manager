(function(){
const STORAGE_KEY = "hrac_stable_foundation_v1";
const DEFAULT_YEARS = ["2026","2027","2028"];
const APP_VERSION = "10.2";
let state = loadState();
let dragId = null;
let dirty = false;
let lastDiagnostics = null;
let diagnosticsShown = false;
let morningBriefShown = false;
let collaborationPromptShown = false;
let readOnlyMode = false;

function uid(){ return "a_" + Math.random().toString(36).slice(2,9) + "_" + Date.now().toString(36); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addDays(date, days){ const d = new Date(date + "T12:00:00"); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function fmtDate(s){ if(!s) return "No date set"; return new Date(s+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function monthShort(s){ return s ? new Date(s+"T12:00:00").toLocaleDateString(undefined,{month:"short"}).toUpperCase() : ""; }
function dayNum(s){ return s ? new Date(s+"T12:00:00").getDate() : ""; }

function blankArtist(year){
  return {
    id:uid(), year:String(year), manualOrder:Date.now(), gallery:"Main", role:"Artist", participationMode:"solo-artist",
    artistName:"", email:"", phone:"", address:"", owner:"", linkedCuratorId:"",
    exhibitionTitle:"", exhibitionStartDate:"", exhibitionEndDate:"", installDate:"", deinstallDate:"",
    titleDueDate:"", promoDueDate:"", inventoryDueDate:"",
    profileImage:null, exhibitionBanner:null, promoImages:[], artistStatement:"", inventoryFile:null, contractFile:null,
    favorite:false, pinned:false,
    bioReceived:"no", headshotReceived:"no", statementReceived:"no", resumeReceived:"no", promoImagesReceived:"no", inventoryReceived:"no", w9Received:"no",
    contractStatus:"still waiting", contractSentDate:"", contractReceivedDate:"",
    website:"", instagram:"", facebook:"", notes:""
  };
}
function demoState(){
  const rows = [
    ["Alexandra Jenkins","Color Field Reimagined","Main","2026-05-14","2026-06-20","sent",82],
    ["David Chen","Fragments of Light","Main","2026-05-22","2026-06-28","still waiting",65],
    ["Maria Alvarez","Between Worlds","Main","2026-06-10","2026-07-16","received",100],
    ["Samuel Ortiz","The Collective Memory","Main","2026-06-24","2026-07-29","sent",48],
    ["Lila Patel","Echoes of Time","Mezzanine","2026-05-29","2026-06-30","received",75],
    ["Jordan Lee","Material Conversations","Mezzanine","2026-07-08","2026-08-10","still waiting",33],
    ["Noah Williams","Perception Shift","Mezzanine","2026-08-05","2026-09-08","still waiting",0]
  ];
  const artists = rows.map((r,i)=>{
    const a = blankArtist("2026");
    Object.assign(a,{artistName:r[0],exhibitionTitle:r[1],gallery:r[2],installDate:r[3],deinstallDate:r[4],contractStatus:r[5],email:r[0].toLowerCase().replaceAll(" ",".")+"@email.com",manualOrder:i+1});
    if(r[6] > 70){ a.bioReceived="yes"; a.statementReceived="yes"; a.promoImagesReceived="yes"; }
    if(r[6] > 90){ a.inventoryReceived="yes"; }
    return a;
  });
  const a2027 = blankArtist("2027"); Object.assign(a2027,{artistName:"Tanner McGrew",exhibitionTitle:"Paper Cities",gallery:"Main",installDate:"2027-03-01"});
  const a2028 = blankArtist("2028"); Object.assign(a2028,{artistName:"Ashley Sanders",exhibitionTitle:"Soft Architecture",gallery:"Mezzanine",installDate:"2028-04-12"});
  artists.push(a2027,a2028);
  return {years:[...DEFAULT_YEARS], activeTab:"dashboard", selectedArtistId:artists[0].id, artists, lastUpdated:new Date().toLocaleString()};
}
function normalize(s){
  s.years = Array.isArray(s.years) && s.years.length ? s.years.map(String) : [...DEFAULT_YEARS];
  s.artists = Array.isArray(s.artists) ? s.artists : [];
  s.activityLog = Array.isArray(s.activityLog) ? s.activityLog : [];
  s.salesRecords = Array.isArray(s.salesRecords) ? s.salesRecords : [];
  s.collectionCare = Array.isArray(s.collectionCare) ? s.collectionCare : [];
  s.callsForEntry = Array.isArray(s.callsForEntry) ? s.callsForEntry : [];
  s.educationPrograms = Array.isArray(s.educationPrograms) ? s.educationPrograms : [];
  s.schoolTours = Array.isArray(s.schoolTours) ? s.schoolTours : [];
  s.educationResources = Array.isArray(s.educationResources) ? s.educationResources : [];
  s.educationContacts = Array.isArray(s.educationContacts) ? s.educationContacts : [];
  s.educationView = s.educationView || "home";
  s.educationCategory = s.educationCategory || "ARTisTRY Class";
  s.selectedEducationId = s.selectedEducationId || null;
  s.selectedEducationType = s.selectedEducationType || null;
  s.educationPrograms = s.educationPrograms.map(p=>({
    category:"ARTisTRY Class", title:"", status:"Planning", date:"", endDate:"", time:"", location:"HRAC",
    audience:"All Ages", ageRange:"", capacity:0, attendance:0, instructor:"", assistant:"",
    season:"", registrationStatus:"", fee:"", budget:"", exhibitionId:"",
    bigIdea:"", essentialQuestion:"", learningObjectives:"", studioObjectives:"",
    vocabulary:"", materials:"", safetyNotes:"", assessment:"", reflection:"",
    extensionActivities:"", louisianaStandards:"", naeaStandards:"",
    communications:"", evaluation:"", lessonsLearned:"", notes:"", participants:[], profileImages:[], ...p
  }));
  s.schoolTours = s.schoolTours.map(t=>({
    school:"", date:"", time:"", grade:"", students:0, teacher:"", email:"", phone:"",
    status:"Planning", exhibitionId:"", packetSent:false, busConfirmed:false,
    activityReady:false, volunteerAssigned:false, lessonPlan:"", tourGoals:"",
    vocabulary:"", louisianaStandards:"", naeaStandards:"", accessibility:"",
    followUp:"", evaluation:"", notes:"", participants:[], profileImages:[], ...t
  }));
  s.educationResources = s.educationResources.map(r=>({
    title:"", type:"Teacher Guide", audience:"All Ages", gradeRange:"", exhibitionId:"",
    standards:"", louisianaStandards:"", naeaStandards:"", vocabulary:"",
    learningObjectives:"", description:"", instructions:"", materials:"",
    fileName:"", revisionHistory:"", notes:"", updated:"", profileImages:[], ...r
  }));

  s.educationPrograms.forEach(p=>{ p.participants=Array.isArray(p.participants)?p.participants:[]; p.profileImages=Array.isArray(p.profileImages)?p.profileImages:[]; });
  s.schoolTours.forEach(t=>{ t.participants=Array.isArray(t.participants)?t.participants:[]; t.profileImages=Array.isArray(t.profileImages)?t.profileImages:[]; });
  s.educationResources.forEach(r=>{ r.profileImages=Array.isArray(r.profileImages)?r.profileImages:[]; });
  s.staffProfiles = s.staffProfiles && typeof s.staffProfiles === "object" ? s.staffProfiles : {};
  s.appVersion = s.appVersion || APP_VERSION;
  s.loadedFileName = s.loadedFileName || "No JSON loaded yet";
  s.loadedAt = s.loadedAt || "";
  s.lastSavedBy = s.lastSavedBy || "Not recorded";
  s.lastSavedAt = s.lastSavedAt || "";
  s.trackerMetadata = s.trackerMetadata || {};
  s.currentEditorName = s.currentEditorName || s.trackerMetadata.lastEditor || "";
  s.currentEditorInitials = s.currentEditorInitials || s.trackerMetadata.editorInitials || "";
  s.currentSessionId = s.currentSessionId || s.trackerMetadata.sessionId || "";
  s.editingStartedAt = s.editingStartedAt || "";
  s.artists.forEach((a,i)=>{
    a.manualOrder = a.manualOrder ?? i;
    a.profileImage = a.profileImage ?? null;
    a.exhibitionBanner = a.exhibitionBanner ?? null;
    a.favorite = !!a.favorite;
    a.pinned = !!a.pinned;
    a.promoImages = Array.isArray(a.promoImages) ? a.promoImages : [];
    a.artistStatement = a.artistStatement ?? "";
    a.inventoryFile = a.inventoryFile ?? null;
    a.contractFile = a.contractFile ?? null;
    a.gallery = a.gallery || "";
    a.role = a.role || "Artist";
    a.participationMode = a.participationMode || "solo-artist";
  });
  s.activeTab = "dashboard";
  return s;
}
function emptyState(){
  return {years:[...DEFAULT_YEARS], activeTab:"dashboard", selectedArtistId:null, artists:[], activityLog:[], appVersion:APP_VERSION, loadedFileName:"No JSON loaded yet", loadedAt:"", lastSavedBy:"Not recorded", lastSavedAt:"", currentEditorName:"", currentEditorInitials:"", currentSessionId:"", salesRecords:[], collectionCare:[], callsForEntry:[], educationPrograms:[], schoolTours:[], educationResources:[], educationContacts:[], staffProfiles:{}, trackerMetadata:{trackerVersion:APP_VERSION}, editingStartedAt:"", lastUpdated:new Date().toLocaleString()};
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyState();
  } catch(e){
    return emptyState();
  }
}
function runDiagnostics(){
  const results = [];
  function check(name, ok, detail){ results.push({name, ok:!!ok, detail:detail||""}); }
  let tempArtist = null;
  try{ tempArtist = blankArtist("DIAG"); } catch(e){ check("Temporary artist can be created without saving", false, e.message); }
  check("State object loaded", !!state && Array.isArray(state.years) && Array.isArray(state.artists), "Core tracker data structure is available.");
  check("Year tabs configured", state.years && state.years.length >= 1, "At least one exhibition year is present.");
  check("Temporary artist can be created without saving", !!tempArtist && tempArtist.id && tempArtist.year === "DIAG", "Used only for the self-check and not added to the tracker.");
  try{ check("Completion math works", tempArtist ? typeof derived(tempArtist).percent === "number" : false, "Profile completion can be calculated."); } catch(e){ check("Completion math works", false, e.message); }
  try{ check("Checklist logic works", tempArtist ? Array.isArray(needsList(tempArtist)) : false, "Missing/received items can be evaluated."); } catch(e){ check("Checklist logic works", false, e.message); }
  check("Import control is available", !!document.getElementById("importFile"), "The JSON import input is present.");
  check("Export control is available", !!document.querySelector('[data-action="export-all"]'), "Backup export button is present.");
  let localOk = false;
  try{ localStorage.setItem("hrac_diag_probe","ok"); localOk = localStorage.getItem("hrac_diag_probe") === "ok"; localStorage.removeItem("hrac_diag_probe"); } catch(e){ localOk = false; }
  check("Browser storage check", true, localOk ? "Local snapshot support is available." : "Local storage could not be confirmed in this test environment, but manual JSON import/export is still available.");
  const passed = results.every(r=>r.ok);
  lastDiagnostics = {passed, results, dataLoaded: state.artists.length > 0, checkedAt:new Date().toLocaleString()};
  return lastDiagnostics;
}
function diagnosticsMarkup(){
  const d = lastDiagnostics || runDiagnostics();
  const goText = d.passed ? "Diagnostics passed" : "Diagnostics need attention";
  const dataText = d.dataLoaded ? "Artist data is loaded." : "No artist data is loaded yet. Upload the latest JSON backup to begin.";
  return `<div class="diag-card ${d.passed?"go":"nogo"}"><strong>${d.passed?"✅ Tracker self-check: Go":"⚠️ Tracker self-check: No-go"}</strong><div>${goText}. ${dataText}</div><div class="diag-actions"><label class="file-btn">⇧ Upload Latest JSON<input id="diagImportFile" class="hidden-file" type="file" accept=".json"></label><button class="btn" data-tab="testing">View Diagnostics</button></div><div class="diag-mini">Last checked: ${esc(d.checkedAt)}</div></div>`;
}
function showStartupDiagnostic(){
  const splash = document.getElementById("loadingScreen");
  const progress = document.getElementById("loadingProgress");
  const status = document.getElementById("loadingStatus");
  const steps = [
    [18, "Checking system integrity..."],
    [42, "Verifying data storage..."],
    [68, "Validating configuration..."],
    [88, "Preparing workspace..."],
    [100, "Ready."]
  ];
  let i = 0;
  const advance = () => {
    const step = steps[i] || steps[steps.length-1];
    if(progress) progress.style.width = step[0] + "%";
    if(status) status.textContent = step[1];
    i++;
    if(i < steps.length){
      setTimeout(advance, 260);
    } else {
      const d = runDiagnostics();
      if(status){
        status.textContent = d.passed
          ? (d.dataLoaded ? "Self-check passed. Opening tracker..." : "Self-check passed. Please upload the latest JSON backup.")
          : "Self-check found an issue. Open the Test page for details.";
      }
      setTimeout(()=>{ if(splash) splash.classList.add("hidden"); showCollaborationNotice(); }, 650);
    }
  };
  if(diagnosticsShown) return;
  diagnosticsShown = true;
  setTimeout(advance, 160);
}

function preferredEditorName(){
  try{ return localStorage.getItem("hrac_editor_name") || state.currentEditorName || ""; } catch(e){ return state.currentEditorName || ""; }
}
function preferredEditorInitials(){
  try{ return localStorage.getItem("hrac_editor_initials") || state.currentEditorInitials || ""; } catch(e){ return state.currentEditorInitials || ""; }
}
function makeInitials(name){
  const cleaned = String(name || "").trim();
  if(!cleaned) return "HRAC";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if(parts.length === 1) return parts[0].replace(/[^a-z0-9]/gi,"").slice(0,8).toUpperCase() || "HRAC";
  return parts.map(p=>p[0]).join("").replace(/[^a-z0-9]/gi,"").slice(0,6).toUpperCase() || "HRAC";
}
function safeFilePart(value, fallback="HRACStaff"){
  return String(value || fallback).trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,32) || fallback;
}
function sessionIdFor(name, initials){
  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  return safeFilePart(initials || makeInitials(name), "HRAC") + "-" + now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes());
}
function editorDisplayName(){
  return state.currentEditorName || preferredEditorName() || "HRAC Staff";
}
function collaborationStatusText(){
  if(readOnlyMode) return {label:"Read-only mode", cls:"readonly", detail:"You can review and print, but editing is paused to protect the shared JSON."};
  if(state.currentEditorName) return {label:"Ready to edit", cls:"", detail:"Editing session started by " + state.currentEditorName + (state.editingStartedAt ? " at " + state.editingStartedAt : "") + "."};
  return {label:"Confirm latest JSON", cls:"warn", detail:"Before editing, upload the latest shared JSON and make sure no one else is editing."};
}
function collaborationPanelMarkup(){
  const st = collaborationStatusText();
  return `<div class="collab-panel"><strong>Collaboration</strong><span class="collab-status ${st.cls}">${st.label}</span><small>${esc(st.detail)}</small><small><b>Current file:</b> ${esc(state.loadedFileName || "No JSON loaded yet")}</small><small><b>Last saved:</b> ${esc(state.lastSavedAt || "Not recorded")} ${state.lastSavedBy && state.lastSavedBy !== "Not recorded" ? "by "+esc(state.lastSavedBy) : ""}</small><small><b>Session:</b> ${esc(state.currentSessionId || "Not started")}</small><div class="diag-actions"><button class="filter" data-action="show-collab-notice">Collaboration Rules</button>${readOnlyMode?`<button class="filter" data-action="switch-to-editing">Start Editing</button>`:""}</div></div>`;
}
function showCollaborationNotice(force=false){
  if(collaborationPromptShown && !force) return;
  collaborationPromptShown = true;
  const existing = document.getElementById("collabModalBackdrop");
  if(existing) existing.remove();
  const div = document.createElement("div");
  div.id = "collabModalBackdrop";
  div.className = "collab-modal-backdrop";
  div.innerHTML = `<div class="collab-modal" role="dialog" aria-modal="true" aria-labelledby="collabTitle">
    <div class="collab-modal-head"><h2 id="collabTitle">Working Together</h2><p>This tracker currently uses a shared JSON file.</p></div>
    <div class="collab-modal-body">
      <div class="empty"><strong>To prevent accidental overwrites:</strong><ol class="collab-steps"><li>Load the latest shared JSON before editing.</li><li>Make sure no one else is editing at the same time.</li><li>Make your updates.</li><li>Download the updated JSON when finished.</li><li>Replace the shared HRAC JSON with your newest version.</li></ol></div>
      <div class="grid"><div class="field"><label>Staff Name</label><input id="collabEditorName" value="" placeholder="Staff Name" autocomplete="name"><small id="collabNameHelp" class="diag-mini">Enter the staff member editing this JSON backup.</small></div></div>
      <div class="collab-actions"><button class="btn primary" data-action="confirm-collab-edit">I Loaded the Latest JSON — Start Editing</button><button class="btn" data-action="confirm-collab-readonly">Continue in Read-Only Mode</button></div>
    </div>
  </div>`;
  document.body.appendChild(div);
}
function closeCollaborationNotice(){ const el=document.getElementById("collabModalBackdrop"); if(el) el.remove(); }
function setReadOnlyMode(on){
  readOnlyMode = !!on;
  const app = document.querySelector(".app");
  if(app) app.classList.toggle("readonly-mode", readOnlyMode);
  const root = document.getElementById("appRoot");
  if(root && readOnlyMode && !document.getElementById("readonlyBanner")) root.insertAdjacentHTML("afterbegin", `<div id="readonlyBanner" class="readonly-banner">Read-only mode is on. You can review and print, but editing is paused to protect the shared JSON.</div>`);
  if(root && !readOnlyMode){ const b=document.getElementById("readonlyBanner"); if(b) b.remove(); }
}
function confirmCollaborationEdit(){
  const input = document.getElementById("collabEditorName");
  const name = (input?.value || "").trim();
  if(!name){
    const help = document.getElementById("collabNameHelp");
    if(help) help.innerHTML = '<span style="color:var(--red);font-weight:950">Please enter a staff name before opening the tracker.</span>';
    if(input) input.focus();
    return;
  }
  const initials = makeInitials(name);
  state.currentEditorName = name;
  state.currentEditorInitials = initials;
  state.currentSessionId = sessionIdFor(name, initials);
  state.editingStartedAt = new Date().toLocaleString();
  try{ localStorage.setItem("hrac_editor_name", name); } catch(e){}
  readOnlyMode = false;
  logActivity("Started editing session", name);
  closeCollaborationNotice();
  markDirty();
  render();
}
function confirmCollaborationReadOnly(){
  readOnlyMode = true;
  closeCollaborationNotice();
  render();
  setReadOnlyMode(true);
}
function prepareStateForExport(){
  let name = state.currentEditorName || preferredEditorName();
  if(!name) name = prompt("Who is saving this JSON backup?", "HRAC Staff") || "HRAC Staff";
  let initials = state.currentEditorInitials || makeInitials(name);
  state.currentEditorName = name;
  state.currentEditorInitials = initials;
  state.currentSessionId = state.currentSessionId || sessionIdFor(name, initials);
  state.lastSavedBy = name;
  state.lastSavedAt = new Date().toLocaleString();
  state.appVersion = APP_VERSION;
  state.trackerMetadata = {
    trackerVersion: APP_VERSION,
    lastEditor: name,
    editorInitials: initials,
    savedAt: state.lastSavedAt,
    savedDateISO: new Date().toISOString(),
    sessionId: state.currentSessionId,
    loadedFileName: state.loadedFileName || "No JSON loaded yet"
  };
  state.collaborationReminder = "Replace the shared HRAC JSON with this newest file so the next staff member has the latest data.";
  logActivity("Saved JSON backup", "Saved by " + name);
}
function exportSharedJson(){
  if(readOnlyMode && !confirm("You are in read-only mode. Download a JSON backup anyway?")) return;
  prepareStateForExport();
  const fname = backupFileName();
  const result = download(fname, JSON.stringify(state,null,2));
  saveLocalSnapshot();
  render();
  showBackupDownloadLink(result);
  alert("Your updated JSON backup is ready. If your browser does not automatically download it, use the green download link beside the save status.\n\nFile: " + fname + "\nSaved by: " + state.lastSavedBy + "\nSaved: " + state.lastSavedAt + "\nSession: " + (state.currentSessionId || "Not recorded"));
}

function showBackupDownloadLink(result){
  const pill = document.getElementById("saveStatus");
  if(!pill || !result) return;
  pill.innerHTML = "✓ Backup ready<small>Download should start automatically</small>" + `<a class="backup-link" href="${result.url}" download="${esc(result.filename)}">⇩ Click here if the JSON did not download</a>`;
}

function logActivity(action, detail){
  state.activityLog = Array.isArray(state.activityLog) ? state.activityLog : [];
  state.activityLog.unshift({time:new Date().toLocaleString(), action, detail:detail || ""});
  state.activityLog = state.activityLog.slice(0,30);
}

function markDirty(){
  dirty = true;
  state.lastUpdated = new Date().toLocaleString();
  const pill = document.getElementById("saveStatus");
  if(pill) pill.innerHTML = "● Unsaved changes<small>Use Save Backup</small>";
}

function markClean(){
  dirty = false;
  const pill = document.getElementById("saveStatus");
  if(pill) pill.innerHTML = "✓ Backup saved<small>Just now</small>";
}

function saveLocalSnapshot(){
  // Manual safety snapshot only. This is no longer called while typing.
  state.appVersion = APP_VERSION;
  state.lastUpdated = new Date().toLocaleString();
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){ console.warn("Local snapshot unavailable; continue using JSON backups."); }
  markClean();
}

function backupFileName(){
  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  const stamp = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) + "_" + pad(now.getHours()) + pad(now.getMinutes());
  const year = state.activeTab && state.years && state.years.includes(state.activeTab) ? state.activeTab : (state.years?.[0] || "AllYears");
  const editor = safeFilePart(state.currentEditorName || preferredEditorName(), "HRACStaff");
  return "HRAC_Artists_" + year + "_" + editor + "_" + stamp + ".json";
}
function selectedArtist(){ return state.artists.find(a => a.id === state.selectedArtistId) || null; }
function selectedArtistForYear(year, orderedList){
  const current = selectedArtist();
  if(current && String(current.year) === String(year)) return current;
  return (orderedList && orderedList[0]) || null;
}
function activeYear(){ return state.years.includes(state.activeTab) ? state.activeTab : state.years[0]; }
function galleryOrder(g){ return g === "Main" ? 0 : g === "Mezzanine" ? 1 : 2; }
function sortArtists(list){
  return [...list].sort((a,b)=> Number(!!b.pinned)-Number(!!a.pinned) || Number(!!b.favorite)-Number(!!a.favorite) || galleryOrder(a.gallery)-galleryOrder(b.gallery) || (Number(a.manualOrder)||0)-(Number(b.manualOrder)||0) || (a.artistName||"").localeCompare(b.artistName||""));
}
function grouped(year){
  const list = sortArtists(state.artists.filter(a => String(a.year) === String(year)));
  return {
    Main:list.filter(a=>a.gallery==="Main"),
    Mezzanine:list.filter(a=>a.gallery==="Mezzanine"),
    Unassigned:list.filter(a=>a.gallery!=="Main" && a.gallery!=="Mezzanine")
  };
}
function received(v){ return v === "yes" || v === true || v === "na"; }
function dueDates(a){
  return {
    titleDue:a.titleDueDate || (a.installDate ? addDays(a.installDate,-90) : ""),
    promoDue:a.promoDueDate || (a.installDate ? addDays(a.installDate,-50) : ""),
    inventoryDue:a.inventoryDueDate || (a.installDate ? addDays(a.installDate,-30) : "")
  };
}
function needsList(a){
  const d = dueDates(a), arr = [];
  if(!a.artistName) arr.push({label:"Artist name",due:null,type:"info"});
  if(!a.email) arr.push({label:"Email",due:null,type:"info"});
  if(!a.exhibitionTitle) arr.push({label:"Exhibition title",due:d.titleDue,type:"statement"});
  if(!received(a.bioReceived)) arr.push({label:"Bio",due:d.promoDue,type:"statement"});
  if(!received(a.statementReceived)) arr.push({label:"Statement",due:d.promoDue,type:"statement"});
  if(!(received(a.promoImagesReceived) || (a.promoImages && a.promoImages.length))) arr.push({label:"Promo images",due:d.promoDue,type:"promo"});
  if(!(received(a.inventoryReceived) || a.inventoryFile)) arr.push({label:"Inventory",due:d.inventoryDue,type:"inventory"});
  if(a.contractStatus !== "received") arr.push({label:"Signed contract",due:a.contractSentDate ? addDays(a.contractSentDate,14) : null,type:"contract"});
  if(!a.installDate) arr.push({label:"Install date",due:null,type:"install"});
  if(!a.deinstallDate) arr.push({label:"De-install date",due:null,type:"deinstall"});
  return arr;
}
function derived(a){
  const tasks = [
    !!a.artistName, !!a.email, !!a.exhibitionTitle, !!a.installDate,
    received(a.bioReceived), received(a.statementReceived),
    received(a.promoImagesReceived) || (a.promoImages && a.promoImages.length>0),
    received(a.inventoryReceived) || !!a.inventoryFile,
    a.contractStatus === "received",
    !!a.deinstallDate
  ];
  const complete = tasks.filter(Boolean).length;
  const total = tasks.length;
  const percent = Math.round(complete/total*100);
  const needs = needsList(a);
  const overdue = needs.some(n => n.due && n.due < todayISO());
  const soon = needs.some(n => n.due && n.due >= todayISO() && n.due <= addDays(todayISO(),10));
  return {...dueDates(a), complete, total, percent, status:percent===100?"Ready":overdue?"Overdue":soon?"Due Soon":"In Progress", cls:percent===100?"good":overdue?"bad":soon?"warn":""};
}
function initials(a){
  const n = (a.artistName || a.exhibitionTitle || "HRAC").trim();
  return n.split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase() || "HR";
}
function humanSize(n){
  n = Number(n||0);
  return n < 1024 ? n+" B" : n < 1048576 ? (n/1024).toFixed(1)+" KB" : (n/1048576).toFixed(1)+" MB";
}
function fileLink(f,label="Download"){
  return f && f.dataUrl ? `<a class="download" href="${f.dataUrl}" download="${esc(f.name)}">${label}</a>` : "";
}

function updateLiveComputedFields(a){
  // Keep typing smooth: do NOT re-render the whole app here.
  const d = derived(a);
  const profileTitle = document.querySelector(".profile-title");
  const profileSub = document.querySelector(".profile-sub");
  if(profileTitle && a.id === state.selectedArtistId) profileTitle.textContent = a.artistName || "Untitled Artist";
  if(profileSub && a.id === state.selectedArtistId) profileSub.textContent = a.exhibitionTitle || "No exhibition title yet";
}

function render(){
  renderTabs();
  const app = document.getElementById("appRoot");
  const managerViews = ["dashboard","exhibitions","schedule","calendar","contacts","education","sales","collection","reports","calls","insights","profile","testing"];
  app.innerHTML = managerViews.map(v=>`<div id="view-${v}" class="view"></div>`).join("") +
    state.years.map(y=>`<div id="view-${y}" class="view"></div>`).join("");
  renderDashboard();
  state.years.forEach(renderYear);
  renderExhibitionsHub();
  renderScheduleHub();
  renderCalendar();
  renderContactsHub();
  renderEducationHub();
  renderSalesHub();
  renderCollectionHub();
  renderReports();
  renderCallsHub();
  renderInsightsHub();
  renderProfileHub();
  renderTesting();
  showTab(state.activeTab || "dashboard", false);
  setReadOnlyMode(readOnlyMode);
}

function navIcon(name){
  const icons={
    dashboard:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
    exhibitions:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15l3-3 2.5 2.5L16 12l4 4"/><circle cx="9" cy="9" r="1.4"/></svg>`,
    schedule:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9h17"/><path d="M8 13h3M13 13h3M8 16h3"/></svg>`,
    contacts:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M6.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6"/></svg>`,
    education:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12.5V17c2.7 2 7.3 2 10 0v-4.5"/><path d="M21 9v6"/></svg>`,
    sales:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 18 5"/><path d="M10 5h8v8"/><path d="M5 11v7h7"/></svg>`,
    collection:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4z"/><path d="M8 7V4h8v3M9 12h6M12 9v6"/></svg>`,
    reports:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4"/></svg>`,
    calls:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>`,
    insights:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/></svg>`,
    profile:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-4.5 3.3-6.7 7.5-6.7s6.7 2.2 7.5 6.7"/></svg>`,
    testing:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>`
  };
  return icons[name]||icons.dashboard;
}

function renderTabs(){
  const tabs = [
    ["dashboard","Dashboard"],
    ["exhibitions","Exhibitions"],
    ["schedule","Schedule"],
    ["contacts","Contacts"],
    ["education","Education & Outreach"],
    ["sales","Sales Pipeline"],
    ["collection","Collection Care"],
    ["reports","Reports & Docs"],
    ["calls","Calls for Entry"],
    ["insights","Insights"],
    ["profile","My Profile"],
    ["testing","System Test"]
  ];
  document.getElementById("tabs").innerHTML = tabs.map(([id,label]) =>
    `<button class="${id===state.activeTab?"active":""}" data-tab="${id}"><span class="ico">${navIcon(id)}</span><span class="nav-label">${label}</span></button>`
  ).join("");
}
function showTab(tab,doSave=true){
  state.activeTab = tab;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const view = document.getElementById("view-"+tab);
  if(view) view.classList.add("active");
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  if(doSave) markDirty();
}
function allEvents(includePast=false){
  const events = [];
  state.artists.filter(a=>includePast || !isPastExhibition(a)).forEach(a=>{
    if(a.installDate) events.push({date:a.installDate,label:(a.artistName||"Untitled")+" — Install",sub:(a.gallery||"")+" Gallery",type:"install",artist:a});
    if(a.deinstallDate) events.push({date:a.deinstallDate,label:(a.artistName||"Untitled")+" — Deinstall",sub:(a.gallery||"")+" Gallery",type:"deinstall",artist:a});
    needsList(a).forEach(n=> n.due && events.push({date:n.due,label:n.label+" due",sub:a.artistName||"Untitled",type:n.due<todayISO()?"overdue":"due",artist:a}));
  });
  return events.sort((a,b)=>a.date.localeCompare(b.date));
}
function renderDashboard(){
  const working = activeOperationalArtists();
  const year = activeYear();
  const yearWorking = sortArtists(working.filter(a=>String(a.year)===String(year)));
  const total = yearWorking.length;
  const ready = yearWorking.filter(a=>derived(a).percent===100).length;
  const inProgress = yearWorking.filter(a=>derived(a).percent>0 && derived(a).percent<100).length;
  const notStarted = yearWorking.filter(a=>derived(a).percent===0).length;
  const avg = total ? Math.round(yearWorking.reduce((sum,a)=>sum+derived(a).percent,0)/total) : 0;
  const overdueTasks = commandDeadlineTasks(yearWorking, true).filter(t=>t.date < todayISO()).length;
  const weekTasks = commandDeadlineTasks(yearWorking, true).filter(t=>t.date >= todayISO() && t.date <= addDays(todayISO(),7)).length;
  const priority = commandPriority(yearWorking);
  const systemReady = !!lastDiagnostics?.passed;
  document.getElementById("view-dashboard").innerHTML = `
    <div class="workspace-hero">
      <div class="workspace-brand">
        <img src="assets/logos/hrac-logo.png" alt="HRAC logo">
        <div>
          <div class="cmd-kicker">Hammond Regional Arts Center</div>
          <h1>HRAC Art Center Manager</h1>
          <p>Your daily workspace for exhibitions, education, outreach, deadlines, contacts, and collection care.</p>
        </div>
      </div>
      <div class="workspace-meta">
        <strong>Version ${APP_VERSION}</strong>
        <button class="system-ready-link ${systemReady?"ready":"attention"}" data-tab="testing">
          <span></span>${systemReady?"System Ready":"Check System"}
        </button>
      </div>
    </div>
    <div class="morning-card">
      <div>
        <span class="cmd-kicker">Morning Brief</span>
        <h2>${morningGreeting()}</h2>
        <p>${briefSentence(total, overdueTasks, weekTasks)}</p>
        <div class="morning-actions">
          <button class="manager-btn" data-action="print-due-list">🖨 Print Due List</button>
          <button class="manager-btn secondary" data-tab="schedule">Open Schedule</button>
        </div>
      </div>
      <div class="priority-box">
        <strong>Today's Priority</strong>
        <span>${priority ? esc(priority.artist.artistName||"Untitled Artist") + " — " + esc(priority.label) : "No urgent priority found."}</span>
      </div>
    </div>
    <div class="cmd-grid dashboard-clean-grid">
      <section class="panel cmd-progress">
        <div class="panel-head"><div class="panel-title">▰ ${esc(year)} Exhibition Progress</div></div>
        <div class="panel-body">
          <div class="cmd-bar"><span style="width:${avg}%"></span></div>
          <div class="cmd-big-number">${avg}% <small>Complete</small></div>
          <div class="cmd-stat-list">
            <div><b>Total</b><span>${total}</span></div>
            <div><b>Complete</b><span>${ready}</span></div>
            <div><b>In Progress</b><span>${inProgress}</span></div>
            <div><b>Not Started</b><span>${notStarted}</span></div>
          </div>
        </div>
      </section>
      <section class="panel cmd-deadlines">
        <div class="panel-head"><div class="panel-title">◷ Upcoming Deadlines</div><button class="filter" data-tab="schedule">Schedule →</button></div>
        <div class="panel-body">${commandDeadlineMarkup(yearWorking)}</div>
      </section>
      <section class="panel cmd-missing">
        <div class="panel-head"><div class="panel-title">☑ Missing Documents</div></div>
        <div class="needs-list">${missingDocumentButtons(yearWorking)}</div>
        <div id="commandFocusList" class="cmd-focus-list"><div class="empty">Click a missing-item row above to pull a focused staff list.</div></div>
      </section>
    </div>`;
}
function morningGreeting(){
  const h = new Date().getHours();
  const name = editorDisplayName();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return greeting + ", " + name + ".";
}
function briefSentence(total, overdue, week){
  if(!state.artists.length) return "No artist data is loaded yet. Upload the latest JSON backup to begin.";
  return `${total} active artist profile(s) are in the working year. ${overdue} overdue item(s). ${week} task(s) due within the next 7 days.`;
}
function commandDeadlineTasks(list, includeOverdue=false){
  const tasks=[];
  list.forEach(a=>{
    reportTasks(a).forEach(t=>{
      if(!t.done && t.due && (includeOverdue || t.due >= todayISO())) tasks.push({artist:a, label:t.label, date:t.due});
    });
  });
  return tasks.sort((a,b)=>a.date.localeCompare(b.date));
}
function commandPriority(list){ return commandDeadlineTasks(list, true)[0] || null; }
function commandDeadlineMarkup(list){
  const tasks = commandDeadlineTasks(list, true).filter(t=>t.date <= addDays(todayISO(),30)).slice(0,12);
  if(!tasks.length) return `<div class="empty">No upcoming incomplete tasks in the next 30 days.</div>`;
  const byDate = tasks.reduce((acc,t)=>{ (acc[t.date]=acc[t.date]||[]).push(t); return acc; },{});
  return Object.entries(byDate).map(([date,items])=>`<div class="cmd-date-block"><div class="datebox"><span>${monthShort(date)}</span><b>${dayNum(date)}</b></div><div>${items.map(t=>`<div class="cmd-task ${date<todayISO()?"overdue":""}" data-artist-id="${t.artist.id}"><span class="box ${date<todayISO()?"missing":""}"></span><b>${esc(t.artist.artistName||"Untitled")}</b><small>${esc(t.label)}</small></div>`).join("")}</div></div>`).join("");
}
function missingDocumentCounts(list){
  return [
    {key:"contract", label:"Contracts", count:list.filter(a=>a.contractStatus!=="received" && a.contractStatus!=="N/A").length},
    {key:"statement", label:"Statements", count:list.filter(a=>!received(a.statementReceived)).length},
    {key:"headshot", label:"Headshots", count:list.filter(a=>!received(a.headshotReceived) && !a.profileImage).length},
    {key:"promo", label:"Promo Images", count:list.filter(a=>!(received(a.promoImagesReceived) || (a.promoImages&&a.promoImages.length))).length},
    {key:"inventory", label:"Inventory", count:list.filter(a=>!(received(a.inventoryReceived) || a.inventoryFile)).length},
    {key:"w9", label:"W-9", count:list.filter(a=>!received(a.w9Received)).length}
  ];
}
function missingDocumentButtons(list){
  return missingDocumentCounts(list).map(m=>`<button class="missing-row" data-action="show-missing" data-kind="${m.key}"><span>${esc(m.label)}</span><b>${m.count}</b></button>`).join("");
}
function artistsMissing(kind){
  const list = sortArtists(activeOperationalArtists().filter(a=>String(a.year)===String(activeYear())));
  return list.filter(a=>{
    if(kind==="contract") return a.contractStatus!=="received" && a.contractStatus!=="N/A";
    if(kind==="statement") return !received(a.statementReceived);
    if(kind==="headshot") return !received(a.headshotReceived) && !a.profileImage;
    if(kind==="promo") return !(received(a.promoImagesReceived) || (a.promoImages&&a.promoImages.length));
    if(kind==="inventory") return !(received(a.inventoryReceived) || a.inventoryFile);
    if(kind==="w9") return !received(a.w9Received);
    return false;
  });
}
function showMissingFocus(kind){
  const box = document.getElementById("commandFocusList");
  if(!box) return;
  const labelMap={contract:"Contracts",statement:"Statements",headshot:"Headshots",promo:"Promo Images",inventory:"Inventory",w9:"W-9"};
  const list = artistsMissing(kind);
  box.innerHTML = `<strong>${esc(labelMap[kind]||"Missing Items")}: ${list.length}</strong>` + (list.length ? list.map(a=>`<div class="artist-row cmd-mini-row" data-artist-id="${a.id}"><div><div class="artist-name">${esc(a.artistName||"Untitled")}</div><div class="artist-show">${esc(a.exhibitionTitle||"No title")} • ${esc(a.gallery||"No gallery")}</div></div><span class="pill bad">Missing</span></div>`).join("") : `<div class="empty">Nothing missing here. Tiny confetti moment.</div>`);
}
function systemStatusMarkup(){
  const d = lastDiagnostics || runDiagnostics();
  const items = [
    ["Database Ready", !!state],
    ["JSON Valid", Array.isArray(state.artists)],
    ["Storage Available", true],
    ["Reports Available", !!document.getElementById("view-reports")],
    ["Archive Filter Active", true]
  ];
  return `<div class="sys-list">${items.map(i=>`<div><span>${i[1]?"✓":"!"}</span>${esc(i[0])}</div>`).join("")}</div>`;
}
function archiveYearsMarkup(list){
  const yrs=[...new Set(list.map(a=>a.year).filter(Boolean))].sort();
  return yrs.length ? "Years tucked away: "+yrs.join(", ") : "No finished exhibitions hidden yet.";
}
function activityLogMarkup(){
  const log = Array.isArray(state.activityLog) ? state.activityLog.slice(0,12) : [];
  if(!log.length) return `<div class="empty">No activity recorded yet for this file.</div>`;
  return `<div class="activity-list">${log.map(item=>`<div><time>${esc(item.time)}</time><strong>${esc(item.action)}</strong><span>${esc(item.detail||"")}</span></div>`).join("")}</div>`;
}
function metric(icon,num,label,sub,cls){ return `<div class="metric ${cls||""}"><div class="circle">${icon}</div><div><strong>${num}</strong><b>${label}</b><small>${sub}</small></div></div>`; }
function need(icon,label,count){ return `<div class="need"><span class="need-ico">${icon}</span><strong>${label}</strong><span class="need-count">${count}</span></div>`; }
function dashboardArtistGroups(){
  const g = grouped("2026");
  return `<div class="gallery-main"><div class="gallery-label">⌂ MAIN GALLERY <small>(Ground Floor)</small></div>${g.Main.map(dashArtistRow).join("") || `<div class="empty" style="margin:14px">No Main Gallery artists.</div>`}</div>
  <div class="gallery-mezz"><div class="gallery-label">▰ MEZZANINE GALLERY <small>(Upstairs)</small></div>${g.Mezzanine.map(dashArtistRow).join("") || `<div class="empty" style="margin:14px">No Mezzanine artists.</div>`}</div>`;
}
function dashArtistRow(a){ const d=derived(a); return `<div class="artist-row ${state.selectedArtistId===a.id?"active":""}" draggable="true" data-artist-id="${a.id}" data-search="${esc([a.artistName,a.exhibitionTitle,a.gallery,a.email,a.notes].join(" ").toLowerCase())}"><span class="grab">⋮⋮</span><div><div class="artist-name">${esc(a.artistName||"Untitled")}</div><div class="artist-show">${esc(a.exhibitionTitle||"No title")}</div></div><span class="dot ${d.status==="Overdue"?"red":d.status==="Due Soon"?"gold":""}"></span><span class="mini-ring" style="--p:${d.percent}%">${d.percent}%</span><button class="more">⋮</button></div>`; }
function eventRow(e){ return `<div class="event-row ${e.type}"><div class="datebox"><span>${monthShort(e.date)}</span><b>${dayNum(e.date)}</b></div><div><strong>${esc(e.label)}</strong><div class="artist-show">${esc(e.sub)}</div></div><span>♩</span></div>`; }
function miniCalendar(events){
  const now = new Date(), y=now.getFullYear(), m=now.getMonth(), first=new Date(y,m,1), days=new Date(y,m+1,0).getDate(), start=first.getDay();
  const map = new Map();
  events.forEach(e=>{ const d=new Date(e.date+"T12:00:00"); if(d.getFullYear()===y && d.getMonth()===m) map.set(d.getDate(),e.type); });
  let html = `<div class="calendar-grid">${["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=>`<div class="dow">${d}</div>`).join("")}`;
  for(let i=0;i<start;i++) html += `<div></div>`;
  for(let day=1; day<=days; day++){ const type=map.get(day)||""; html += `<div class="day ${type}">${day}</div>`; }
  return html + `</div>`;
}
function curatorCards(){
  const base = state.artists.slice(0,4);
  if(!base.length) return `<div class="empty">No curator data yet.</div>`;
  return base.map(a=>{ const d=derived(a); return `<div class="curator"><div class="cur-top"><div class="avatar-sm">${initials(a)}</div><div><strong>${esc(a.owner||a.artistName||"Curator")}</strong><div class="artist-show">Artist Profile</div></div></div><div class="progress"><span style="width:${d.percent}%"></span></div><strong>${d.percent}%</strong> Complete<br><small>⚠ ${needsList(a).length} item(s) still needed</small></div>`; }).join("");
}

function renderYear(year){
  const g = grouped(year);
  const ordered = [...g.Main,...g.Mezzanine,...g.Unassigned];
  // Important: rendering every year should NOT change the global selectedArtistId.
  // That reset was causing year sidebars, especially 2027, to snap back to the first artist after every click.
  const sel = selectedArtistForYear(year, ordered);
  document.getElementById("view-"+year).innerHTML = `<div class="year-shell">
    <aside class="year-sidebar"><div class="panel-head"><div class="panel-title">♙ ${year} Artists</div></div><label class="panel-search"><input data-year-search="${year}" placeholder="Search this year..."><span>⌕</span></label><div class="filters"><button class="filter" data-year-filter="${year}" data-val="">All</button><button class="filter red" data-year-filter="${year}" data-val="contract">Missing Contract</button><button class="filter gold" data-year-filter="${year}" data-val="promo">Missing Promo</button></div><div class="year-artists" id="yearList-${year}">${ordered.length ? ordered.map(yearArtistCard).join("") : `<div class="empty">No artists yet.</div>`}</div><div style="padding:0 16px 18px"><button class="btn primary" data-action="add-artist-year" data-year="${year}">+ Add Artist to ${year}</button></div></aside>
    <main>${sel ? profileMarkup(sel) : `<div class="empty">Select or add an artist.</div>`}</main>
  </div>`;
}
function yearArtistCard(a){
  const d=derived(a);
  const avatar=a.profileImage?.dataUrl ? `<img class="artist-list-avatar" src="${a.profileImage.dataUrl}" alt="">` : `<span class="artist-list-avatar fallback">${esc(initials(a))}</span>`;
  return `<div class="artist-row ${state.selectedArtistId===a.id?"active":""}" draggable="true" data-artist-id="${a.id}" data-search="${esc([a.artistName,a.exhibitionTitle,a.gallery,a.email,a.notes].join(" ").toLowerCase())}">
    <span class="grab">⋮⋮</span>${avatar}
    <div><div class="artist-name">${a.pinned?'<span title="Pinned">📌</span> ':''}${a.favorite?'<span title="Favorite">★</span> ':''}${esc(a.artistName||"Untitled Artist")}</div><div class="artist-show">${esc(a.gallery||"No gallery")} • ${esc(a.exhibitionTitle||"No title")}</div></div>
    <span class="dot ${d.status==="Overdue"?"red":d.status==="Due Soon"?"gold":""}"></span><span class="mini-ring" style="--p:${d.percent}%">${d.percent}%</span><button class="more">⋮</button>
  </div>`;
}

function profileMarkup(a){
  const d=derived(a), needs=needsList(a);
  return `<div class="profile">
    <div class="profile-hero"><div class="profile-id"><div class="avatar-lg">${a.profileImage?.dataUrl ? `<img src="${a.profileImage.dataUrl}" alt="">` : initials(a)}</div><div><div class="profile-title">${esc(a.artistName||"Untitled Artist")}</div><div class="profile-sub">${esc(a.exhibitionTitle||"No exhibition title yet")}</div><div class="pills"><span class="pill">${esc(a.gallery||"No gallery")}</span><span class="pill">${esc(a.role||"No role")}</span><span class="pill ${d.cls}">${d.status}</span></div></div></div><div class="completion"><div class="ring-big" style="--p:${d.percent}%">${d.percent}%</div><div><strong>${d.complete}/${d.total} complete</strong><br><small>${needs.length ? needs.length+" item(s) still needed" : "Profile looks ready"}</small></div><div class="profile-actions"><button class="btn" data-action="toggle-favorite">${a.favorite?"★ Favorited":"☆ Favorite"}</button><button class="btn" data-action="toggle-pin">${a.pinned?"📌 Pinned":"📍 Pin Exhibition"}</button><button class="btn" data-action="email-template">Email Template</button><button class="btn" data-action="print-artwork-label">Artwork Label</button><button class="btn" data-action="print-artist-checklist">Print Checklist</button><button class="btn" data-action="copy-reminder">Reminder</button><button class="btn" data-action="duplicate-selected">Duplicate</button><button class="btn danger" data-action="delete-selected">Delete</button></div></div></div>
    <div class="form-grid">${photoContact(a)}${statementCard(a)}${promoInventory(a,d)}${exhibitionCard(a,d)}${materialsCard(a)}${webCard(a)}${contractCard(a)}${notesCard(a)}</div>
  </div>`;
}
function section(title,body,cls=""){ return `<section class="section ${cls}"><div class="section-title" data-action="toggle-section"><span>${title}</span><span>−</span></div><div class="section-body">${body}</div></section>`; }
function field(a,key,label,type="text"){ return `<div class="field"><label>${label}</label><input type="${type}" data-field="${key}" data-id="${a.id}" value="${esc(a[key]||"")}"></div>`; }
function selectField(a,key,label,opts){ return `<div class="field"><label>${label}</label><select data-field="${key}" data-id="${a.id}">${opts.map(o=>`<option value="${esc(o)}" ${a[key]===o?"selected":""}>${esc(o||"")}</option>`).join("")}</select></div>`; }
function photoContact(a){ return section("👤 Artist Image + Contact",`<div class="photo-layout"><div class="photo-card"><div class="photo-preview">${a.profileImage?.dataUrl ? `<img src="${a.profileImage.dataUrl}" alt="">` : initials(a)}</div><button class="upload-btn" data-upload-trigger="${a.id}" data-kind="profileImage">Upload Profile Picture</button><input class="hidden-file" type="file" data-upload="${a.id}" data-kind="profileImage" accept="image/*">${a.profileImage ? `<button class="btn danger" data-remove-file="${a.id}" data-kind="profileImage">Remove Photo</button>` : ""}</div><div class="grid"><div class="grid g3">${field(a,"artistName","Artist Name")}${field(a,"email","Email")}${field(a,"phone","Phone")}</div><div class="grid g2">${field(a,"address","Address")}${field(a,"owner","Owner / Staff Contact")}</div><div class="grid g2">${selectField(a,"role","Primary Role",["","Artist","Curator","Organization","Group"])}${selectField(a,"participationMode","Participation Mode",["solo-artist","curator-only","curator-artist","organization"])}</div></div></div>`,"photo-contact"); }
function statementCard(a){ return section("✍️ Artist Statement",`<div class="field"><label>Artist Statement / Curatorial Text</label><textarea data-field="artistStatement" data-id="${a.id}">${esc(a.artistStatement||"")}</textarea></div><div class="empty"><strong>Preview</strong><br>${esc(a.artistStatement||"No artist statement added yet.").replace(/\n/g,"<br>")}</div>`); }
function promoInventory(a,d){ const imgs=a.promoImages||[]; return section("🖼️ Promo Images + Inventory Upload",`<div class="promo-layout"><div class="promo-card"><strong>Promo Images</strong><div class="promo-grid">${imgs.length ? imgs.map((im,i)=>`<div class="promo-thumb"><img src="${im.dataUrl}" alt=""><button class="remove-thumb" data-remove-promo="${a.id}" data-index="${i}">×</button><small>${esc(im.name)}</small></div>`).join("") : `<div class="empty">No promo images uploaded yet.</div>`}</div><button class="upload-btn" data-upload-trigger="${a.id}" data-kind="promoImages">Add Promo Images</button><input class="hidden-file" type="file" multiple data-upload="${a.id}" data-kind="promoImages" accept="image/*"></div><div class="inventory-card">${tri(a,"inventoryReceived","Inventory Sheet Received")}${fileCard(a,"inventoryFile","📦 Inventory File Upload",".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*")}</div></div>`,"promo-inventory"); }
function exhibitionCard(a,d){
  const banner=a.exhibitionBanner?.dataUrl;
  return section("🎨 Exhibition Details",`
    <div class="exhibition-banner ${banner?"has-image":""}">
      ${banner?`<img src="${banner}" alt="${esc(a.exhibitionTitle||"Exhibition banner")}">`:`<div><strong>Exhibition Banner</strong><span>Add a wide image for this exhibition.</span></div>`}
      <div class="banner-actions"><button class="upload-btn" data-upload-trigger="${a.id}" data-kind="exhibitionBanner">${banner?"Replace Banner":"Upload Banner"}</button>${banner?`<button class="btn danger" data-remove-file="${a.id}" data-kind="exhibitionBanner">Remove</button>`:""}</div>
      <input class="hidden-file" type="file" data-upload="${a.id}" data-kind="exhibitionBanner" accept="image/*">
    </div>
    <div class="grid g2">${field(a,"exhibitionTitle","Exhibition Title")}${selectField(a,"gallery","Gallery",["","Main","Mezzanine"])}</div>
    <div class="grid g4">${field(a,"exhibitionStartDate","Exhibition Opens","date")}${field(a,"exhibitionEndDate","Exhibition Ends","date")}${field(a,"installDate","Install Date","date")}${field(a,"deinstallDate","De-install Date","date")}</div>
    <div class="auto-due-box"><div class="auto-due-title"><span>📅</span><span>Auto Due Dates</span></div><div class="auto-due-list"><div class="auto-due-item"><div class="auto-due-icon">📣</div><div><div class="auto-due-label">Promo</div><div class="auto-due-date">${fmtDate(d.promoDue)}</div></div></div><div class="auto-due-item"><div class="auto-due-icon">📦</div><div><div class="auto-due-label">Inventory</div><div class="auto-due-date">${fmtDate(d.inventoryDue)}</div></div></div></div></div>
  `);
}
function materialsCard(a){ return section("📦 Materials Needed",`<div class="grid g2">${tri(a,"bioReceived","Bio Received")}${tri(a,"headshotReceived","Headshot Received")}${tri(a,"statementReceived","Statement Received")}${tri(a,"resumeReceived","Resume Received")}${tri(a,"promoImagesReceived","Promo Images Received")}${tri(a,"w9Received","W-9 Received")}</div>`); }
function webCard(a){ return section("🌐 Web Identity",`<div class="grid g3">${field(a,"website","Website")}${field(a,"instagram","Instagram")}${field(a,"facebook","Facebook")}</div>`); }
function contractCard(a){ return section("📄 Contract + Upload",`<div class="grid g3">${selectField(a,"contractStatus","Contract Status",["still waiting","sent","received","N/A"])}${field(a,"contractSentDate","Sent Date","date")}${field(a,"contractReceivedDate","Received Date","date")}</div>${fileCard(a,"contractFile","📄 Contract File Upload",".pdf,.doc,.docx,image/*")}`,"contract-section"); }
function notesCard(a){ return section("📝 Notes / Follow Up",`<div class="field"><label>Internal HRAC Notes</label><textarea data-field="notes" data-id="${a.id}">${esc(a.notes||"")}</textarea></div>`,"notes"); }
function tri(a,key,label){ const v=a[key]||"no"; return `<div class="tri"><strong>${label}</strong><div class="tri-actions"><button class="tri-btn ${v==="yes"?"active":""}" data-tri="${key}" data-id="${a.id}" data-val="yes">Received</button><button class="tri-btn ${v==="na"?"na":""}" data-tri="${key}" data-id="${a.id}" data-val="na">N/A</button><button class="tri-btn ${v==="no"?"missing":""}" data-tri="${key}" data-id="${a.id}" data-val="no">Missing</button></div></div>`; }
function fileCard(a,key,title,accept){
  const f=a[key];
  return `<div class="file-card ${f?"has-file":""}">
    <strong class="file-card-title">${title}</strong>
    ${f ? `<div class="file-row">
      <div class="file-details">
        <div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div>
        <div class="muted">${humanSize(f.size)}</div>
      </div>
      <div class="file-actions">${fileLink(f)}<button class="btn danger" data-remove-file="${a.id}" data-kind="${key}">Remove</button></div>
    </div>` : `<button class="upload-btn" data-upload-trigger="${a.id}" data-kind="${key}">Upload File</button><input class="hidden-file" type="file" data-upload="${a.id}" data-kind="${key}" accept="${accept}">`}
  </div>`;
}

function renderCalendar(){
  const events = allEvents(false);
  const hidden = archivedArtists().length;
  (document.getElementById("view-calendar")||document.createElement("div")).innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title">▣ Calendar Dates</div><div class="report-toolbar" style="margin:0"><select id="calendarIncludePast"><option value="no">Hide finished exhibitions</option><option value="yes">Include history / analysis</option></select></div></div><div class="panel-body"><div id="calendarList">${calendarListMarkup(events, hidden, false)}</div></div></div>`;
}
function calendarListMarkup(events, hidden=0, includePast=false){
  return `${!includePast && hidden ? `<div class="empty" style="margin-bottom:12px">${hidden} finished exhibition(s) are hidden from the working calendar. Use history / analysis to include them.</div>` : ""}${events.length ? events.map(e=>`<div class="event-row"><div class="datebox"><span>${monthShort(e.date)}</span><b>${dayNum(e.date)}</b></div><div><strong>${esc(e.label)}</strong><div class="artist-show">${esc(e.sub)}</div></div><span class="pill">${fmtDate(e.date)}</span></div>`).join("") : `<div class="empty">No dates match this view.</div>`}`;
}
function refreshCalendarList(){ const includePast=document.getElementById("calendarIncludePast")?.value === "yes"; const box=document.getElementById("calendarList"); if(box) box.innerHTML=calendarListMarkup(allEvents(includePast), archivedArtists().length, includePast); }

function reportYearsOptions(){ return state.years.map(y=>`<option value="${esc(y)}" ${y===activeYear()?"selected":""}>${esc(y)}</option>`).join(""); }
function latestOperationalDate(a){
  const d = dueDates(a);
  const dates = [a.exhibitionEndDate, a.deinstallDate, a.installDate, d.titleDue, d.promoDue, d.inventoryDue, a.contractSentDate ? addDays(a.contractSentDate,14) : ""].filter(Boolean).sort();
  return dates.length ? dates[dates.length-1] : "";
}
function isPastExhibition(a){
  const hasFinishedDate = !!(a.deinstallDate || a.exhibitionEndDate);
  const last = latestOperationalDate(a);
  return hasFinishedDate && !!last && last < todayISO();
}
function activeOperationalArtists(){ return state.artists.filter(a=>!isPastExhibition(a)); }
function archivedArtists(){ return state.artists.filter(isPastExhibition); }
function reportTasks(a){ const d = dueDates(a); return [
  {label:"Artist name", done:!!a.artistName, due:null}, {label:"Email / contact", done:!!a.email, due:null}, {label:"Exhibition title", done:!!a.exhibitionTitle, due:d.titleDue},
  {label:"Install date", done:!!a.installDate, due:null}, {label:"De-install date", done:!!a.deinstallDate, due:null}, {label:"Bio", done:received(a.bioReceived), due:d.promoDue},
  {label:"Headshot", done:received(a.headshotReceived) || !!a.profileImage, due:d.promoDue}, {label:"Artist statement", done:received(a.statementReceived) || !!a.artistStatement, due:d.promoDue},
  {label:"Resume", done:received(a.resumeReceived), due:d.promoDue}, {label:"Promo images", done:received(a.promoImagesReceived) || (a.promoImages && a.promoImages.length>0), due:d.promoDue},
  {label:"Inventory", done:received(a.inventoryReceived) || !!a.inventoryFile, due:d.inventoryDue}, {label:"W-9", done:received(a.w9Received), due:null},
  {label:"Signed contract", done:a.contractStatus==="received", due:a.contractSentDate ? addDays(a.contractSentDate,14) : null}
]; }
function reportTaskMarkup(task){
  return `<div class="report-task ${task.done?"is-done":"is-missing"}">
    <span class="report-task-box" aria-hidden="true">${task.done?"✓":""}</span>
    <span class="report-task-copy"><strong>${esc(task.label)}</strong>${task.due?`<small>Due ${fmtDate(task.due)}</small>`:""}</span>
  </div>`;
}
function reportArtistLine(a){
  const d=derived(a), tasks=reportTasks(a), past=isPastExhibition(a);
  const incomplete=tasks.filter(t=>!t.done);
  return `<article class="print-artist ${past?"past-muted":""}">
    <div class="report-artist-heading">
      <div>
        <h3>${esc(a.artistName||"Untitled Artist")}</h3>
        <p>${esc(a.exhibitionTitle||"No exhibition title")}</p>
        <div class="report-artist-meta">${esc(a.gallery||"No gallery")} • ${esc(String(a.year||"No year"))}${past?" • Past exhibition":""}</div>
      </div>
      <div class="report-progress" aria-label="${d.percent}% complete">
        <strong>${d.percent}%</strong><span>complete</span>
      </div>
    </div>
    <div class="report-progress-bar"><span style="width:${Math.max(0,Math.min(100,d.percent))}%"></span></div>
    <div class="print-grid">${tasks.map(reportTaskMarkup).join("")}</div>
    <div class="report-summary ${incomplete.length?"has-missing":"is-complete"}">
      <strong>${incomplete.length?incomplete.length+" item(s) still incomplete":"All checklist items complete"}</strong>
      ${incomplete.length?`<span>Remaining: ${incomplete.map(t=>esc(t.label)).join(", ")}</span>`:`<span>This artist checklist is ready.</span>`}
    </div>
  </article>`;
}
function yearReportArtists(year, includePast=false){ return sortArtists(state.artists.filter(a=>String(a.year)===String(year)).filter(a=>includePast || !isPastExhibition(a))); }
function reportDocHeader(title, meta){
  const generated=new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  const editor=esc(state.currentEditorName || preferredEditorName() || "HRAC Staff");
  return `<header class="print-head">
    <div class="report-brand-block">
      <div class="print-brand">HRAC</div>
      <div class="print-sub">ARTIST TRACKER INTERNAL CHECKLIST</div>
    </div>
    <div class="report-title-block">
      <h1 class="print-title">${esc(title)}</h1>
      <div class="print-meta">${esc(meta)}<br>Generated ${generated}<br>Prepared by ${editor}</div>
    </div>
  </header>`;
}
function reportDocFooter(){ return `<footer class="print-footer"><span>Hammond Regional Arts Center</span><span>HRAC Exhibition Manager • Version 6.5</span></footer>`; }
function buildYearReport(year, includePast=false){
  const artists=yearReportArtists(year, includePast);
  return `<div class="print-doc">${reportDocHeader(year+" Exhibition Checklist", includePast?"Including history / analysis":"Working list only")}
    <main class="report-content">${artists.length?artists.map(reportArtistLine).join(""):`<div class="report-empty">No artists match this report.</div>`}</main>
    ${reportDocFooter()}
  </div>`;
}
function buildArtistReport(a){
  return `<div class="print-doc">${reportDocHeader((a.artistName||"Untitled Artist")+" Checklist", (a.exhibitionTitle||"No exhibition title")+" • "+(a.year||"No year"))}
    <main class="report-content">${reportArtistLine(a)}</main>
    ${reportDocFooter()}
  </div>`;
}

function renderExhibitionsHub(){
  const working=activeOperationalArtists();
  const years=[...new Set(state.artists.map(a=>String(a.year)))].sort();
  const rows=sortArtists(working);
  document.getElementById("view-exhibitions").innerHTML=`
    <div class="manager-page-head"><div><h1>Exhibitions</h1><p>Plan, track, pin, and visually identify every HRAC exhibition.</p></div><div class="manager-actions"><button class="manager-btn" data-action="new-artist">＋ New Exhibition Artist</button></div></div>
    <div class="manager-filterbar"><strong>Years:</strong>${years.map(y=>`<button class="manager-chip" data-tab="${y}">${y}</button>`).join("")}<span class="manager-chip">📌 ${rows.filter(a=>a.pinned).length} pinned</span><span class="manager-chip">★ ${rows.filter(a=>a.favorite).length} favorites</span></div>
    ${rows.length?`<div class="exhibition-wall">${rows.map(a=>`
      <article class="exhibition-tile" data-artist-id="${a.id}" data-search="${esc([a.artistName,a.exhibitionTitle,a.gallery,a.year].join(" ").toLowerCase())}">
        <div class="exhibition-tile-image">${a.exhibitionBanner?.dataUrl?`<img src="${a.exhibitionBanner.dataUrl}" alt="">`:a.promoImages?.[0]?.dataUrl?`<img src="${a.promoImages[0].dataUrl}" alt="">`:`<div class="tile-placeholder">HRAC<br>${esc(a.year||"")}</div>`}</div>
        <div class="exhibition-tile-body"><div class="tile-top"><span>${a.pinned?"📌 ":""}${a.favorite?"★ ":""}</span><span class="manager-status">${derived(a).percent}%</span></div><h3>${esc(a.exhibitionTitle||"Untitled Exhibition")}</h3><p>${esc(a.artistName||"Untitled Artist")}</p><small>${esc(a.gallery||"No gallery")} · ${fmtDate(a.exhibitionStartDate||a.installDate)}</small></div>
      </article>`).join("")}</div>`:`<div class="manager-empty">No active exhibitions are loaded yet.</div>`}`;
}
function renderScheduleHub(){
  const events=allEvents(false);
  const next=events.filter(e=>e.date>=todayISO()).slice(0,20);
  document.getElementById("view-schedule").innerHTML=`
    <div class="manager-page-head"><div><h1>Schedule</h1><p>One calendar for installs, de-installs, openings, and due dates.</p></div></div>
    <div class="manager-two">
      <div class="panel"><div class="panel-head"><div class="panel-title">Upcoming HRAC Dates</div></div><div class="panel-body">${next.length?next.map(e=>`<div class="manager-list-item"><div><strong>${esc(e.label)}</strong><div class="artist-show">${esc(e.sub)}</div></div><span class="manager-status">${fmtDate(e.date)}</span></div>`).join(""):`<div class="manager-empty">No upcoming dates.</div>`}</div></div>
      <div class="manager-card"><h3>Calendar Snapshot</h3><div class="big">${next.length}</div><small>upcoming tracked dates</small><hr style="border:0;border-top:1px solid #e4e8ed;margin:18px 0"><button class="manager-btn secondary" data-tab="calendar">Open Detailed Calendar</button></div>
    </div>`;
}
function renderContactsHub(){
  const contacts=sortArtists(state.artists).filter(a=>a.artistName||a.email||a.phone);
  document.getElementById("view-contacts").innerHTML=`
    <div class="manager-page-head"><div><h1>Contacts</h1><p>Artists, curators, collaborators, and exhibition contacts in one place.</p></div></div>
    <div class="manager-filterbar"><span class="manager-chip">${contacts.length} contacts</span><span class="manager-chip">★ ${contacts.filter(a=>a.favorite).length} favorites</span></div>
    ${contacts.length?`<div class="contact-grid">${contacts.map(a=>`
      <article class="contact-card" data-artist-id="${a.id}" data-search="${esc([a.artistName,a.role,a.email,a.phone,a.exhibitionTitle].join(" ").toLowerCase())}">
        <div class="contact-avatar">${a.profileImage?.dataUrl?`<img src="${a.profileImage.dataUrl}" alt="">`:`<span>${esc(initials(a))}</span>`}</div>
        <div class="contact-copy"><h3>${a.favorite?"★ ":""}${esc(a.artistName||"Unnamed Contact")}</h3><small>${esc(a.role||"Artist")} · ${esc(a.exhibitionTitle||"No exhibition")}</small><a href="mailto:${esc(a.email||"")}">${esc(a.email||"No email")}</a><span>${esc(a.phone||"No phone")}</span></div>
      </article>`).join("")}</div>`:`<div class="manager-empty">Contacts will appear automatically from artist profiles.</div>`}`;
}

function educationExhibitionOptions(selected=""){
  const rows=sortArtists(state.artists);
  return `<option value="">Not linked to an exhibition</option>`+rows.map(a=>`<option value="${a.id}" ${a.id===selected?"selected":""}>${esc(a.exhibitionTitle||"Untitled Exhibition")} — ${esc(a.artistName||"Untitled Artist")} (${esc(a.year||"")})</option>`).join("");
}
function linkedExhibitionName(id){
  const a=state.artists.find(x=>x.id===id);
  return a ? `${a.exhibitionTitle||"Untitled Exhibition"} — ${a.artistName||"Untitled Artist"}` : "Not linked";
}
function educationProgramStatusClass(status){
  return status==="Complete"||status==="Ready" ? "good" : status==="Needs Attention"||status==="Planning" ? "warn" : "";
}
function educationMetrics(){
  const programs=state.educationPrograms||[];
  const tours=state.schoolTours||[];
  const resources=state.educationResources||[];
  const participants=programs.reduce((sum,p)=>sum+(Number(p.attendance)||0),0)+tours.reduce((sum,t)=>sum+(Number(t.students)||0),0);
  const upcomingPrograms=programs.filter(p=>p.date && p.date>=todayISO()).length;
  const upcomingTours=tours.filter(t=>t.date && t.date>=todayISO()).length;
  const linkedResources=resources.filter(r=>r.exhibitionId).length;
  return {programs,tours,resources,participants,upcomingPrograms,upcomingTours,linkedResources};
}


function educationCollection(type){
  return type==="program"?state.educationPrograms:type==="tour"?state.schoolTours:state.educationResources;
}
function educationRecord(type,id){
  return educationCollection(type).find(x=>x.id===id);
}
function participantRows(record,type){
  const rows=record.participants||[];
  return rows.length ? rows.map((p,i)=>`
    <tr>
      <td><input value="${esc(p.studentName||"")}" data-participant-field="studentName" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Student name"></td>
      <td><input value="${esc(p.ageGrade||"")}" data-participant-field="ageGrade" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Age / grade"></td>
      <td><input value="${esc(p.guardianName||"")}" data-participant-field="guardianName" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Guardian name"></td>
      <td><input value="${esc(p.guardianPhone||"")}" data-participant-field="guardianPhone" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Phone"></td>
      <td><input value="${esc(p.guardianEmail||"")}" data-participant-field="guardianEmail" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Email"></td>
      <td class="attendance-toggle-cell"><button class="attendance-toggle ${p.present?"present":""}" data-action="toggle-participant-present" data-row="${i}" data-id="${record.id}" data-type="${type}">${p.present?"✓ Present":"Mark Present"}</button></td>
      <td><input type="time" value="${esc(p.signInTime||"")}" data-participant-field="signInTime" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}"></td>
      <td><input type="time" value="${esc(p.signOutTime||"")}" data-participant-field="signOutTime" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}"></td>
      <td><input value="${esc(p.pickupPerson||"")}" data-participant-field="pickupPerson" data-row="${i}" data-ed-id="${record.id}" data-ed-type="${type}" placeholder="Pickup person"></td>
      <td><button class="icon-action danger" data-action="remove-participant" data-row="${i}" data-id="${record.id}" data-type="${type}">×</button></td>
    </tr>`).join("") : `<tr><td colspan="10"><div class="manager-empty">No students or guardians have been added yet.</div></td></tr>`;
}
function attendanceCard(record,type){
  const rows=record.participants||[];
  const present=rows.filter(p=>p.present).length;
  return `<section class="ed-card ed-wide">
    <div class="ed-card-head"><div><h2>👥 Students, Guardians & Attendance</h2><p>${rows.length} enrolled · ${present} marked present</p></div>
    <div class="ed-card-actions"><button class="manager-btn small" data-action="add-participant" data-id="${record.id}" data-type="${type}">＋ Add Student</button><button class="manager-btn small secondary" data-action="print-signin-sheet" data-id="${record.id}" data-type="${type}">🖨 Print Sign-In Sheet</button></div></div>
    <div class="attendance-table-wrap"><table class="attendance-table"><thead><tr><th>Student</th><th>Age/Grade</th><th>Guardian</th><th>Phone</th><th>Email</th><th>Attendance</th><th>Sign In</th><th>Sign Out</th><th>Pickup Person</th><th></th></tr></thead><tbody>${participantRows(record,type)}</tbody></table></div>
  </section>`;
}
function imageGalleryCard(record,type){
  const images=record.profileImages||[];
  return `<section class="ed-card ed-wide">
    <div class="ed-card-head"><div><h2>🖼 Profile Images</h2><p>Add project examples, class photos, setup images, flyers, and documentation.</p></div>
    <div class="ed-card-actions"><button class="manager-btn small" data-action="upload-education-images" data-id="${record.id}" data-type="${type}">＋ Add Images</button><input class="hidden-file" type="file" multiple accept="image/*" data-education-image-upload="${record.id}" data-education-image-type="${type}"></div></div>
    ${images.length?`<div class="education-image-grid">${images.map((img,i)=>`<figure class="education-image-card"><img src="${img.dataUrl}" alt="${esc(img.name||"Education profile image")}"><figcaption><span title="${esc(img.name||"Image")}">${esc(img.name||`Image ${i+1}`)}</span><button class="icon-action danger" data-action="remove-education-image" data-id="${record.id}" data-type="${type}" data-index="${i}">×</button></figcaption></figure>`).join("")}</div>`:`<div class="manager-empty">No images uploaded yet.</div>`}
  </section>`;
}
function signInSheetHtml(record,type){
  const title=record.title||record.school||"Education Program";
  const rows=record.participants||[];
  const date=record.date||"";
  const info=type==="tour"?`${record.school||""} · ${record.grade||""}`:`${record.category||"Program"} · ${record.audience||""}`;
  const blankRows=Math.max(12-rows.length,0);
  const allRows=[
    ...rows.map((p,i)=>({n:i+1,student:p.studentName||"",guardian:p.guardianName||"",phone:p.guardianPhone||""})),
    ...Array.from({length:blankRows},(_,j)=>({n:rows.length+j+1,student:"",guardian:"",phone:""}))
  ];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)} Sign-In Sheet</title><style>
  @page{size:landscape;margin:.4in}body{font-family:Arial,sans-serif;color:#16304f;margin:0}h1{font-family:Georgia,serif;margin:0 0 4px}.meta{color:#607386;margin-bottom:18px}.top{display:flex;justify-content:space-between;align-items:flex-start}.brand{font-size:11px;font-weight:900;letter-spacing:.08em;color:#087f98}.summary{border:1px solid #cfdae4;border-radius:10px;padding:10px 14px;min-width:180px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:14px}th,td{border:1px solid #b9c7d3;padding:8px;height:28px;text-align:left}th{background:#edf6f8}.signature{min-width:140px}.footer{margin-top:14px;font-size:10px;color:#6c7c8c}
  </style></head><body><div class="top"><div><div class="brand">HAMMOND REGIONAL ARTS CENTER</div><h1>${esc(title)}</h1><div class="meta">${esc(info)} · ${fmtDate(date)} · ${esc(record.time||"Time not set")} · ${esc(record.location||"HRAC")}</div></div><div class="summary"><strong>Instructor / Lead:</strong><br>${esc(record.instructor||record.teacher||"")}<br><br><strong>Expected:</strong> ${rows.length}</div></div>
  <table><thead><tr><th>#</th><th>Student Name</th><th>Age/Grade</th><th>Guardian Name</th><th>Phone</th><th>Sign-In Time</th><th class="signature">Guardian Signature</th><th>Sign-Out Time</th><th>Pickup Person</th><th class="signature">Pickup Signature</th></tr></thead><tbody>${allRows.map((r,i)=>`<tr><td>${r.n}</td><td>${esc(r.student)}</td><td>${esc(rows[i]?.ageGrade||"")}</td><td>${esc(r.guardian)}</td><td>${esc(r.phone)}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody></table>
  <div class="footer">Printed from HRAC Art Center Manager Version ${APP_VERSION}. Keep completed sheets according to HRAC recordkeeping practices.</div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),200));<\/script></body></html>`;
}
function readEducationImages(files,record){
  [...files].forEach(file=>{
    if(!file.type.startsWith("image/")) return;
    const reader=new FileReader();
    reader.onload=()=>{ record.profileImages=record.profileImages||[]; record.profileImages.push({name:file.name,type:file.type,size:file.size,dataUrl:reader.result,uploaded:todayISO()}); markDirty(); renderEducationHub(); };
    reader.readAsDataURL(file);
  });
}

function educationCategoryMeta(){
  return [
    {id:"ARTisTRY Class",icon:"🎨",label:"ARTisTRY Classes",description:"Recurring children, teen, and adult art classes."},
    {id:"Camp",icon:"☀️",label:"Camps",description:"Multi-day youth and teen learning experiences."},
    {id:"Workshop",icon:"🛠️",label:"Workshops",description:"Focused one-time or short-series studio programs."},
    {id:"Public Program",icon:"🏛️",label:"Public Programs",description:"Gallery talks, family days, demonstrations, and community events."},
    {id:"Outreach Event",icon:"🤝",label:"Outreach Events",description:"Programs delivered with schools and community partners."}
  ];
}
function educationSelect(label,field,value,options,recordId,recordType){
  return `<label class="ed-field"><span>${label}</span><select data-ed-field="${field}" data-ed-id="${recordId}" data-ed-type="${recordType}">${options.map(o=>`<option value="${esc(o)}" ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select></label>`;
}
function educationInput(label,field,value,recordId,recordType,type="text"){
  return `<label class="ed-field"><span>${label}</span><input type="${type}" value="${esc(value??"")}" data-ed-field="${field}" data-ed-id="${recordId}" data-ed-type="${recordType}"></label>`;
}
function educationArea(label,field,value,recordId,recordType,placeholder=""){
  return `<label class="ed-field ed-area"><span>${label}</span><textarea placeholder="${esc(placeholder)}" data-ed-field="${field}" data-ed-id="${recordId}" data-ed-type="${recordType}">${esc(value??"")}</textarea></label>`;
}
function educationCheck(label,field,value,recordId,recordType){
  return `<label class="ed-check"><input type="checkbox" ${value?"checked":""} data-ed-field="${field}" data-ed-id="${recordId}" data-ed-type="${recordType}"><span>${label}</span></label>`;
}
function educationProfileRecord(){
  const type=state.selectedEducationType;
  const id=state.selectedEducationId;
  if(type==="program") return state.educationPrograms.find(x=>x.id===id);
  if(type==="tour") return state.schoolTours.find(x=>x.id===id);
  if(type==="resource") return state.educationResources.find(x=>x.id===id);
  return null;
}
function renderEducationProgramProfile(p){
  const id=p.id,type="program";
  return `
    <div class="ed-profile-head">
      <button class="btn" data-action="education-back">← Education & Outreach</button>
      <div class="ed-profile-title"><span class="ed-profile-kicker">${esc(p.category||"Program")}</span><h1>${esc(p.title||"Untitled Program")}</h1><p>${esc(p.audience||"Audience not set")} · ${fmtDate(p.date)} · ${esc(p.status||"Planning")}</p></div>
      <div class="ed-profile-actions"><button class="manager-btn secondary" data-action="duplicate-education-record">Duplicate</button><button class="manager-btn danger-soft" data-action="delete-selected-education">Delete</button></div>
    </div>
    <div class="ed-profile-grid">
      <section class="ed-card"><h2>📋 Program Overview</h2><div class="ed-form-grid">
        ${educationSelect("Category","category",p.category||"ARTisTRY Class",educationCategoryMeta().map(x=>x.id),id,type)}
        ${educationInput("Program Title","title",p.title,id,type)}
        ${educationSelect("Status","status",p.status||"Planning",["Planning","Registration Open","Ready","In Progress","Complete","Needs Attention"],id,type)}
        ${educationInput("Season / Session","season",p.season,id,type)}
        ${educationInput("Start Date","date",p.date,id,type,"date")}
        ${educationInput("End Date","endDate",p.endDate,id,type,"date")}
        ${educationInput("Time","time",p.time,id,type)}
        ${educationInput("Location","location",p.location,id,type)}
        ${educationInput("Audience","audience",p.audience,id,type)}
        ${educationInput("Age Range","ageRange",p.ageRange,id,type)}
        ${educationInput("Capacity","capacity",p.capacity,id,type,"number")}
        ${educationInput("Attendance","attendance",p.attendance,id,type,"number")}
        ${educationInput("Instructor / Lead","instructor",p.instructor,id,type)}
        ${educationInput("Assistant / Volunteer","assistant",p.assistant,id,type)}
        ${educationSelect("Registration Status","registrationStatus",p.registrationStatus||"",["","Not Open","Open","Waitlist","Closed"],id,type)}
        ${educationInput("Fee","fee",p.fee,id,type)}
      </div></section>

      <section class="ed-card"><h2>🖼 Exhibition Connection</h2><label class="ed-field ed-full"><span>Linked Exhibition</span><select data-ed-field="exhibitionId" data-ed-id="${id}" data-ed-type="${type}">${educationExhibitionOptions(p.exhibitionId)}</select></label><p class="ed-help">Linking this profile preserves the program inside that exhibition’s Educational Legacy.</p></section>

      <section class="ed-card ed-wide"><h2>🎯 Curriculum & Learning</h2><div class="ed-form-grid">
        ${educationArea("Big Idea","bigIdea",p.bigIdea,id,type,"What is the enduring idea behind this program?")}
        ${educationArea("Essential Question","essentialQuestion",p.essentialQuestion,id,type)}
        ${educationArea("Learning Objectives","learningObjectives",p.learningObjectives,id,type)}
        ${educationArea("Studio Objectives","studioObjectives",p.studioObjectives,id,type)}
        ${educationArea("Vocabulary","vocabulary",p.vocabulary,id,type)}
        ${educationArea("Assessment","assessment",p.assessment,id,type)}
        ${educationArea("Reflection","reflection",p.reflection,id,type)}
        ${educationArea("Extension Activities","extensionActivities",p.extensionActivities,id,type)}
      </div></section>

      <section class="ed-card"><h2>📚 Standards Alignment</h2>
        ${educationArea("Louisiana State Visual Arts Standards","louisianaStandards",p.louisianaStandards,id,type,"Enter codes and descriptions.")}
        ${educationArea("NAEA / National Core Arts Standards","naeaStandards",p.naeaStandards,id,type,"Enter artistic processes, anchor standards, or codes.")}
      </section>

      <section class="ed-card"><h2>🧰 Materials, Safety & Logistics</h2>
        ${educationArea("Materials & Supply List","materials",p.materials,id,type)}
        ${educationArea("Safety Notes","safetyNotes",p.safetyNotes,id,type)}
        ${educationInput("Budget","budget",p.budget,id,type)}
      </section>

      <section class="ed-card"><h2>📬 Communications</h2>
        ${educationArea("Communication Plan & Templates","communications",p.communications,id,type,"Registration, reminder, cancellation, thank-you, and follow-up notes.")}
      </section>

      <section class="ed-card"><h2>📊 Evaluation & Legacy</h2>
        ${educationArea("Evaluation / Feedback","evaluation",p.evaluation,id,type)}
        ${educationArea("Lessons Learned","lessonsLearned",p.lessonsLearned,id,type)}
        ${educationArea("Internal Notes","notes",p.notes,id,type)}
      </section>
      ${attendanceCard(p,type)}
      ${imageGalleryCard(p,type)}
    </div>`;
}
function renderSchoolTourProfile(t){
  const id=t.id,type="tour";
  return `
    <div class="ed-profile-head">
      <button class="btn" data-action="education-back">← Education & Outreach</button>
      <div class="ed-profile-title"><span class="ed-profile-kicker">School Tour / Field Trip</span><h1>${esc(t.school||"Unnamed School Visit")}</h1><p>${esc(t.grade||"Grade not set")} · ${fmtDate(t.date)} · ${Number(t.students)||0} students</p></div>
      <div class="ed-profile-actions"><button class="manager-btn secondary" data-action="duplicate-education-record">Duplicate</button><button class="manager-btn danger-soft" data-action="delete-selected-education">Delete</button></div>
    </div>
    <div class="ed-profile-grid">
      <section class="ed-card ed-wide"><h2>🚌 Visit Overview</h2><div class="ed-form-grid">
        ${educationInput("School / Group","school",t.school,id,type)}
        ${educationSelect("Status","status",t.status||"Planning",["Inquiry","Planning","Confirmed","Complete","Needs Attention"],id,type)}
        ${educationInput("Visit Date","date",t.date,id,type,"date")}
        ${educationInput("Arrival Time","time",t.time,id,type)}
        ${educationInput("Grade / Age Group","grade",t.grade,id,type)}
        ${educationInput("Number of Students","students",t.students,id,type,"number")}
        ${educationInput("Teacher / Contact","teacher",t.teacher,id,type)}
        ${educationInput("Email","email",t.email,id,type,"email")}
        ${educationInput("Phone","phone",t.phone,id,type)}
        <label class="ed-field ed-full"><span>Linked Exhibition</span><select data-ed-field="exhibitionId" data-ed-id="${id}" data-ed-type="${type}">${educationExhibitionOptions(t.exhibitionId)}</select></label>
      </div></section>

      <section class="ed-card"><h2>✅ Readiness Checklist</h2><div class="ed-check-grid">
        ${educationCheck("Teacher packet sent","packetSent",t.packetSent,id,type)}
        ${educationCheck("Bus / transportation confirmed","busConfirmed",t.busConfirmed,id,type)}
        ${educationCheck("Art activity ready","activityReady",t.activityReady,id,type)}
        ${educationCheck("Volunteer / staff assigned","volunteerAssigned",t.volunteerAssigned,id,type)}
      </div></section>

      <section class="ed-card"><h2>🎯 Tour Learning Plan</h2>
        ${educationArea("Tour Goals","tourGoals",t.tourGoals,id,type)}
        ${educationArea("Lesson / Activity Plan","lessonPlan",t.lessonPlan,id,type)}
        ${educationArea("Vocabulary","vocabulary",t.vocabulary,id,type)}
      </section>

      <section class="ed-card"><h2>📚 Standards Alignment</h2>
        ${educationArea("Louisiana State Standards","louisianaStandards",t.louisianaStandards,id,type)}
        ${educationArea("NAEA / National Core Arts Standards","naeaStandards",t.naeaStandards,id,type)}
      </section>

      <section class="ed-card"><h2>♿ Access & Support</h2>
        ${educationArea("Accessibility / Accommodation Notes","accessibility",t.accessibility,id,type)}
        ${educationArea("Follow-Up","followUp",t.followUp,id,type)}
      </section>

      <section class="ed-card ed-wide"><h2>📊 Evaluation & Notes</h2>
        ${educationArea("Evaluation / Teacher Feedback","evaluation",t.evaluation,id,type)}
        ${educationArea("Internal Notes","notes",t.notes,id,type)}
      </section>
      ${attendanceCard(t,type)}
      ${imageGalleryCard(t,type)}
    </div>`;
}
function renderResourceProfile(r){
  const id=r.id,type="resource";
  return `
    <div class="ed-profile-head">
      <button class="btn" data-action="education-back">← Education & Outreach</button>
      <div class="ed-profile-title"><span class="ed-profile-kicker">${esc(r.type||"Education Resource")}</span><h1>${esc(r.title||"Untitled Resource")}</h1><p>${esc(r.audience||"Audience not set")} · Updated ${fmtDate(r.updated)}</p></div>
      <div class="ed-profile-actions"><button class="manager-btn secondary" data-action="duplicate-education-record">Duplicate</button><button class="manager-btn danger-soft" data-action="delete-selected-education">Delete</button></div>
    </div>
    <div class="ed-profile-grid">
      <section class="ed-card ed-wide"><h2>📘 Resource Overview</h2><div class="ed-form-grid">
        ${educationInput("Resource Title","title",r.title,id,type)}
        ${educationSelect("Resource Type","type",r.type||"Teacher Guide",["Teacher Guide","Lesson Plan","Gallery Talk","Scavenger Hunt","Family Activity","Standards Guide","Presentation","Activity Sheet"],id,type)}
        ${educationInput("Audience","audience",r.audience,id,type)}
        ${educationInput("Grade Range","gradeRange",r.gradeRange,id,type)}
        <label class="ed-field ed-full"><span>Linked Exhibition</span><select data-ed-field="exhibitionId" data-ed-id="${id}" data-ed-type="${type}">${educationExhibitionOptions(r.exhibitionId)}</select></label>
        ${educationInput("File Name / Location","fileName",r.fileName,id,type)}
      </div></section>

      <section class="ed-card ed-wide"><h2>🎯 Learning Content</h2><div class="ed-form-grid">
        ${educationArea("Description","description",r.description,id,type)}
        ${educationArea("Learning Objectives","learningObjectives",r.learningObjectives,id,type)}
        ${educationArea("Vocabulary","vocabulary",r.vocabulary,id,type)}
        ${educationArea("Instructions / Facilitation Notes","instructions",r.instructions,id,type)}
        ${educationArea("Materials","materials",r.materials,id,type)}
      </div></section>

      <section class="ed-card"><h2>📚 Standards Alignment</h2>
        ${educationArea("Louisiana State Standards","louisianaStandards",r.louisianaStandards,id,type)}
        ${educationArea("NAEA / National Core Arts Standards","naeaStandards",r.naeaStandards,id,type)}
      </section>

      <section class="ed-card"><h2>🕰 Revision & Legacy</h2>
        ${educationArea("Revision History","revisionHistory",r.revisionHistory,id,type)}
        ${educationArea("Internal Notes","notes",r.notes,id,type)}
      </section>
      ${imageGalleryCard(r,type)}
    </div>`;
}
function renderEducationLibrary(){
  const categories=educationCategoryMeta();
  const selected=state.educationCategory||"ARTisTRY Class";
  const programs=state.educationPrograms.filter(p=>(p.category||"ARTisTRY Class")===selected).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const tours=[...state.schoolTours].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const resources=[...state.educationResources].sort((a,b)=>(b.updated||"").localeCompare(a.updated||""));
  const metrics=educationMetrics();
  return `
    <div class="education-hero version10">
      <div><span class="cmd-kicker">Version 10.0 · Education & Outreach Suite</span><h1>Education & Outreach</h1><p>Profile-based planning for programs, school visits, standards-aligned resources, communications, and long-term educational legacy.</p></div>
      <div class="education-hero-actions"><button class="manager-btn" data-action="new-education-program-profile">＋ New Program Profile</button><button class="manager-btn secondary" data-action="new-school-tour-profile">＋ School Tour</button><button class="manager-btn secondary" data-action="new-resource-profile">＋ Resource</button><button class="manager-btn secondary" data-action="print-education-summary">🖨 Impact Summary</button></div>
    </div>

    <div class="manager-grid education-metrics">
      <div class="manager-card"><h3>Program Profiles</h3><div class="big">${state.educationPrograms.length}</div><small>across five categories</small></div>
      <div class="manager-card"><h3>School Visits</h3><div class="big">${state.schoolTours.length}</div><small>tours and field trips</small></div>
      <div class="manager-card"><h3>Resource Profiles</h3><div class="big">${state.educationResources.length}</div><small>teacher and family resources</small></div>
      <div class="manager-card"><h3>People Reached</h3><div class="big">${metrics.participants}</div><small>recorded attendance</small></div>
    </div>

    <section class="ed-suite-section">
      <div class="ed-suite-heading"><div><span class="cmd-kicker">Programs</span><h2>Select a program category</h2></div></div>
      <div class="ed-category-grid">${categories.map(c=>`<button class="ed-category-card ${selected===c.id?"active":""}" data-action="select-education-category" data-category="${c.id}"><span class="ed-category-icon">${c.icon}</span><strong>${c.label}</strong><small>${c.description}</small><b>${state.educationPrograms.filter(p=>(p.category||"ARTisTRY Class")===c.id).length}</b></button>`).join("")}</div>
    </section>

    <section class="panel education-section">
      <div class="panel-head"><div><div class="panel-title">${categories.find(c=>c.id===selected)?.icon||"🎨"} ${categories.find(c=>c.id===selected)?.label||selected}</div><div class="panel-sub">Open a profile to plan curriculum, standards, supplies, communications, and evaluation.</div></div><button class="manager-btn small" data-action="new-education-program-profile">＋ New Profile</button></div>
      <div class="panel-body">${programs.length?`<div class="ed-profile-library">${programs.map(p=>`<button class="ed-library-card" data-education-open="${p.id}" data-education-type="program"><span class="ed-library-badge">${esc(p.status||"Planning")}</span><h3>${esc(p.title||"Untitled Program")}</h3><p>${esc(p.audience||"Audience not set")}</p><small>${fmtDate(p.date)} · ${esc(p.instructor||"Instructor not set")}</small><span class="ed-library-link">${p.exhibitionId?"Linked to exhibition":"No exhibition link"}</span></button>`).join("")}</div>`:`<div class="manager-empty">No ${esc(categories.find(c=>c.id===selected)?.label||selected)} profiles yet.</div>`}</div>
    </section>

    <div class="ed-suite-split">
      <section class="panel education-section">
        <div class="panel-head"><div><div class="panel-title">🚌 School Tours & Field Trips</div><div class="panel-sub">Open a full visit profile.</div></div><button class="manager-btn small" data-action="new-school-tour-profile">＋ New</button></div>
        <div class="panel-body">${tours.length?`<div class="ed-compact-library">${tours.map(t=>`<button class="ed-compact-card" data-education-open="${t.id}" data-education-type="tour"><strong>${esc(t.school||"Unnamed School")}</strong><span>${esc(t.grade||"Grade not set")} · ${Number(t.students)||0} students</span><small>${fmtDate(t.date)} · ${esc(t.status||"Planning")}</small></button>`).join("")}</div>`:`<div class="manager-empty">No school visit profiles yet.</div>`}</div>
      </section>

      <section class="panel education-section">
        <div class="panel-head"><div><div class="panel-title">📚 Teacher & Family Resource Library</div><div class="panel-sub">Open a standards-aligned resource profile.</div></div><button class="manager-btn small" data-action="new-resource-profile">＋ New</button></div>
        <div class="panel-body">${resources.length?`<div class="ed-compact-library">${resources.map(r=>`<button class="ed-compact-card" data-education-open="${r.id}" data-education-type="resource"><strong>${esc(r.title||"Untitled Resource")}</strong><span>${esc(r.type||"Resource")} · ${esc(r.audience||"All Ages")}</span><small>${r.exhibitionId?"Linked to exhibition":"Independent resource"}</small></button>`).join("")}</div>`:`<div class="manager-empty">No resource profiles yet.</div>`}</div>
      </section>
    </div>`;
}
function renderEducationHub(){
  const root=document.getElementById("view-education");
  const record=educationProfileRecord();
  if(record){
    root.innerHTML=`<div class="education-profile-shell">${state.selectedEducationType==="program"?renderEducationProgramProfile(record):state.selectedEducationType==="tour"?renderSchoolTourProfile(record):renderResourceProfile(record)}</div>`;
  }else{
    root.innerHTML=renderEducationLibrary();
  }
}

function promptEducationProgram(existing=null){
  const p=existing||{};
  const title=prompt("Program title:",p.title||""); if(!title) return null;
  const type=prompt("Type (Class / Camp / Workshop / Public Program / Outreach Event):",p.type||"Workshop")||"Program";
  const date=prompt("Date (YYYY-MM-DD):",p.date||"")||"";
  const audience=prompt("Audience or age range:",p.audience||"All Ages")||"All Ages";
  const location=prompt("Location:",p.location||"HRAC")||"HRAC";
  const instructor=prompt("Instructor / lead:",p.instructor||"")||"";
  const capacity=Number(prompt("Capacity:",p.capacity??"0"))||0;
  const attendance=Number(prompt("Recorded attendance:",p.attendance??"0"))||0;
  const status=prompt("Status (Planning / Registration Open / Ready / Complete / Needs Attention):",p.status||"Planning")||"Planning";
  const exhibitionId=promptChooseExhibition(p.exhibitionId||"");
  const notes=prompt("Notes:",p.notes||"")||"";
  return {...p,id:p.id||uid(),title,type,date,audience,location,instructor,capacity,attendance,status,exhibitionId,notes,updated:todayISO()};
}
function promptSchoolTour(existing=null){
  const t=existing||{};
  const school=prompt("School or group name:",t.school||""); if(!school) return null;
  const date=prompt("Visit date (YYYY-MM-DD):",t.date||"")||"";
  const time=prompt("Arrival time:",t.time||"")||"";
  const grade=prompt("Grade level / age group:",t.grade||"")||"";
  const students=Number(prompt("Number of students:",t.students??"0"))||0;
  const teacher=prompt("Teacher / group contact:",t.teacher||"")||"";
  const email=prompt("Contact email:",t.email||"")||"";
  const phone=prompt("Contact phone:",t.phone||"")||"";
  const exhibitionId=promptChooseExhibition(t.exhibitionId||"");
  const status=prompt("Status (Inquiry / Planning / Confirmed / Complete / Needs Attention):",t.status||"Planning")||"Planning";
  const packetSent=confirm("Has the teacher packet been sent?");
  const busConfirmed=confirm("Has transportation / bus arrival been confirmed?");
  const activityReady=confirm("Is the art activity ready?");
  const volunteerAssigned=confirm("Has a volunteer or staff assistant been assigned?");
  const notes=prompt("Tour notes:",t.notes||"")||"";
  return {...t,id:t.id||uid(),school,date,time,grade,students,teacher,email,phone,exhibitionId,status,packetSent,busConfirmed,activityReady,volunteerAssigned,notes,updated:todayISO()};
}
function promptEducationResource(existing=null){
  const r=existing||{};
  const title=prompt("Resource title:",r.title||""); if(!title) return null;
  const type=prompt("Type (Teacher Guide / Lesson Plan / Gallery Talk / Scavenger Hunt / Family Activity / Standards Guide / Presentation):",r.type||"Teacher Guide")||"Resource";
  const audience=prompt("Audience (Elementary / Middle / High / Adult / Family / All Ages):",r.audience||"All Ages")||"All Ages";
  const exhibitionId=promptChooseExhibition(r.exhibitionId||"");
  const standards=prompt("Standards or curriculum alignment:",r.standards||"")||"";
  const fileName=prompt("File name or document location (optional):",r.fileName||"")||"";
  const notes=prompt("Description / notes:",r.notes||"")||"";
  return {...r,id:r.id||uid(),title,type,audience,exhibitionId,standards,fileName,notes,updated:todayISO()};
}
function promptChooseExhibition(current=""){
  const rows=sortArtists(state.artists);
  if(!rows.length) return "";
  const lines=rows.map((a,i)=>`${i+1} — ${a.exhibitionTitle||"Untitled Exhibition"} / ${a.artistName||"Untitled Artist"} (${a.year||""})`).join("\n");
  const currentIndex=rows.findIndex(a=>a.id===current);
  const choice=prompt(`Link to an exhibition? Enter a number, or leave blank for none:\n\n${lines}`,currentIndex>=0?String(currentIndex+1):"");
  if(!choice) return "";
  return rows[Number(choice)-1]?.id||"";
}
function educationSummaryHtml(){
  const m=educationMetrics();
  const programs=[...m.programs].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
  const tours=[...m.tours].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HRAC Education & Outreach Impact Summary</title><style>
  body{font-family:Arial,sans-serif;color:#17304f;margin:.55in}h1,h2{font-family:Georgia,serif}h1{margin-bottom:4px}.sub{color:#627489;margin-bottom:24px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #d9e2ea;border-radius:10px;padding:14px}.metric b{font-size:26px;display:block}.section{margin-top:28px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:8px;border-bottom:1px solid #dde4eb}th{background:#edf6f8}.footer{margin-top:30px;border-top:2px solid #0c8fb3;padding-top:10px;font-size:11px}
  @media print{@page{size:letter;margin:.5in}}</style></head><body>
  <h1>Education & Outreach Impact Summary</h1><div class="sub">Hammond Regional Arts Center · Prepared ${new Date().toLocaleDateString()}</div>
  <div class="metrics"><div class="metric"><b>${m.programs.length}</b>Programs</div><div class="metric"><b>${m.tours.length}</b>School Tours</div><div class="metric"><b>${m.resources.length}</b>Resources</div><div class="metric"><b>${m.participants}</b>People Reached</div></div>
  <div class="section"><h2>Programs</h2><table><thead><tr><th>Date</th><th>Program</th><th>Type</th><th>Audience</th><th>Attendance</th></tr></thead><tbody>${programs.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${esc(p.title)}</td><td>${esc(p.type)}</td><td>${esc(p.audience)}</td><td>${Number(p.attendance)||0}</td></tr>`).join("")||`<tr><td colspan="5">No programs recorded.</td></tr>`}</tbody></table></div>
  <div class="section"><h2>School Tours</h2><table><thead><tr><th>Date</th><th>School</th><th>Grade</th><th>Students</th><th>Status</th></tr></thead><tbody>${tours.map(t=>`<tr><td>${fmtDate(t.date)}</td><td>${esc(t.school)}</td><td>${esc(t.grade)}</td><td>${Number(t.students)||0}</td><td>${esc(t.status)}</td></tr>`).join("")||`<tr><td colspan="5">No school tours recorded.</td></tr>`}</tbody></table></div>
  <div class="footer">HRAC Art Center Manager · Education & Outreach Release · Version ${APP_VERSION}</div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),200));<\/script></body></html>`;
}

function renderSalesHub(){
  const rows=state.salesRecords||[];
  const total=rows.reduce((s,r)=>s+(Number(r.amount)||0),0);
  document.getElementById("view-sales").innerHTML=`
    <div class="manager-page-head"><div><h1>Sales Pipeline</h1><p>Track artwork inquiries, sales, commissions, and artist payouts.</p></div><div class="manager-actions"><button class="manager-btn" data-action="add-sale-record">＋ Add Sale Record</button></div></div>
    <div class="manager-grid"><div class="manager-card"><h3>Recorded Sales</h3><div class="big">${rows.length}</div></div><div class="manager-card"><h3>Gross Sales</h3><div class="big">$${total.toLocaleString()}</div></div><div class="manager-card"><h3>Open Follow-ups</h3><div class="big">${rows.filter(r=>r.status!=="Paid").length}</div></div><div class="manager-card"><h3>Data Source</h3><div class="big">JSON</div><small>included in backups</small></div></div>
    <br>${rows.length?`<table class="manager-table"><thead><tr><th>Date</th><th>Artist</th><th>Artwork</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date||"—")}</td><td>${esc(r.artist||"—")}</td><td>${esc(r.artwork||"—")}</td><td>${esc(r.buyer||"—")}</td><td>$${Number(r.amount||0).toLocaleString()}</td><td><span class="manager-status">${esc(r.status||"Open")}</span></td></tr>`).join("")}</tbody></table>`:`<div class="manager-empty">No sales records yet. Use “Add Sale Record” to test the workflow.</div>`}`;
}
function renderCollectionHub(){
  const rows=state.collectionCare||[];
  const artists=activeOperationalArtists();
  const inventoryReady=artists.filter(a=>received(a.inventoryReceived)||a.inventoryFile).length;
  const inventoryMissing=artists.length-inventoryReady;
  const attention=rows.filter(r=>r.condition==="Needs Attention").length;
  document.getElementById("view-collection").innerHTML=`
    <div class="manager-page-head"><div><h1>Collection Care & Inventory</h1><p>Track exhibition inventory, HRAC’s permanent collection, and objects left in the center’s care.</p></div><div class="manager-actions"><button class="manager-btn" data-action="add-collection-item">＋ Add Collection Item</button></div></div>
    <div class="manager-grid">
      <div class="manager-card"><h3>Exhibition Inventories Ready</h3><div class="big">${inventoryReady}</div><small>of ${artists.length} active exhibitions</small></div>
      <div class="manager-card"><h3>Inventories Missing</h3><div class="big">${inventoryMissing}</div><small>artist follow-up needed</small></div>
      <div class="manager-card"><h3>Permanent Collection Items</h3><div class="big">${rows.length}</div><small>objects currently recorded</small></div>
      <div class="manager-card"><h3>Needs Attention</h3><div class="big">${attention}</div><small>condition or location follow-up</small></div>
    </div><br>
    <div class="manager-two">
      <section class="panel"><div class="panel-head"><div class="panel-title">📦 Exhibition Inventory Status</div></div><div class="panel-body">${artists.length?artists.map(a=>`<div class="manager-list-item" data-artist-id="${a.id}" style="cursor:pointer"><div><strong>${esc(a.artistName||"Untitled Artist")}</strong><div class="artist-show">${esc(a.exhibitionTitle||"Untitled Exhibition")}</div></div><span class="manager-status ${(received(a.inventoryReceived)||a.inventoryFile)?"good":"warn"}">${(received(a.inventoryReceived)||a.inventoryFile)?"Ready":"Missing"}</span></div>`).join(""):`<div class="manager-empty">No active exhibitions.</div>`}</div></section>
      <section class="panel"><div class="panel-head"><div class="panel-title">⚒ Permanent Collection</div></div><div class="panel-body">${rows.length?rows.map(r=>`<div class="manager-list-item"><div><strong>${esc(r.title||"Untitled Object")}</strong><div class="artist-show">${esc(r.source||"Unknown source")} · ${esc(r.location||"No location")}</div></div><span class="manager-status ${r.condition==="Needs Attention"?"warn":"good"}">${esc(r.condition||"Good")}</span></div>`).join(""):`<div class="manager-empty">No permanent collection items recorded yet.</div>`}</div></section>
    </div>`;
}
function renderCallsHub(){
  const rows=state.callsForEntry||[];
  document.getElementById("view-calls").innerHTML=`
    <div class="manager-page-head"><div><h1>Calls for Entry</h1><p>Keep opportunities, deadlines, eligibility, and follow-up notes from slipping through the cracks.</p></div><div class="manager-actions"><button class="manager-btn" data-action="add-call-entry">＋ Add Opportunity</button></div></div>
    ${rows.length?`<table class="manager-table"><thead><tr><th>Opportunity</th><th>Organization</th><th>Deadline</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows.sort((a,b)=>(a.deadline||"").localeCompare(b.deadline||"")).map(r=>`<tr><td><strong>${esc(r.title||"Untitled Call")}</strong></td><td>${esc(r.organization||"—")}</td><td>${fmtDate(r.deadline)}</td><td><span class="manager-status ${r.status==="Submitted"?"good":""}">${esc(r.status||"Researching")}</span></td><td>${esc(r.notes||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="manager-empty">No calls are tracked yet. Add the next grant, exhibition, competition, or artist opportunity you hear about.</div>`}`;
}
function renderInsightsHub(){
  const artists=activeOperationalArtists();
  const complete=artists.filter(a=>derived(a).percent===100).length;
  const avg=artists.length?Math.round(artists.reduce((s,a)=>s+derived(a).percent,0)/artists.length):0;
  const sales=(state.salesRecords||[]).reduce((s,r)=>s+(Number(r.amount)||0),0);
  const calls=state.callsForEntry||[];
  document.getElementById("view-insights").innerHTML=`
    <div class="manager-page-head"><div><h1>Insights</h1><p>A quick data story for Melissa, staff meetings, and board conversations.</p></div></div>
    <div class="manager-grid">
      <div class="manager-card"><h3>Active Exhibitions</h3><div class="big">${artists.length}</div><small>currently in the working view</small></div>
      <div class="manager-card"><h3>Profiles Complete</h3><div class="big">${complete}</div><small>${artists.length?Math.round(complete/artists.length*100):0}% of active profiles</small></div>
      <div class="manager-card"><h3>Average Readiness</h3><div class="big">${avg}%</div><small>across active exhibitions</small></div>
      <div class="manager-card"><h3>Recorded Artwork Sales</h3><div class="big">$${sales.toLocaleString()}</div><small>${(state.salesRecords||[]).length} records</small></div>
    </div><br>
    <div class="manager-two"><div class="manager-card"><h3>Opportunity Tracking</h3><div class="big">${calls.length}</div><small>${calls.filter(c=>c.status==="Submitted").length} submitted</small></div><div class="manager-card"><h3>Collection Care</h3><div class="big">${(state.collectionCare||[]).length}</div><small>${(state.collectionCare||[]).filter(i=>i.condition==="Needs Attention").length} need attention</small></div></div>`;
}
function renderProfileHub(){
  const name=editorDisplayName();
  const initials=makeInitials(name);
  document.getElementById("view-profile").innerHTML=`
    <div class="manager-page-head"><div><h1>My Profile</h1><p>Your local staff identity and JSON collaboration information.</p></div></div>
    <div class="manager-two"><div class="manager-card profile-editor-card"><div class="profile-editor-avatar">${esc(initials)}</div><div><h3>${esc(name)}</h3><small>Current editor on this browser</small><p><strong>Session:</strong> ${esc(state.currentSessionId||"Not started")}</p></div></div>
    <div class="manager-card"><h3>Shared JSON Status</h3><p><strong>Loaded file:</strong> ${esc(state.loadedFileName||"None")}</p><p><strong>Last saved by:</strong> ${esc(state.lastSavedBy||"Not recorded")}</p><p><strong>Last saved:</strong> ${esc(state.lastSavedAt||"Not recorded")}</p><button class="manager-btn secondary" data-action="show-collab-notice">Review Collaboration Settings</button></div></div>`;
}
function renderReports(){ const y=activeYear(); const working=sortArtists(activeOperationalArtists()); const sorted=working.length ? working : sortArtists(state.artists); const hidden=archivedArtists().length; document.getElementById("view-reports").innerHTML = `<div class="hero"><h1>Printable Reports</h1><p>Clean HRAC checklists for staff meetings, folders, and follow-up days.</p></div><div class="report-card"><div class="panel-title">☑ Year Checklist Report</div><div class="empty" style="margin-top:10px">Working reports hide finished exhibitions by default. ${hidden} past exhibition(s) are currently tucked away unless you include history / analysis.</div><div class="report-options"><div class="field"><label>Year</label><select id="reportYear">${reportYearsOptions()}</select></div><div class="field"><label>Report Scope</label><select id="reportIncludePast"><option value="no">Working list only</option><option value="yes">Include history / analysis</option></select></div></div><div class="report-toolbar" style="margin-top:16px"><button class="btn primary" data-action="preview-year-report">Preview Year Report</button><button class="btn" data-action="print-year-report">Print Year Report</button></div><div id="yearReportPreview" class="checklist-preview">${buildYearReport(y,false)}</div></div><div class="report-card"><div class="panel-title">♙ Individual Artist Checklist</div><p class="artist-show">You can also print this directly from an artist profile using the Print Checklist button.</p><div class="report-options"><div class="field"><label>Artist Scope</label><select id="reportArtistScope"><option value="working">Working artists only</option><option value="all">Include history / analysis</option></select></div><div class="field"><label>Artist</label><select id="reportArtist">${sorted.map(a=>`<option value="${esc(a.id)}">${esc((a.year||"")+" — "+(a.artistName||"Untitled Artist")+(isPastExhibition(a)?" (past)":""))}</option>`).join("")}</select></div></div><div class="report-toolbar" style="margin-top:16px"><button class="btn primary" data-action="preview-artist-report">Preview Artist Report</button><button class="btn" data-action="print-selected-artist-report">Print Artist Report</button></div><div id="artistReportPreview" class="checklist-preview">${sorted[0]?buildArtistReport(sorted[0]):`<div class="empty">No artists loaded yet.</div>`}</div></div>`; }
function refreshYearReportPreview(){ const year=document.getElementById("reportYear")?.value || activeYear(); const includePast=document.getElementById("reportIncludePast")?.value === "yes"; const box=document.getElementById("yearReportPreview"); if(box) box.innerHTML=buildYearReport(year, includePast); }
function refreshArtistReportOptions(){
  const scope=document.getElementById("reportArtistScope")?.value || "working";
  const list=sortArtists(scope === "all" ? state.artists : activeOperationalArtists());
  const select=document.getElementById("reportArtist");
  if(select) select.innerHTML=list.map(a=>`<option value="${esc(a.id)}">${esc((a.year||"")+" — "+(a.artistName||"Untitled Artist")+(isPastExhibition(a)?" (past)":""))}</option>`).join("");
  refreshArtistReportPreview();
}
function refreshArtistReportPreview(){ const id=document.getElementById("reportArtist")?.value; const scope=document.getElementById("reportArtistScope")?.value || "working"; const fallback=sortArtists(scope === "all" ? state.artists : activeOperationalArtists())[0]; const a=state.artists.find(x=>x.id===id) || fallback; const box=document.getElementById("artistReportPreview"); if(box) box.innerHTML=a ? buildArtistReport(a) : `<div class="empty">No artist selected.</div>`; }
function printHtml(html){
  const w=window.open("","_blank");
  if(!w){ alert("Pop-up blocked. Please allow pop-ups to print reports."); return; }
  const embeddedReportCss=`:root{--report-navy:#071b34;--report-blue:#176fd3;--report-ink:#081833;--report-muted:#68778f;--report-line:#dfe7f3;--report-soft:#f6f9fd;--report-green:#137a52;--report-red:#b42338}
.print-doc{font-family:Inter,"Segoe UI",Arial,sans-serif;color:var(--report-ink);background:#fff;max-width:8.5in;margin:0 auto;padding:28px;line-height:1.4}
.print-head{display:grid;grid-template-columns:1fr minmax(260px,1.15fr);gap:24px;align-items:end;border-bottom:4px solid var(--report-navy);padding-bottom:18px;margin-bottom:22px}
.report-brand-block{align-self:start}.print-brand{font-family:Georgia,"Times New Roman",serif;font-size:40px;line-height:.95;letter-spacing:.12em;color:var(--report-navy);font-weight:700}.print-sub{margin-top:8px;font-size:11px;font-weight:950;color:var(--report-blue);letter-spacing:.12em}.report-title-block{text-align:right}.print-title{margin:0;color:var(--report-navy);font-size:25px;line-height:1.15;font-weight:950}.print-meta{margin-top:8px;color:var(--report-muted);font-size:11px;font-weight:700;line-height:1.55}.report-content{display:grid;gap:16px}
.print-artist{border:1px solid var(--report-line);border-radius:16px;padding:18px;background:#fff;break-inside:avoid;page-break-inside:avoid}.report-artist-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.print-artist h3{margin:0;color:var(--report-navy);font-size:21px;line-height:1.15}.print-artist p{margin:5px 0 0;font-size:14px;font-weight:850}.report-artist-meta{margin-top:4px;font-size:11px;color:var(--report-muted);font-weight:750}.report-progress{min-width:82px;border:1px solid var(--report-line);border-radius:14px;background:var(--report-soft);padding:9px 12px;text-align:center}.report-progress strong{display:block;font-size:21px;color:var(--report-navy);line-height:1}.report-progress span{display:block;margin-top:4px;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--report-muted);font-weight:900}.report-progress-bar{height:7px;border-radius:999px;background:#e8eef6;overflow:hidden;margin:14px 0 16px}.report-progress-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--report-blue),#23a36b)}
.print-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px}.report-task{display:grid;grid-template-columns:20px 1fr;gap:8px;align-items:start;min-height:34px}.report-task-box{width:18px;height:18px;border:2px solid var(--report-navy);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:950;line-height:1}.report-task.is-done .report-task-box{border-color:var(--report-green);background:#e7f7ef;color:var(--report-green)}.report-task-copy strong{display:block;font-size:12px;line-height:1.2}.report-task-copy small{display:block;margin-top:3px;color:var(--report-muted);font-size:10px;font-weight:750}.report-summary{margin-top:16px;border-top:1px solid var(--report-line);padding-top:12px;display:grid;gap:3px}.report-summary strong{font-size:12px}.report-summary span{font-size:10px;color:var(--report-muted)}.report-summary.has-missing strong{color:var(--report-red)}.report-summary.is-complete strong{color:var(--report-green)}.print-footer{margin-top:18px;padding-top:10px;border-top:1px solid var(--report-line);display:flex;justify-content:space-between;gap:16px;color:var(--report-muted);font-size:9px;font-weight:750}.report-empty{border:1px dashed var(--report-line);border-radius:12px;padding:18px;color:var(--report-muted);font-weight:800}.past-muted{opacity:.68}
.checklist-preview .print-doc{padding:8px;max-width:none}.checklist-preview .print-head{grid-template-columns:1fr 1fr}.checklist-preview .print-footer{position:static}
@media(max-width:720px){.print-head{grid-template-columns:1fr}.report-title-block{text-align:left}.print-grid{grid-template-columns:1fr}.report-artist-heading{flex-direction:column}.report-progress{align-self:flex-start}.print-footer{flex-direction:column}}
@media print{html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-size:11pt}.print-doc{max-width:none;padding:0!important}.print-head{break-after:avoid;page-break-after:avoid}.print-artist{box-shadow:none}.report-progress-bar span,.report-task.is-done .report-task-box{print-color-adjust:exact;-webkit-print-color-adjust:exact}.print-footer{position:fixed;left:0;right:0;bottom:0;background:#fff}.report-content{padding-bottom:.35in}@page{size:letter portrait;margin:.45in .5in .55in}}
`;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HRAC Checklist</title><style>${embeddedReportCss}</style></head><body>${html}<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),250);});<\/script></body></html>`);
  w.document.close();
  w.focus();
}


function printableDueListMarkup(list){
  const tasks = commandDeadlineTasks(list, true);
  const overdue = tasks.filter(t=>t.date < todayISO());
  const next7 = tasks.filter(t=>t.date >= todayISO() && t.date <= addDays(todayISO(),7));
  const later = tasks.filter(t=>t.date > addDays(todayISO(),7) && t.date <= addDays(todayISO(),30));
  const section = (title,items)=>`
    <section class="due-print-section">
      <h2>${title}</h2>
      ${items.length ? items.map(t=>`<div class="due-print-item"><span class="due-box"></span><div><strong>${esc(t.artist.artistName||"Untitled Artist")} — ${esc(t.label)}</strong><small>${fmtDate(t.date)} · ${esc(t.artist.exhibitionTitle||"Untitled Exhibition")}</small></div></div>`).join("") : `<p class="due-print-empty">Nothing due in this section.</p>`}
    </section>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HRAC Due List</title><style>
    body{font-family:Arial,sans-serif;color:#10233f;margin:.45in}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0c8fb3;padding-bottom:14px;margin-bottom:18px}
    .head h1{margin:0;font-size:28px}.head p{margin:5px 0 0;color:#607086}
    .meta{text-align:right;font-size:12px;color:#607086}
    .due-print-section{margin:20px 0;break-inside:avoid}.due-print-section h2{font-size:16px;text-transform:uppercase;letter-spacing:.08em;color:#0c8fb3;border-bottom:1px solid #dfe7ef;padding-bottom:7px}
    .due-print-item{display:grid;grid-template-columns:20px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #edf1f5}
    .due-box{width:16px;height:16px;border:2px solid #10233f;border-radius:3px;margin-top:1px}
    .due-print-item strong{display:block;font-size:13px}.due-print-item small{display:block;color:#607086;margin-top:3px}
    .due-print-empty{color:#78879a;font-style:italic}
    .foot{margin-top:30px;border-top:1px solid #dfe7ef;padding-top:9px;font-size:10px;color:#78879a;display:flex;justify-content:space-between}
    @media print{@page{size:letter portrait;margin:.4in}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="head"><div><h1>HRAC Due List</h1><p>${esc(activeYear())} exhibitions · Prepared for ${esc(editorDisplayName())}</p></div><div class="meta">Generated ${new Date().toLocaleString()}</div></div>
    ${section("Overdue",overdue)}
    ${section("Due in the Next 7 Days",next7)}
    ${section("Coming Up in the Next 30 Days",later)}
    <div class="foot"><span>Hammond Regional Arts Center</span><span>HRAC Art Center Manager · Version ${APP_VERSION}</span></div>
  </body></html>`;
}
function printDueList(){
  const list = sortArtists(activeOperationalArtists().filter(a=>String(a.year)===String(activeYear())));
  const w = window.open("","_blank");
  if(!w){ alert("Please allow pop-ups so the due list can open."); return; }
  w.document.open();
  w.document.write(printableDueListMarkup(list));
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(),250);
}
function renderTesting(){
  const d = runDiagnostics();
  const archived = archivedArtists();
  document.getElementById("view-testing").innerHTML = `
    <div class="manager-page-head">
      <div><h1>System Test</h1><p>Diagnostics, collaboration details, archive information, and activity history.</p></div>
      <div class="manager-actions"><button class="manager-btn" data-action="run-self-test">Run Self-Test</button></div>
    </div>
    ${diagnosticsMarkup()}
    <div class="manager-two">
      <section class="panel">
        <div class="panel-head"><div class="panel-title">✓ System Status</div></div>
        <div class="panel-body">
          ${systemStatusMarkup()}
          <div class="cmd-file"><strong>Loaded JSON</strong><span>${esc(state.loadedFileName || "No JSON loaded yet")}</span><small>${state.loadedAt ? "Loaded: "+esc(state.loadedAt) : "Upload the latest backup when ready."}</small><small>${state.lastSavedAt ? "Last saved: "+esc(state.lastSavedAt)+" by "+esc(state.lastSavedBy||"Not recorded") : "Last saved info will appear after the next backup."}</small></div>
          ${collaborationPanelMarkup()}
          <div class="cmd-file"><strong>Archive</strong><span>${archived.length} finished exhibition artist(s) hidden from working views.</span><small>${archiveYearsMarkup(archived)}</small></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><div class="panel-title">✓ Function Checklist</div></div>
        <div class="panel-body">
          <div class="test-list">${d.results.map(c=>`<div class="test-item ${c.ok?"pass":"fail"}"><span><strong>${esc(c.name)}</strong><br><small>${esc(c.detail)}</small></span><b>${c.ok?"PASS":"NO-GO"}</b></div>`).join("")}</div>
          <br><div class="empty">This diagnostic uses a temporary test artist in memory only. It does not load sample artists into your tracker.</div>
        </div>
      </section>
    </div>
    <br>
    <section class="panel">
      <div class="panel-head"><div class="panel-title">▤ Activity Log</div><button class="filter" data-action="clear-activity-log">Clear</button></div>
      <div class="panel-body">${activityLogMarkup()}</div>
    </section>`;
}

async function readFile(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve({name:file.name,type:file.type,size:file.size,dataUrl:r.result}); r.onerror=reject; r.readAsDataURL(file); }); }
async function handleUpload(input){
  const id=input.dataset.upload, kind=input.dataset.kind, a=state.artists.find(x=>x.id===id);
  if(!a || !input.files || !input.files.length) return;
  const files=[...input.files];
  if(files.some(f=>f.size>3*1024*1024) && !confirm("Large files can slow down the tracker. Continue?")) return;
  if(kind==="promoImages"){
    a.promoImages = a.promoImages || [];
    for(const f of files) a.promoImages.push(await readFile(f));
  } else {
    a[kind] = await readFile(files[0]);
    if(kind==="inventoryFile") a.inventoryReceived = "yes";
  }
  markDirty(); render(); showTab(a.year,false);
}
function download(filename,data){
  const blob = new Blob([data], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try{ a.remove(); }catch(e){}
    try{ URL.revokeObjectURL(url); }catch(e){}
  }, 60000);
  return {url, filename};
}

function emailTemplateText(a,type){
  const name=a.artistName||"there";
  const exhibition=a.exhibitionTitle||"your upcoming exhibition";
  const d=dueDates(a);
  const templates={
    inventory:`Hello ${name},\n\nThis is a friendly reminder that we still need your artwork inventory for ${exhibition}. The current due date is ${fmtDate(d.inventoryDue)}.\n\nPlease let us know if you have any questions.\n\nThank you,\nHammond Regional Arts Center`,
    promo:`Hello ${name},\n\nWe are preparing promotional materials for ${exhibition}. Please send your bio, headshot, artist statement, resume, and promotional images by ${fmtDate(d.promoDue)}.\n\nThank you,\nHammond Regional Arts Center`,
    contract:`Hello ${name},\n\nWe are following up regarding the exhibition agreement for ${exhibition}. Please review, sign, and return it as soon as possible.\n\nThank you,\nHammond Regional Arts Center`,
    install:`Hello ${name},\n\nThis is a reminder that installation for ${exhibition} is scheduled for ${fmtDate(a.installDate)}. Please confirm your arrival time and any installation needs.\n\nThank you,\nHammond Regional Arts Center`,
    thanks:`Hello ${name},\n\nThank you for sharing ${exhibition} with Hammond Regional Arts Center. We appreciate your time, work, and partnership.\n\nWarmly,\nHammond Regional Arts Center`
  };
  return templates[type]||templates.promo;
}
function chooseEmailTemplate(a){
  const choice=prompt("Choose an email template:\n1 — Promotional materials\n2 — Inventory reminder\n3 — Contract reminder\n4 — Installation reminder\n5 — Thank you");
  const key=({"1":"promo","2":"inventory","3":"contract","4":"install","5":"thanks"})[choice];
  if(!key) return;
  const body=emailTemplateText(a,key);
  const subject=encodeURIComponent(`HRAC: ${a.exhibitionTitle||"Exhibition Follow-Up"}`);
  const mailto=`mailto:${encodeURIComponent(a.email||"")}?subject=${subject}&body=${encodeURIComponent(body)}`;
  navigator.clipboard?.writeText(body);
  if(confirm("The email text was copied. Open it in your email program too?")) window.location.href=mailto;
}
function artworkLabelMarkup(a){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Artwork Label</title><style>
  body{font-family:Arial,sans-serif;margin:.4in;color:#10233f}.label{width:5in;min-height:3in;border:1px solid #cfd8e2;padding:.35in;display:flex;flex-direction:column;justify-content:center}
  h1{font-family:Georgia,serif;font-size:24px;margin:0 0 10px}h2{font-size:17px;margin:0 0 8px;font-style:italic;font-weight:500}p{margin:4px 0;font-size:13px}.hrac{margin-top:24px;border-top:2px solid #0c8fb3;padding-top:10px;font-size:11px;font-weight:bold;letter-spacing:.08em}
  @media print{@page{size:letter;margin:.5in}body{margin:0}.label{break-inside:avoid}}</style></head><body><div class="label"><h1>${esc(a.artistName||"Artist Name")}</h1><h2>${esc(a.exhibitionTitle||"Artwork / Exhibition Title")}</h2><p>${esc(a.gallery||"Hammond Regional Arts Center")}</p><p>${a.exhibitionStartDate?fmtDate(a.exhibitionStartDate):""}</p><div class="hrac">HAMMOND REGIONAL ARTS CENTER</div></div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),200));<\/script></body></html>`;
}
function printArtworkLabel(a){
  const w=window.open("","_blank");
  if(!w){alert("Please allow pop-ups to print the label.");return;}
  w.document.open();w.document.write(artworkLabelMarkup(a));w.document.close();w.focus();
}
function globalResultItems(q){
  const term=(q||"").trim().toLowerCase();
  if(term.length<2) return [];
  const results=[];
  state.artists.forEach(a=>{
    const hay=[a.artistName,a.exhibitionTitle,a.email,a.phone,a.gallery,a.notes,a.year].join(" ").toLowerCase();
    if(hay.includes(term)) results.push({type:a.role||"Artist",title:a.artistName||"Untitled Artist",sub:`${a.exhibitionTitle||"No exhibition"} · ${a.year||""}`,artistId:a.id});
  });
  (state.callsForEntry||[]).forEach(r=>{if([r.title,r.organization,r.notes].join(" ").toLowerCase().includes(term))results.push({type:"Call for Entry",title:r.title||"Untitled Opportunity",sub:r.organization||""});});
  (state.collectionCare||[]).forEach(r=>{if([r.title,r.source,r.location].join(" ").toLowerCase().includes(term))results.push({type:"Collection",title:r.title||"Untitled Object",sub:`${r.source||""} · ${r.location||""}`});});
  (state.salesRecords||[]).forEach(r=>{if([r.artist,r.artwork,r.buyer].join(" ").toLowerCase().includes(term))results.push({type:"Sale",title:r.artwork||"Untitled Artwork",sub:`${r.artist||""} · ${r.buyer||""}`});});
  (state.educationPrograms||[]).forEach(r=>{if([r.title,r.type,r.audience,r.location,r.instructor,r.notes].join(" ").toLowerCase().includes(term))results.push({type:"Education Program",title:r.title||"Untitled Program",sub:`${r.type||"Program"} · ${fmtDate(r.date)}`});});
  (state.schoolTours||[]).forEach(r=>{if([r.school,r.grade,r.teacher,r.email,r.notes].join(" ").toLowerCase().includes(term))results.push({type:"School Tour",title:r.school||"Unnamed School",sub:`${r.grade||""} · ${fmtDate(r.date)}`});});
  (state.educationResources||[]).forEach(r=>{if([r.title,r.type,r.audience,r.standards,r.notes,linkedExhibitionName(r.exhibitionId)].join(" ").toLowerCase().includes(term))results.push({type:"Education Resource",title:r.title||"Untitled Resource",sub:`${r.type||"Resource"} · ${r.audience||""}`});});
  return results.slice(0,12);
}
function showGlobalResults(q){
  let box=document.getElementById("globalSearchResults");
  if(!box){
    box=document.createElement("div");box.id="globalSearchResults";box.className="global-search-results";
    document.querySelector(".searchbar")?.appendChild(box);
  }
  const items=globalResultItems(q);
  if((q||"").trim().length<2){box.innerHTML="";box.classList.remove("open");return;}
  box.innerHTML=items.length?items.map(r=>`<button class="global-result" ${r.artistId?`data-artist-id="${r.artistId}"`:""}><span>${esc(r.type)}</span><strong>${esc(r.title)}</strong><small>${esc(r.sub)}</small></button>`).join(""):`<div class="global-no-result">No matches found.</div>`;
  box.classList.add("open");
}
function reminderText(a){
  const needs=needsList(a);
  let text="Hello "+(a.artistName||"there")+",\n\n";
  text+="We are checking in about your upcoming HRAC exhibition: "+(a.exhibitionTitle||"Untitled")+".";
  if(needs.length){
    text+="\n\nStill needed:\n"+needs.map(n=>"- "+n.label+(n.due?" — due "+fmtDate(n.due):"")).join("\n");
  } else {
    text+="\n\nEverything currently looks complete.";
  }
  return text+"\n\nThank you!";
}

document.addEventListener("click", e=>{
  if(!e.target.closest(".searchbar")) document.getElementById("globalSearchResults")?.classList.remove("open");
  const tab = e.target.closest("[data-tab]");
  if(tab){ showTab(tab.dataset.tab); return; }

  const action = e.target.closest("[data-action]");
  if(action){ doAction(action); return; }

  const uploadTrigger = e.target.closest("[data-upload-trigger]");
  if(uploadTrigger){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before uploading files."); return; }
    const input = document.querySelector(`input[data-upload="${uploadTrigger.dataset.uploadTrigger}"][data-kind="${uploadTrigger.dataset.kind}"]`);
    if(input) input.click();
    return;
  }

  const removeFile = e.target.closest("[data-remove-file]");
  if(removeFile){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before removing files."); return; }
    const a = state.artists.find(x=>x.id===removeFile.dataset.removeFile);
    if(a && confirm("Remove this file?")){
      a[removeFile.dataset.kind] = null;
      markDirty(); render(); showTab(a.year,false);
    }
    return;
  }

  const removePromo = e.target.closest("[data-remove-promo]");
  if(removePromo){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before removing promo images."); return; }
    const a = state.artists.find(x=>x.id===removePromo.dataset.removePromo);
    if(a && Array.isArray(a.promoImages)){
      a.promoImages.splice(Number(removePromo.dataset.index),1);
      markDirty(); render(); showTab(a.year,false);
    }
    return;
  }

  const tri = e.target.closest("[data-tri]");
  if(readOnlyMode && tri){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before making changes."); return; }
  if(tri){
    const a = state.artists.find(x=>x.id===tri.dataset.id);
    if(a){
      a[tri.dataset.tri] = tri.dataset.val;
      markDirty(); render(); showTab(a.year,false);
    }
    return;
  }

  const educationImageTrigger=e.target.closest("[data-action='upload-education-images']");
  if(educationImageTrigger){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before uploading images."); return; }
    const input=document.querySelector(`input[data-education-image-upload="${educationImageTrigger.dataset.id}"][data-education-image-type="${educationImageTrigger.dataset.type}"]`);
    if(input) input.click();
    return;
  }

  const educationOpen=e.target.closest("[data-education-open]");
  if(educationOpen){
    state.selectedEducationId=educationOpen.dataset.educationOpen;
    state.selectedEducationType=educationOpen.dataset.educationType;
    renderEducationHub();
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }

  const row = e.target.closest("[data-artist-id]");
  if(row && !e.target.closest(".grab") && !e.target.closest(".more")){
    const a = state.artists.find(x=>x.id===row.dataset.artistId);
    if(a){
      state.selectedArtistId = a.id;
      markDirty(); render(); showTab(a.year,false);
    }
    return;
  }
});

document.addEventListener("input", e=>{
  if(readOnlyMode && e.target.matches("[data-field]")){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before making changes."); return; }
  if(e.target.matches("[data-participant-field]")){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before making changes."); return; }
    const record=educationRecord(e.target.dataset.edType,e.target.dataset.edId);
    const row=Number(e.target.dataset.row),field=e.target.dataset.participantField;
    if(record?.participants?.[row]){
      record.participants[row][field]=e.target.value;
      record.updated=todayISO();
      markDirty();
    }
    return;
  }
  if(e.target.matches("[data-ed-field]")){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before making changes."); return; }
    const type=e.target.dataset.edType,id=e.target.dataset.edId,field=e.target.dataset.edField;
    const list=type==="program"?state.educationPrograms:type==="tour"?state.schoolTours:state.educationResources;
    const item=list.find(x=>x.id===id);
    if(item){
      item[field]=e.target.type==="checkbox"?e.target.checked:(e.target.type==="number"?Number(e.target.value)||0:e.target.value);
      item.updated=todayISO();
      markDirty();
      if(["title","school","status","category","date","audience"].includes(field)) renderEducationHub();
    }
    return;
  }
  if(e.target.matches("[data-field]")){
    const a = state.artists.find(x=>x.id===e.target.dataset.id);
    if(a){
      a[e.target.dataset.field] = e.target.value;
      markDirty();
      updateLiveComputedFields(a);
    }
  }
  if(e.target.matches("[data-year-search]")) filterYear(e.target.dataset.yearSearch,"",e.target.value);
  if(e.target.id==="dashArtistSearch") dashSearch(e.target.value);
  if(e.target.id==="globalSearch") globalSearch(e.target.value);
});
document.addEventListener("change", e=>{
  if(e.target.matches("[data-education-image-upload]")){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before uploading images."); return; }
    const record=educationRecord(e.target.dataset.educationImageType,e.target.dataset.educationImageUpload);
    if(record && e.target.files?.length) readEducationImages(e.target.files,record);
    e.target.value="";
    return;
  }
  if(e.target.matches("[data-ed-field]")){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before making changes."); return; }
    const type=e.target.dataset.edType,id=e.target.dataset.edId,field=e.target.dataset.edField;
    const list=type==="program"?state.educationPrograms:type==="tour"?state.schoolTours:state.educationResources;
    const item=list.find(x=>x.id===id);
    if(item){ item[field]=e.target.type==="checkbox"?e.target.checked:e.target.value; item.updated=todayISO(); markDirty(); renderEducationHub(); }
    return;
  }
  if(e.target.matches("[data-upload]")) handleUpload(e.target);
  if(e.target.id==="importFile" || e.target.id==="diagImportFile") importFile(e.target.files[0]);
  if(e.target.id==="reportYear" || e.target.id==="reportIncludePast") refreshYearReportPreview();
  if(e.target.id==="reportArtist") refreshArtistReportPreview();
  if(e.target.id==="reportArtistScope") refreshArtistReportOptions();
  if(e.target.id==="calendarIncludePast") refreshCalendarList();
});
document.addEventListener("dragstart", e=>{
  const row=e.target.closest("[data-artist-id]");
  if(row){ dragId=row.dataset.artistId; row.classList.add("dragging"); e.dataTransfer.setData("text/plain",dragId); }
});
document.addEventListener("dragend", ()=>{
  document.querySelectorAll("[data-artist-id]").forEach(r=>r.classList.remove("dragging","drag-over"));
  dragId=null;
});
document.addEventListener("dragover", e=>{
  const row=e.target.closest("[data-artist-id]");
  if(row && row.dataset.artistId!==dragId){ e.preventDefault(); row.classList.add("drag-over"); }
});
document.addEventListener("dragleave", e=>{
  const row=e.target.closest("[data-artist-id]");
  if(row) row.classList.remove("drag-over");
});
document.addEventListener("drop", e=>{
  const row=e.target.closest("[data-artist-id]");
  if(!row || !dragId) return;
  e.preventDefault();
  reorder(dragId,row.dataset.artistId);
});

function doAction(btn){
  const act=btn.dataset.action, a=selectedArtist();
  if(act==="upload-education-images"){
    if(readOnlyMode){ alert("Read-only mode is on. Click Start Editing before uploading images."); return; }
    const input=document.querySelector(`input[data-education-image-upload="${btn.dataset.id}"][data-education-image-type="${btn.dataset.type}"]`);
    if(input){ input.click(); } else { alert("The image picker could not be found. Please refresh the page and try again."); }
    return;
  }
  const editActions = new Set(["new-artist","add-artist-year","duplicate-selected","delete-selected","copy-reminder","clear-activity-log","toggle-favorite","toggle-pin","add-education-program","edit-education-program","delete-education-program","add-school-tour","edit-school-tour","delete-school-tour","add-education-resource","edit-education-resource","delete-education-resource","new-education-program-profile","new-school-tour-profile","new-resource-profile","duplicate-education-record","delete-selected-education","add-participant","remove-participant","toggle-participant-present","remove-education-image"]);
  if(readOnlyMode && editActions.has(act)){ alert("Read-only mode is on. Click Start Editing from the Collaboration panel before making changes."); return; }
  if(act==="toggle-favorite" && a){ a.favorite=!a.favorite; logActivity(a.favorite?"Favorited artist":"Removed favorite",a.artistName||"Untitled"); markDirty(); render(); showTab(a.year,false); return; }
  if(act==="toggle-pin" && a){ a.pinned=!a.pinned; logActivity(a.pinned?"Pinned exhibition":"Unpinned exhibition",a.exhibitionTitle||"Untitled"); markDirty(); render(); showTab(a.year,false); return; }
  if(act==="email-template" && a){ chooseEmailTemplate(a); return; }
  if(act==="print-artwork-label" && a){ printArtworkLabel(a); return; }
  if(act==="new-artist"){
    const y = activeYear();
    const n = blankArtist(y);
    state.artists.push(n);
    logActivity("Added artist", "New profile in " + y);
    state.selectedArtistId = n.id;
    state.activeTab = y;
    markDirty(); render(); showTab(y,false);
  }
  if(act==="add-artist-year"){
    const y=btn.dataset.year;
    const n=blankArtist(y);
    state.artists.push(n);
    logActivity("Added artist", "New profile in " + y);
    state.selectedArtistId=n.id;
    markDirty(); render(); showTab(y,false);
  }
  if(act==="duplicate-selected" && a){
    const c=JSON.parse(JSON.stringify(a));
    c.id=uid(); c.artistName=(c.artistName||"Untitled")+" (Copy)"; c.manualOrder=Date.now();
    state.artists.push(c); logActivity("Duplicated artist", c.artistName || "Untitled"); state.selectedArtistId=c.id;
    markDirty(); render(); showTab(c.year,false);
  }
  if(act==="delete-selected" && a && confirm("Delete this artist profile?")){
    const y=a.year;
    logActivity("Deleted artist", a.artistName || "Untitled");
    state.artists=state.artists.filter(x=>x.id!==a.id);
    state.selectedArtistId=state.artists.find(x=>x.year===y)?.id || null;
    markDirty(); render(); showTab(y,false);
  }
  if(act==="export-all"){ exportSharedJson(); }
  if(act==="copy-reminder" && a){
    navigator.clipboard?.writeText(reminderText(a));
    alert("Reminder copied.");
  }
  if(act==="run-self-test"){
    const d = runDiagnostics();
    alert(d.passed ? "Self-check complete: GO. If no artist data is loaded, upload the latest JSON backup." : "Self-check complete: NO-GO. Review the failed items on the Test page.");
    renderTesting();
  }
  if(act==="preview-year-report"){ refreshYearReportPreview(); }
  if(act==="print-year-report"){
    const year=document.getElementById("reportYear")?.value || activeYear();
    const includePast=document.getElementById("reportIncludePast")?.value === "yes";
    logActivity("Printed year checklist", year + (includePast ? " with history" : " working list"));
    printHtml(buildYearReport(year, includePast));
  }
  if(act==="preview-artist-report"){ refreshArtistReportPreview(); }
  if(act==="print-selected-artist-report"){
    const id=document.getElementById("reportArtist")?.value;
    const artist=state.artists.find(x=>x.id===id) || sortArtists(state.artists)[0];
    if(artist){ logActivity("Printed artist checklist", artist.artistName || "Untitled"); printHtml(buildArtistReport(artist)); }
  }
  if(act==="print-artist-checklist" && a){ logActivity("Printed artist checklist", a.artistName || "Untitled"); printHtml(buildArtistReport(a)); }

  if(act==="show-missing"){ showMissingFocus(btn.dataset.kind); }
  if(act==="clear-activity-log"){ if(confirm("Clear the visible activity log for this JSON file?")){ state.activityLog=[]; markDirty(); render(); } }
  if(act==="show-collab-notice"){ showCollaborationNotice(true); }
  if(act==="switch-to-editing"){ showCollaborationNotice(true); }
  if(act==="confirm-collab-edit"){ confirmCollaborationEdit(); }
  if(act==="confirm-collab-readonly"){ confirmCollaborationReadOnly(); }
  if(act==="print-due-list"){ printDueList(); return; }
  if(act==="add-sale-record"){
    if(readOnlyMode){ alert("Start Editing before adding records."); return; }
    const artist=prompt("Artist name:"); if(!artist) return;
    const artwork=prompt("Artwork title:")||"Untitled";
    const buyer=prompt("Buyer / client:")||"Not recorded";
    const amount=prompt("Sale amount (numbers only):")||"0";
    state.salesRecords.push({id:uid(),date:todayISO(),artist,artwork,buyer,amount:Number(amount)||0,status:"Open"});
    logActivity("Added sales record", artist+" — "+artwork); markDirty(); render(); showTab("sales",false);
  }
  if(act==="add-collection-item"){
    if(readOnlyMode){ alert("Start Editing before adding records."); return; }
    const title=prompt("Object or artwork title:"); if(!title) return;
    const source=prompt("Artist, donor, or source:")||"Not recorded";
    const location=prompt("Current location:")||"HRAC";
    const condition=prompt("Condition (Good / Fair / Needs Attention):")||"Good";
    state.collectionCare.push({id:uid(),title,source,location,condition,checked:todayISO()});
    logActivity("Added collection-care item", title); markDirty(); render(); showTab("collection",false);
  }
  if(act==="add-call-entry"){
    if(readOnlyMode){ alert("Start Editing before adding records."); return; }
    const title=prompt("Opportunity title:"); if(!title) return;
    const organization=prompt("Organization:")||"Not recorded";
    const deadline=prompt("Deadline (YYYY-MM-DD):")||"";
    const notes=prompt("Quick notes or eligibility:")||"";
    state.callsForEntry.push({id:uid(),title,organization,deadline,status:"Researching",notes});
    logActivity("Added call for entry", title); markDirty(); render(); showTab("calls",false);
  }
  if(act==="add-participant"){
    const record=educationRecord(btn.dataset.type,btn.dataset.id);
    if(record){
      record.participants=record.participants||[];
      record.participants.push({studentName:"",ageGrade:"",guardianName:"",guardianPhone:"",guardianEmail:"",present:false,signInTime:"",signOutTime:"",pickupPerson:""});
      markDirty(); renderEducationHub();
    }
    return;
  }
  if(act==="remove-participant"){
    const record=educationRecord(btn.dataset.type,btn.dataset.id);
    const row=Number(btn.dataset.row);
    if(record?.participants?.[row] && confirm("Remove this student/guardian row?")){
      record.participants.splice(row,1); markDirty(); renderEducationHub();
    }
    return;
  }
  if(act==="toggle-participant-present"){
    const record=educationRecord(btn.dataset.type,btn.dataset.id);
    const row=Number(btn.dataset.row);
    if(record?.participants?.[row]){
      record.participants[row].present=!record.participants[row].present;
      if(record.participants[row].present && !record.participants[row].signInTime){
        record.participants[row].signInTime=new Date().toTimeString().slice(0,5);
      }
      markDirty(); renderEducationHub();
    }
    return;
  }
  if(act==="print-signin-sheet"){
    const record=educationRecord(btn.dataset.type,btn.dataset.id);
    if(!record) return;
    const w=window.open("","_blank");
    if(!w){ alert("Please allow pop-ups to print the sign-in sheet."); return; }
    w.document.open(); w.document.write(signInSheetHtml(record,btn.dataset.type)); w.document.close(); w.focus();
    logActivity("Printed sign-in sheet",record.title||record.school||"Education Program");
    return;
  }
  if(act==="remove-education-image"){
    const record=educationRecord(btn.dataset.type,btn.dataset.id);
    const i=Number(btn.dataset.index);
    if(record?.profileImages?.[i] && confirm("Remove this image?")){
      record.profileImages.splice(i,1); markDirty(); renderEducationHub();
    }
    return;
  }
  if(act==="select-education-category"){
    state.educationCategory=btn.dataset.category||"ARTisTRY Class";
    state.selectedEducationId=null; state.selectedEducationType=null;
    renderEducationHub(); return;
  }
  if(act==="education-back"){
    state.selectedEducationId=null; state.selectedEducationType=null;
    renderEducationHub(); window.scrollTo({top:0,behavior:"smooth"}); return;
  }
  if(act==="new-education-program-profile"){
    const item={id:uid(),category:state.educationCategory||"ARTisTRY Class",title:"New Program",status:"Planning",date:"",endDate:"",time:"",location:"HRAC",audience:"All Ages",ageRange:"",capacity:0,attendance:0,instructor:"",assistant:"",season:"",registrationStatus:"",fee:"",budget:"",exhibitionId:"",bigIdea:"",essentialQuestion:"",learningObjectives:"",studioObjectives:"",vocabulary:"",materials:"",safetyNotes:"",assessment:"",reflection:"",extensionActivities:"",louisianaStandards:"",naeaStandards:"",communications:"",evaluation:"",lessonsLearned:"",notes:"",participants:[],profileImages:[],updated:todayISO()};
    state.educationPrograms.push(item); state.selectedEducationId=item.id; state.selectedEducationType="program"; logActivity("Created education profile",item.category); markDirty(); renderEducationHub(); return;
  }
  if(act==="new-school-tour-profile"){
    const item={id:uid(),school:"New School Visit",date:"",time:"",grade:"",students:0,teacher:"",email:"",phone:"",status:"Planning",exhibitionId:"",packetSent:false,busConfirmed:false,activityReady:false,volunteerAssigned:false,lessonPlan:"",tourGoals:"",vocabulary:"",louisianaStandards:"",naeaStandards:"",accessibility:"",followUp:"",evaluation:"",notes:"",participants:[],profileImages:[],updated:todayISO()};
    state.schoolTours.push(item); state.selectedEducationId=item.id; state.selectedEducationType="tour"; logActivity("Created school tour profile",item.school); markDirty(); renderEducationHub(); return;
  }
  if(act==="new-resource-profile"){
    const item={id:uid(),title:"New Education Resource",type:"Teacher Guide",audience:"All Ages",gradeRange:"",exhibitionId:"",standards:"",louisianaStandards:"",naeaStandards:"",vocabulary:"",learningObjectives:"",description:"",instructions:"",materials:"",fileName:"",revisionHistory:"",notes:"",profileImages:[],updated:todayISO()};
    state.educationResources.push(item); state.selectedEducationId=item.id; state.selectedEducationType="resource"; logActivity("Created education resource profile",item.title); markDirty(); renderEducationHub(); return;
  }
  if(act==="duplicate-education-record"){
    const original=educationProfileRecord(); if(!original) return;
    const copy={...original,id:uid(),title:original.title?`${original.title} Copy`:undefined,school:original.school?`${original.school} Copy`:undefined,updated:todayISO()};
    if(state.selectedEducationType==="program") state.educationPrograms.push(copy);
    else if(state.selectedEducationType==="tour") state.schoolTours.push(copy);
    else state.educationResources.push(copy);
    state.selectedEducationId=copy.id; logActivity("Duplicated education profile",copy.title||copy.school||"Profile"); markDirty(); renderEducationHub(); return;
  }
  if(act==="delete-selected-education"){
    const item=educationProfileRecord(); if(!item) return;
    if(confirm(`Delete "${item.title||item.school||"this profile"}"?`)){
      if(state.selectedEducationType==="program") state.educationPrograms=state.educationPrograms.filter(x=>x.id!==item.id);
      else if(state.selectedEducationType==="tour") state.schoolTours=state.schoolTours.filter(x=>x.id!==item.id);
      else state.educationResources=state.educationResources.filter(x=>x.id!==item.id);
      logActivity("Deleted education profile",item.title||item.school||"Profile"); state.selectedEducationId=null; state.selectedEducationType=null; markDirty(); renderEducationHub();
    }
    return;
  }
  if(act==="add-education-program"){
    const item=promptEducationProgram();
    if(item){ state.educationPrograms.push(item); logActivity("Added education program",item.title); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="edit-education-program"){
    const idx=state.educationPrograms.findIndex(x=>x.id===btn.dataset.id);
    if(idx>=0){ const item=promptEducationProgram(state.educationPrograms[idx]); if(item){ state.educationPrograms[idx]=item; logActivity("Updated education program",item.title); markDirty(); render(); showTab("education",false); } }
    return;
  }
  if(act==="delete-education-program"){
    const item=state.educationPrograms.find(x=>x.id===btn.dataset.id);
    if(item && confirm(`Delete education program "${item.title}"?`)){ state.educationPrograms=state.educationPrograms.filter(x=>x.id!==item.id); logActivity("Deleted education program",item.title); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="add-school-tour"){
    const item=promptSchoolTour();
    if(item){ state.schoolTours.push(item); logActivity("Added school tour",item.school); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="edit-school-tour"){
    const idx=state.schoolTours.findIndex(x=>x.id===btn.dataset.id);
    if(idx>=0){ const item=promptSchoolTour(state.schoolTours[idx]); if(item){ state.schoolTours[idx]=item; logActivity("Updated school tour",item.school); markDirty(); render(); showTab("education",false); } }
    return;
  }
  if(act==="delete-school-tour"){
    const item=state.schoolTours.find(x=>x.id===btn.dataset.id);
    if(item && confirm(`Delete school tour "${item.school}"?`)){ state.schoolTours=state.schoolTours.filter(x=>x.id!==item.id); logActivity("Deleted school tour",item.school); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="add-education-resource"){
    const item=promptEducationResource();
    if(item){ state.educationResources.push(item); logActivity("Added education resource",item.title); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="edit-education-resource"){
    const idx=state.educationResources.findIndex(x=>x.id===btn.dataset.id);
    if(idx>=0){ const item=promptEducationResource(state.educationResources[idx]); if(item){ state.educationResources[idx]=item; logActivity("Updated education resource",item.title); markDirty(); render(); showTab("education",false); } }
    return;
  }
  if(act==="delete-education-resource"){
    const item=state.educationResources.find(x=>x.id===btn.dataset.id);
    if(item && confirm(`Delete education resource "${item.title}"?`)){ state.educationResources=state.educationResources.filter(x=>x.id!==item.id); logActivity("Deleted education resource",item.title); markDirty(); render(); showTab("education",false); }
    return;
  }
  if(act==="print-education-summary"){
    const w=window.open("","_blank");
    if(!w){ alert("Please allow pop-ups to print the education summary."); return; }
    logActivity("Printed education impact summary","Education & Outreach");
    w.document.open(); w.document.write(educationSummaryHtml()); w.document.close(); w.focus();
    return;
  }
  if(act==="toggle-section"){
    const sec = btn.closest(".section");
    if(sec){
      sec.classList.toggle("collapsed");
      const icon = btn.querySelector("span:last-child");
      if(icon) icon.textContent = sec.classList.contains("collapsed") ? "+" : "−";
    }
  }
}
function filterYear(year,val,q=""){
  const query=(q || document.querySelector(`[data-year-search="${year}"]`)?.value || "").toLowerCase();
  document.querySelectorAll(`#yearList-${year} [data-artist-id]`).forEach(row=>{
    const a=state.artists.find(x=>x.id===row.dataset.artistId);
    let show=true;
    if(query && !row.dataset.search.includes(query)) show=false;
    if(val==="promo" && (received(a.promoImagesReceived) || (a.promoImages && a.promoImages.length))) show=false;
    if(val==="contract" && a.contractStatus==="received") show=false;
    row.style.display=show?"":"none";
  });
}
function dashSearch(q){
  q=(q||"").toLowerCase();
  document.querySelectorAll("#view-dashboard [data-artist-id]").forEach(row=>{
    row.style.display=row.dataset.search.includes(q)?"":"none";
  });
}
function globalSearch(q){
  showGlobalResults(q);
  q=(q||"").toLowerCase();
  document.querySelectorAll("[data-search]").forEach(row=>{
    row.style.display=!q || (row.dataset.search||"").includes(q)?"":"none";
  });
}
function reorder(srcId,tgtId){
  const s=state.artists.find(a=>a.id===srcId), t=state.artists.find(a=>a.id===tgtId);
  if(!s || !t || s.year!==t.year || s.gallery!==t.gallery){
    alert("Drag sorting stays within the same gallery/year section.");
    return;
  }
  const group=sortArtists(state.artists.filter(a=>a.year===s.year && a.gallery===s.gallery));
  const si=group.findIndex(a=>a.id===srcId), ti=group.findIndex(a=>a.id===tgtId);
  const moved=group.splice(si,1)[0];
  group.splice(ti,0,moved);
  group.forEach((a,i)=>a.manualOrder=i+1);
  markDirty(); render(); showTab(s.year,false);
}
function importFile(file){
  if(!file) return;

  // Preserve the staff member who is actively signed in. The JSON records who
  // saved it last, but importing that history must not replace today's editor.
  const activeEditor = {
    name: state.currentEditorName || preferredEditorName() || "",
    initials: state.currentEditorInitials || preferredEditorInitials() || "",
    sessionId: state.currentSessionId || "",
    editingStartedAt: state.editingStartedAt || ""
  };

  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      state=normalize(data.artists ? data : {years:DEFAULT_YEARS, artists:Array.isArray(data)?data:[]});
      state.loadedFileName = file.name;
      state.loadedAt = new Date().toLocaleString();

      // Keep the imported file's save history for reference.
      state.lastSavedBy = state.trackerMetadata?.lastEditor || state.lastSavedBy || data.lastSavedBy || "Not recorded";
      state.lastSavedAt = state.trackerMetadata?.savedAt || state.lastSavedAt || data.lastSavedAt || "";

      // Restore the current browser session identity after the imported state
      // has been normalized, so Lisa stays Lisa even when Shayla saved the file.
      if(activeEditor.name){
        state.currentEditorName = activeEditor.name;
        state.currentEditorInitials = activeEditor.initials || makeInitials(activeEditor.name);
        state.currentSessionId = activeEditor.sessionId || sessionIdFor(activeEditor.name, state.currentEditorInitials);
        state.editingStartedAt = activeEditor.editingStartedAt || new Date().toLocaleString();
      } else {
        state.currentEditorName = "";
        state.currentEditorInitials = "";
        state.currentSessionId = "";
        state.editingStartedAt = "";
      }

      readOnlyMode = false;
      logActivity("Imported JSON", file.name + (state.currentEditorName ? " — current editor: " + state.currentEditorName : ""));
      state.activeTab="dashboard";
      saveLocalSnapshot(); render();
    } catch(err){
      console.error("JSON import failed", err);
      alert("Could not import JSON.");
    }
  };
  r.readAsText(file);
}
window.addEventListener("beforeunload", function(e){
  if(!dirty) return;
  e.preventDefault();
  e.returnValue = "You have unsaved HRAC tracker changes. Download your updated JSON backup before closing, then replace the shared HRAC JSON so the next staff member has the newest file. Suggested file name: " + backupFileName();
});

render();
showStartupDiagnostic();
})();
