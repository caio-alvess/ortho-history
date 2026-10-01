const URL_API = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Leitura = { unidade: string; coletado_em: string; dados: Record<string, unknown> };
type Campos = Record<string, number>;

const app = document.getElementById("app")!;
const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }); // troque se não for dinheiro
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function buscar(query: string): Promise<Leitura[]> {
  const r = await fetch(`${URL_API}/rest/v1/leituras?${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Transforma { financeiro: { pago: 1 }, inicio_mes: 2 } em { "financeiro.pago": 1, "inicio_mes": 2 }
// Assim, se os campos mudarem, o site continua funcionando sozinho.
function achatar(obj: unknown, prefixo = "", out: Campos = {}): Campos {
  if (typeof obj === "number") out[prefixo] = obj;
  else if (obj && typeof obj === "object")
    for (const [k, v] of Object.entries(obj)) achatar(v, prefixo ? `${prefixo}.${k}` : k, out);
  return out;
}

function variacao(atual: number, anterior?: number): string {
  if (anterior === undefined || atual === anterior) return "";
  const d = atual - anterior;
  return `<span class="${d > 0 ? "up" : "down"}">${d > 0 ? "▲ +" : "▼ "}${fmt.format(d)}</span>`;
}

async function telaLista() {
  const leituras = await buscar("select=*&order=coletado_em.desc&limit=1000");
  const porUnidade = new Map<string, Leitura[]>();
  for (const l of leituras) {
    const lista = porUnidade.get(l.unidade) ?? [];
    if (lista.length < 2) lista.push(l);
    porUnidade.set(l.unidade, lista);
  }
  if (!porUnidade.size) { app.innerHTML = "<p>Ainda não há dados coletados.</p>"; return; }

  const ultima = leituras[0].coletado_em;
  app.innerHTML = `
    <h1>Monitor de unidades</h1>
    <div class="mut">Última coleta: ${dataHora(ultima)} · variação em relação à coleta anterior</div>
    <div class="grid">
      ${[...porUnidade.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([nome, [atual, anterior]]) => {
        const a = achatar(atual.dados);
        const p = anterior ? achatar(anterior.dados) : {};
        return `<a class="card" href="#/${encodeURIComponent(nome)}">
          <h2>${esc(nome)}</h2>
          ${Object.entries(a).map(([k, v]) =>
            `<div class="linha"><span class="mut">${esc(k)}</span><span>${fmt.format(v)} ${variacao(v, p[k])}</span></div>`).join("")}
          <div class="mut" style="margin-top:8px">${dataHora(atual.coletado_em)}</div>
        </a>`;
      }).join("")}
    </div>`;
}

async function telaUnidade(nome: string) {
  const leituras = await buscar(`unidade=eq.${encodeURIComponent(nome)}&order=coletado_em.desc&limit=1000`);
  if (!leituras.length) { app.innerHTML = `<a class="voltar" href="#/">← voltar</a><p>Sem dados.</p>`; return; }

  const linhas = leituras.map((l) => achatar(l.dados));
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
  app.innerHTML = `
    <a class="voltar" href="#/">← voltar</a>
    <h1>${esc(nome)}</h1>
    <div class="mut">${leituras.length} coletas · mais recente primeiro</div>
    <div class="scroll"><table>
      <thead><tr><th>Horário</th>${colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${leituras.map((l, i) => `<tr>
        <td>${dataHora(l.coletado_em)}</td>
        ${colunas.map((c) => {
          const v = linhas[i][c];
          return `<td>${v === undefined ? "—" : fmt.format(v)} ${v === undefined ? "" : variacao(v, linhas[i + 1]?.[c])}</td>`;
        }).join("")}
      </tr>`).join("")}</tbody>
    </table></div>`;
}

async function rota() {
  try {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    await (h ? telaUnidade(h) : telaLista());
  } catch (e) {
    app.innerHTML = `<p class="down">Erro ao carregar: ${esc(String(e))}</p>`;
  }
}

window.addEventListener("hashchange", rota);
rota();
