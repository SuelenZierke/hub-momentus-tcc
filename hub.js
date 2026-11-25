"use strict";
const byId = id => document.getElementById(id);
const format = new Intl.NumberFormat("pt-BR");
const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const products = [
  ["DEMO-01", "Camiseta Horizonte", 180, 150],
  ["DEMO-02", "Moletom Aurora", 92, 120],
  ["DEMO-03", "Calça Trilha", 0, 55],
  ["DEMO-04", "Regata Brisa", 84, 80],
  ["DEMO-05", "Bermuda Orla", 42, 70],
  ["DEMO-06", "Jaqueta Nuvem", 0, 35]
];
const boxes = ["CX-101", "CX-102", "CX-103"];
const scanned = new Set();
const periods = [
  [["Abril", 115, 105], ["Maio", 128, 121], ["Junho", 143, 139]],
  [["Julho", 132, 125], ["Agosto", 154, 148], ["Setembro", 162, 158]]
];
function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function metric(label, value) {
  const card = element("div", undefined, "card");
  card.append(element("span", label), element("strong", value));
  return card;
}
function pill(label, tone) {
  const node = element("span", label, "pill");
  node.dataset.tone = tone;
  return node;
}
function tableRow(...values) {
  const row = element("tr");
  for (const value of values) {
    const cell = element("td");
    if (value instanceof Node) cell.append(value);
    else cell.textContent = value;
    row.append(cell);
  }
  return row;
}
function renderCoverage() {
  const term = normalize(byId("search").value);
  const filter = byId("coverage-filter").value;
  const matching = products.map(([code, name, stock, demand]) => {
    if (stock >= demand) return {code, name, stock, demand, status: "Coberta", tone: "ok"};
    if (stock === 0) return {code, name, stock, demand, status: "Sem estoque", tone: "bad"};
    return {code, name, stock, demand, status: "Parcial", tone: "warn"};
  }).filter(item => normalize(item.code + " " + item.name).includes(term) && (!filter || item.status === filter));
  const sum = key => matching.reduce((total, item) => total + item[key], 0);
  byId("coverage-metrics").replaceChildren(metric("Referências", matching.length),
    metric("Estoque em peças", format.format(sum("stock"))), metric("Demanda em peças", format.format(sum("demand"))));
  const rows = matching.map(({code, name, stock, demand, status, tone}) =>
    tableRow(code, name, format.format(stock), format.format(demand),
      format.format(Math.round(stock / demand * 100)) + "%", pill(status, tone)));
  if (!rows.length) {
    const row = tableRow("Nenhuma referência encontrada.");
    row.firstElementChild.colSpan = 6;
    rows.push(row);
  }
  byId("coverage-body").replaceChildren(...rows);
  byId("coverage-count").textContent = matching.length + " de " + products.length + " referências";
}
function renderBoxes() {
  byId("scan-body").replaceChildren(...boxes.map((code, index) => tableRow(code,
    (index + 1) + " de " + boxes.length, scanned.has(code) ? pill("Conferida", "ok") : pill("Pendente", "warn"))));
  byId("scan-count").textContent = scanned.size === boxes.length
    ? "Conferência concluída. Todas as caixas foram conferidas."
    : scanned.size + " de " + boxes.length + " caixas conferidas";
}
function feedback(message, tone) {
  byId("scan-message").textContent = message;
  byId("scan-message").dataset.tone = tone;
}
function scanBox(value) {
  const code = value.trim().toUpperCase();
  if (!code) feedback("Informe o código de uma caixa.", "bad");
  else if (!boxes.includes(code)) feedback("Caixa fora do pedido de exemplo.", "bad");
  else if (scanned.has(code)) feedback(code + " já foi conferida.", "bad");
  else {
    scanned.add(code);
    renderBoxes();
    feedback(code + " conferida. " + byId("scan-count").textContent, "ok");
  }
  byId("scan").value = "";
  byId("scan").focus();
}
function renderIndicators() {
  const period = periods[Number(byId("period").value)];
  const totals = period.reduce(([planned, done], [, expected, checked]) => [planned + expected, done + checked], [0, 0]);
  const rate = (done, planned) => format.format(Math.round(done / planned * 100)) + "%";
  byId("bi-metrics").replaceChildren(metric("Caixas previstas", format.format(totals[0])),
    metric("Caixas conferidas", format.format(totals[1])), metric("Taxa de conferência", rate(totals[1], totals[0])));
  byId("bi-chart").replaceChildren(...period.map(([month, planned, done]) => {
    const row = element("div", undefined, "chart-row");
    const bar = element("meter");
    bar.max = planned;
    bar.value = done;
    bar.setAttribute("aria-label", month + ": " + done + " de " + planned + " caixas conferidas");
    row.append(element("span", month), bar, element("strong", rate(done, planned)));
    return row;
  }));
}
function navigate(moveFocus = false) {
  const pages = [...document.querySelectorAll("[data-page]")];
  if (location.hash === "#conteudo") return;
  const active = pages.find(page => "#" + page.dataset.page === location.hash) ?? pages[0];
  for (const page of pages) page.hidden = page !== active;
  for (const link of document.querySelectorAll("nav a")) {
    if (link.hash === "#" + active.dataset.page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (moveFocus && location.hash !== "#conteudo") {
    const heading = active.querySelector("h1");
    heading.tabIndex = -1;
    heading.focus();
  }
}
byId("search").addEventListener("input", renderCoverage);
byId("coverage-filter").addEventListener("change", renderCoverage);
byId("period").addEventListener("change", renderIndicators);
byId("add").addEventListener("click", () => scanBox(byId("scan").value));
byId("scan").addEventListener("keydown", event => {
  if (event.key === "Enter") scanBox(event.currentTarget.value);
});
byId("reset").addEventListener("click", () => {
  scanned.clear();
  renderBoxes();
  feedback("Simulação reiniciada.", "ok");
  byId("scan").value = "";
  byId("scan").focus();
});
for (const sample of document.querySelectorAll("[data-sample]")) {
  sample.addEventListener("click", () => scanBox(sample.dataset.sample));
}
window.addEventListener("hashchange", () => navigate(true));
renderCoverage();
renderBoxes();
renderIndicators();
navigate();