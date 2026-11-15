// Tela do placar: ranking ao vivo do que o grupo votou, por dia e por tipo de lugar.
// Só lê os votos. Quem vota é a tela principal (app.js).
// Tocar num item abre o mesmo cartão da tela de votar (cartao.js), sem o botão Votar.
import { criarCartao, escapar } from "./cartao.js";
import { abrirComentarios, abrirFotos, abrirMapa } from "./folhas.js";
import { DIAS, juntarVotos, ranking } from "./placar.js";
import { TOPICOS } from "./topicos.js";

const el = (id) => document.getElementById(id);

function lerImportados() {
  try { return JSON.parse(localStorage.getItem("jampa_importados")) ?? {}; } catch { return {}; }
}

const estado = {
  lugares: [], porId: new Map(), cartoes: new Map(),
  aoVivo: {}, importados: lerImportados(),
  dia: null, topico: null, aberto: null, carregou: false, falhou: false,
};
const topicoDe = new Map(TOPICOS.map((topico) => [topico.chave, topico]));

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const inicial = (nome) => (nome.trim()[0] || "?").toUpperCase();
const textoDias = (dias) => (dias.length === 1 ? `dia ${dias[0]}` : `dias ${dias.slice(0, -1).join(", ")} e ${dias.at(-1)}`);
const pessoas = () => juntarVotos(estado.aoVivo, estado.importados);

function pintarPessoas(grupo) {
  const lista = [...grupo.values()]
    .map((pessoa) => ({ nome: pessoa.nome, votos: DIAS.reduce((soma, dia) => soma + Object.keys(pessoa.dias[dia] || {}).length, 0) }))
    .filter((pessoa) => pessoa.votos > 0)
    .sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  el("placar-total").textContent = lista.length ? ` · Já votaram: ${lista.length}` : "";
  el("placar-pessoas").innerHTML = lista
    .map((pessoa) => `<li class="pessoa"><i aria-hidden="true">${escapar(inicial(pessoa.nome))}</i><span><b>${escapar(pessoa.nome)}</b><small>${plural(pessoa.votos, "voto", "votos")}</small></span></li>`)
    .join("");
  el("placar-quem").hidden = !lista.length;
}

function miniatura(lugar) {
  const foto = lugar.fotos?.[0]?.arquivo;
  if (foto) return `<img src="${escapar(foto)}" alt="" width="64" height="64" loading="lazy">`;
  return `<span aria-hidden="true">${topicoDe.get(lugar.topico)?.icone || "📍"}</span>`;
}

const seta = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function posto(item, maximo) {
  const { lugar, votos, quem, posicao } = item;
  const topico = topicoDe.get(lugar.topico);
  const nomes = [...quem.entries()]
    .map(([nome, dias]) => `<li><i aria-hidden="true">${escapar(inicial(nome))}</i>${escapar(nome)}${estado.dia ? "" : `<small>${textoDias(dias)}</small>`}</li>`)
    .join("");
  return `
    <li class="posto${votos === maximo ? " posto--lider" : ""}" data-id="${escapar(lugar.id)}" data-topico="${escapar(lugar.topico)}">
      <div class="posto__resumo">
        <div class="posto__foto">${miniatura(lugar)}<b class="posto__num">${posicao}º</b></div>
        <div class="posto__corpo">
          <div class="posto__linha">
            <h3>${escapar(lugar.nome)}</h3>
            <span class="posto__votos"><b>${votos}</b> ${votos === 1 ? "voto" : "votos"}</span>
          </div>
          <p class="posto__meta">${topico ? `${topico.icone} ${escapar(topico.nome)} · ` : ""}${escapar(lugar.area)}</p>
          <div class="posto__barra" aria-hidden="true"><i style="width:${Math.round((votos / maximo) * 100)}%"></i></div>
          <ul class="quem" aria-label="Quem votou">${nomes}</ul>
          <button class="posto__abrir" type="button" aria-expanded="false"><span>Ver detalhes</span>${seta}</button>
        </div>
      </div>
      <div class="posto__detalhe"></div>
    </li>`;
}

function agir(acao, lugar) {
  if (acao === "mapa") abrirMapa(lugar);
  if (acao === "fotos") abrirFotos(lugar);
  if (acao === "comentarios") abrirComentarios(lugar);
}

// O cartão é guardado e reaproveitado: recriar custaria outra consulta ao Google a cada voto que chega.
function cartaoDe(id) {
  if (!estado.cartoes.has(id)) estado.cartoes.set(id, criarCartao(estado.porId.get(id), agir));
  return estado.cartoes.get(id);
}

// Deixa a lista igual a `estado.aberto`: um item aberto por vez, com o cartão completo dentro.
function aplicarAberto() {
  for (const item of el("placar-lista").children) {
    const aberto = item.dataset.id === estado.aberto;
    item.classList.toggle("posto--aberto", aberto);
    const botao = item.querySelector(".posto__abrir");
    botao.setAttribute("aria-expanded", String(aberto));
    botao.querySelector("span").textContent = aberto ? "Fechar detalhes" : "Ver detalhes";
    const caixa = item.querySelector(".posto__detalhe");
    if (!aberto) caixa.replaceChildren();
    else if (cartaoDe(item.dataset.id).parentElement !== caixa) caixa.append(cartaoDe(item.dataset.id));
  }
}

function pintarLista(grupo) {
  const lugares = estado.topico ? estado.lugares.filter((lugar) => lugar.topico === estado.topico) : estado.lugares;
  const lista = ranking(lugares, grupo, estado.dia);
  const onde = estado.dia ? `Dia ${estado.dia}` : "Geral";
  const recorte = estado.topico ? ` · ${topicoDe.get(estado.topico).nome}` : "";
  el("placar-onde").textContent = `${onde}${recorte}`;
  el("placar-nota").textContent = estado.dia
    ? "No empate, vale a ordem do dia: praia, passeio, almoço, lounge e noite."
    : "Geral soma os 7 dias: cada dia em que a pessoa escolheu o lugar conta 1 voto. No empate, vem antes o dia mais cedo e, no mesmo dia, a ordem praia, passeio, almoço, lounge e noite.";
  el("placar-conta").innerHTML = lista.length ? `<b>${lista.length}</b> ${lista.length === 1 ? "lugar com voto" : "lugares com voto"}` : "";
  const vazio = el("placar-vazio");
  vazio.hidden = lista.length > 0;
  if (!lista.length) {
    vazio.textContent = estado.falhou ? "Não foi possível carregar os votos. Recarregue a página."
      : !estado.carregou ? "Carregando os votos."
      : estado.dia || estado.topico ? "Nenhum voto aqui ainda. Tente outro dia ou outra lista."
      : "Ninguém votou ainda.";
  }
  el("placar-lista").innerHTML = lista.map((item) => posto(item, lista[0].votos)).join("");
  aplicarAberto();
}

function pintar() {
  const grupo = pessoas();
  pintarPessoas(grupo);
  pintarLista(grupo);
}

function montarFiltro(id, opcoes, campo) {
  const caixa = el(id);
  caixa.innerHTML = opcoes
    .map(([valor, rotulo]) => `<button type="button" data-valor="${valor ?? ""}" aria-pressed="${estado[campo] === valor}">${rotulo}</button>`)
    .join("");
  caixa.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button");
    if (!botao) return;
    const bruto = botao.dataset.valor;
    estado[campo] = bruto === "" ? null : campo === "dia" ? Number(bruto) : bruto;
    caixa.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === botao)));
    pintarLista(pessoas());
  });
}

function ligarLista() {
  el("placar-lista").addEventListener("click", (evento) => {
    const resumo = evento.target.closest(".posto__resumo");
    if (!resumo) return;
    const item = resumo.parentElement;
    estado.aberto = estado.aberto === item.dataset.id ? null : item.dataset.id;
    aplicarAberto();
    if (estado.aberto) item.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function marcarConexao(ok) {
  el("ponto-vivo").className = `ponto${ok ? " ponto--vivo" : ""}`;
  el("texto-vivo").textContent = ok ? "Ao vivo" : estado.carregou || estado.falhou ? "Sem conexão" : "Conectando";
}

function falhar() {
  if (estado.carregou) return marcarConexao(false);
  estado.falhou = true;
  marcarConexao(false);
  pintar();
}

async function iniciar() {
  montarFiltro("filtro-dias", [[null, "Geral"], ...DIAS.map((dia) => [dia, `Dia ${dia}`])], "dia");
  montarFiltro("filtro-topicos", [[null, "Tudo"], ...TOPICOS.map((topico) => [topico.chave, `${topico.icone} ${topico.nome}`])], "topico");
  ligarLista();
  pintar();
  const resposta = await fetch("data/lugares.json");
  if (!resposta.ok) throw new Error("dados não carregaram");
  estado.lugares = await resposta.json();
  estado.porId = new Map(estado.lugares.map((lugar) => [lugar.id, lugar]));
  const { iniciarVotos } = await import("./votos.js");
  iniciarVotos({
    aoMudarVotos(todos) {
      estado.aoVivo = todos;
      estado.carregou = true;
      estado.falhou = false;
      pintar();
    },
    aoMudarConexao: marcarConexao,
    aoFalhar: falhar,
  });
  setTimeout(() => { if (!estado.carregou) falhar(); }, 8000);
}

iniciar().catch((erro) => {
  console.error("Falha ao abrir o placar:", erro);
  falhar();
});
