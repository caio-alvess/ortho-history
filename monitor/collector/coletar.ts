type Unidade = {
  unidade: string;
  financeiro: { pago: number; receber: number; previsao: number };
  inicio_mes: number;
};

async function buscarDados(): Promise<Unidade[]> {
  // ====================================================
  //  >>> COLOQUE AQUI O SEU CÓDIGO QUE BUSCA OS DADOS <<<
  //  Deve retornar um array de objetos no formato Unidade.
  //  (Se a estrutura mudar, ajuste o tipo acima; o site se adapta.)
  // ====================================================

  // Modo teste: DEMO=1 npm run coletar  (gera dados falsos)
  if (process.env.DEMO === "1") {
    const r = () => Math.round(Math.random() * 100000) / 100;
    return ["Unidade X", "Unidade Y", "Unidade Z"].map((unidade) => ({
      unidade,
      financeiro: { pago: r(), receber: r(), previsao: r() },
      inicio_mes: r(),
    }));
  }
  throw new Error("buscarDados() ainda não foi implementada");
}

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_KEY!;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function main() {
  const dados = await buscarDados();
  const linhas = dados.map(({ unidade, ...resto }) => ({ unidade, dados: resto }));

  const ins = await fetch(`${URL}/rest/v1/leituras`, {
    method: "POST",
    headers,
    body: JSON.stringify(linhas),
  });
  if (!ins.ok) throw new Error(`Falha ao gravar: ${await ins.text()}`);
  console.log(`${linhas.length} unidades gravadas`);

  // Validade de 6 meses: apaga o que for mais velho
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 6);
  const del = await fetch(
    `${URL}/rest/v1/leituras?coletado_em=lt.${limite.toISOString()}`,
    { method: "DELETE", headers },
  );
  if (!del.ok) throw new Error(`Falha ao limpar: ${await del.text()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
