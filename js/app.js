// Monta o painel: dias, tópicos, cartões, votos ao vivo e plano B.
import { pintarVotos, criarCartao, escapar } from "./cartao.js";
import { abrirComentarios, abrirFotos, abrirMapa } from "./folhas.js";
import { DIAS, juntarVotos, liderDoTopico, liderNoCartao, nomesPorLugar, normalizarDias } from "./placar.js";
import { abrirPlanoB } from "./plano-b.js";
import { TOPICOS } from "./topicos.js";

const guardar = {
  ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* navegador sem armazenamento: segue na memória */ }
  },
};

const estado = {
  lugares: [], porId: new Map(), cartoes: new Map(),
  nome: guardar.ler("jampa_nome", ""),
  meusDias: normalizarDias(guardar.ler("jampa_votos", {})),
  importados: guardar.ler("jampa_importados", {}),
  aoVivo: {}, ordem: "perto", aberto: null, aoVivoOk: false,
};
let votos = null;

const el = (id) => document.getElementById(id);

let relogio;
function avisar(texto) {
  const caixa = el("aviso-rapido");
  caixa.textContent = texto;
  caixa.classList.add("aviso-rapido--on");
  clearTimeout(relogio);
  relogio = setTimeout(() => caixa.classList.remove("aviso-rapido--on"), 2800);
}

const pessoas = () => {
  const aoVivo = { ...estado.aoVivo };
  const meuId = votos?.meuId();
  if (estado.nome) aoVivo[meuId || "eu"] = { nome: estado.nome, dias: estado.meusDias };
  return juntarVotos(aoVivo, estado.importados);
};

const lugaresDoTopico = (chave) => estado.lugares.filter((l) => l.topico === chave);
const distancia = (lugar) => lugar.rota?.km ?? 9999;

function ordenados(chave, contagem) {
  const lista = [...lugaresDoTopico(chave)];
  if (estado.ordem === "votos") {
    return lista.sort((a, b) => (contagem.get(b.id) || []).length - (contagem.get(a.id) || []).length || distancia(a) - distancia(b));
  }
  return lista.sort((a, b) => distancia(a) - distancia(b));
}

function pintarAberto() {
  if (!estado.aberto) return;
  const { dia, chave, lista } = estado.aberto;
  const contagem = nomesPorLugar(pessoas(), dia);
  const lider = liderDoTopico(lugaresDoTopico(chave), contagem);
  for (const lugar of ordenados(chave, contagem)) {
    const cartao = estado.cartoes.get(lugar.id) || novoCartao(lugar);
    if (estado.ordem === "votos" || cartao.parentElement !== lista) lista.append(cartao);
    const nomes = contagem.get(lugar.id) || [];
    pintarVotos(cartao, lugar, {
      nomes,
      meu: Boolean(estado.meusDias[dia]?.[lugar.id]),
      lider: liderNoCartao(lider, nomes),
    });
  }
}

function novoCartao(lugar) {
  const cartao = criarCartao(lugar, agir);
  estado.cartoes.set(lugar.id, cartao);
  return cartao;
}

function pintarResumo() {
  const grupo = pessoas();
  const votantes = [...grupo.values()].filter((p) => Object.values(p.dias).some((ids) => Object.keys(ids).length));
  const n = votantes.length;
  el("total-pessoas").textContent = n ? ` · Já votaram: ${n}` : "";
  const total = Object.values(estado.meusDias).reduce((soma, ids) => soma + Object.keys(ids).length, 0);
  const pendente = !estado.aoVivoOk && estado.jaConectou ? " · não enviados" : "";
  el("meus-votos").innerHTML = `Seus votos: <b>${total}</b>${pendente}`;
  document.querySelectorAll("[data-dia-sanfona]").forEach((sanfona) => {
    const dia = sanfona.dataset.diaSanfona;
    const contagem = nomesPorLugar(grupo, dia);
    const selos = TOPICOS.map((topico) => {
      const lider = liderDoTopico(lugaresDoTopico(topico.chave), contagem);
      const rotulo = lider?.votos === 1 ? "1 voto" : `${lider?.votos} votos`;
      return lider ? `<span class="selo-lider">${topico.icone} ${escapar(lider.lugar.nome)} · ${rotulo}</span>` : "";
    }).join("");
    sanfona.querySelector(".dia__lideres").innerHTML = selos;
    const meus = Object.keys(estado.meusDias[dia] || {}).length;
    sanfona.querySelector("[data-sub]").textContent = meus ? `${meus} ${meus === 1 ? "voto seu" : "votos seus"}` : "Toque para ver as opções";
    sanfona.querySelectorAll("[data-topico]").forEach((topico) => {
      const quantos = Object.keys(estado.meusDias[dia] || {}).filter((id) => estado.porId.get(id)?.topico === topico.dataset.topico).length;
      const selo = topico.querySelector(".topico__meus");
      selo.hidden = !quantos;
      selo.textContent = quantos;
    });
  });
}

const pintarTudo = () => { pintarAberto(); pintarResumo(); };

async function votar(lugar) {
  if (!estado.nome) {
    avisar("Coloque seu nome primeiro.");
    el("campo-nome").focus();
    return;
  }
  const dia = estado.aberto.dia;
  const dias = estado.meusDias;
  const novo = !dias[dia]?.[lugar.id];
  dias[dia] = dias[dia] || {};
  if (novo) dias[dia][lugar.id] = true; else delete dias[dia][lugar.id];
  guardar.gravar("jampa_votos", dias);
  pintarTudo();
  try {
    await votos.salvar(estado.nome, dia, lugar.id, novo);
  } catch {
    // O voto fica neste celular para o WhatsApp funcionar, mas a barra avisa que não chegou ao grupo.
    estado.jaConectou = true;
    marcarConexao(false);
    avisar("Seu voto não chegou ao grupo. Toque em Deu erro? WhatsApp.");
  }
}

function agir(acao, lugar) {
  if (acao === "votar") votar(lugar);
  if (acao === "mapa") abrirMapa(lugar);
  if (acao === "fotos") abrirFotos(lugar);
  if (acao === "comentarios") abrirComentarios(lugar);
}

const seta = '<svg class="sanf__seta" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function alternar(sanfona, irmaos, aoAbrir) {
  const abrir = !sanfona.classList.contains("sanf--aberta");
  irmaos.querySelectorAll(":scope > .sanf--aberta").forEach((outra) => {
    outra.classList.remove("sanf--aberta");
    outra.querySelector(".sanf__cabeca").setAttribute("aria-expanded", "false");
  });
  sanfona.classList.toggle("sanf--aberta", abrir);
  sanfona.querySelector(".sanf__cabeca").setAttribute("aria-expanded", String(abrir));
  if (abrir) aoAbrir();
  return abrir;
}

function criarTopico(dia, topico, irmaos) {
  const sanfona = document.createElement("section");
  sanfona.className = "sanf sanf--topico";
  sanfona.dataset.topico = topico.chave;
  const total = lugaresDoTopico(topico.chave).length;
  sanfona.innerHTML = `
    <button class="sanf__cabeca" type="button" aria-expanded="false">
      <span class="topico__foto"><img src="${topico.foto}" alt="" loading="lazy"></span>
      <span class="topico__nome">${topico.nome}<small>Dia ${dia} · ${total} opções</small></span>
      <span class="topico__meus" hidden></span>${seta}
    </button>
    <div class="sanf__corpo"><div class="sanf__miolo">
      <div class="ordenar" role="group" aria-label="Ordenar">
        <button type="button" data-ordem="perto">Mais perto</button>
        <button type="button" data-ordem="votos">Mais votados</button>
      </div>
      <div class="cartoes"></div>
    </div></div>`;
  const lista = sanfona.querySelector(".cartoes");
  const marcarOrdem = () => sanfona.querySelectorAll("[data-ordem]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ordem === estado.ordem)));
  sanfona.querySelector(".sanf__cabeca").addEventListener("click", () => {
    const abriu = alternar(sanfona, irmaos, () => {
      estado.aberto = { dia, chave: topico.chave, lista };
      marcarOrdem();
      pintarAberto();
      setTimeout(() => sanfona.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    });
    if (!abriu) {
      estado.aberto = null;
      sanfona.scrollIntoView({ block: "start" });
    }
  });
  sanfona.querySelectorAll("[data-ordem]").forEach((botao) => botao.addEventListener("click", () => {
    estado.ordem = botao.dataset.ordem;
    marcarOrdem();
    const contagem = nomesPorLugar(pessoas(), dia);
    ordenados(topico.chave, contagem).forEach((lugar) => lista.append(estado.cartoes.get(lugar.id) || novoCartao(lugar)));
    pintarAberto();
  }));
  return sanfona;
}

function criarDias() {
  const caixa = el("dias");
  for (const dia of DIAS) {
    const sanfona = document.createElement("section");
    sanfona.className = "sanf sanf--dia";
    sanfona.dataset.diaSanfona = dia;
    sanfona.innerHTML = `
      <button class="sanf__cabeca" type="button" aria-expanded="false">
        <span class="dia__titulo"><strong>Dia ${dia}</strong><span data-sub></span></span>${seta}
      </button>
      <div class="dia__lideres"></div>
      <div class="sanf__corpo"><div class="sanf__miolo"><div class="topicos"></div></div></div>`;
    const topicos = sanfona.querySelector(".topicos");
    TOPICOS.forEach((topico) => topicos.append(criarTopico(dia, topico, topicos)));
    sanfona.querySelector(".sanf__cabeca").addEventListener("click", () => {
      const abriu = alternar(sanfona, caixa, () => {});
      topicos.querySelectorAll(":scope > .sanf--aberta").forEach((aberta) => {
        aberta.classList.remove("sanf--aberta");
        aberta.querySelector(".sanf__cabeca").setAttribute("aria-expanded", "false");
      });
      estado.aberto = null;
      if (abriu) setTimeout(() => sanfona.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    });
    caixa.append(sanfona);
  }
}

// O banco avisa "desconectado" antes de conectar: só vira erro depois da primeira conexão ou de 8 s.
function marcarConexao(ok) {
  if (ok) estado.jaConectou = true;
  estado.aoVivoOk = ok;
  el("ponto-vivo").classList.toggle("ponto--vivo", ok);
  if (ok || estado.jaConectou) {
    el("texto-vivo").textContent = ok ? "Ao vivo" : "Sem conexão com a votação";
    pintarResumo();
  }
}

function iniciarNome() {
  const campo = el("campo-nome");
  const caixa = el("entrada");
  const original = caixa.innerHTML;
  const recolher = () => {
    caixa.innerHTML = `<p class="entrada__salvo"><span>Votando como <b>${escapar(estado.nome)}</b></span><button id="trocar-nome" type="button">Trocar</button></p>`;
    el("trocar-nome").addEventListener("click", () => {
      caixa.innerHTML = original;
      iniciarNome();
      el("campo-nome").focus();
    });
  };
  campo.value = estado.nome;
  if (estado.nome && !caixa.dataset.editando) {
    caixa.dataset.editando = "1";
    recolher();
    return;
  }
  el("form-nome").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nome = el("campo-nome").value.replace(/[|;:\n]/g, " ").trim().slice(0, 24);
    if (!nome) return;
    estado.nome = nome;
    guardar.gravar("jampa_nome", nome);
    votos?.renomear(nome).catch(() => {});
    avisar("Nome salvo. Agora é só abrir um dia e votar.");
    recolher();
    pintarTudo();
  });
}

async function iniciar() {
  const resposta = await fetch("data/lugares.json");
  if (!resposta.ok) throw new Error("dados não carregaram");
  estado.lugares = await resposta.json();
  estado.porId = new Map(estado.lugares.map((lugar) => [lugar.id, lugar]));
  criarDias();
  iniciarNome();
  pintarResumo();
  el("abrir-plano-b").addEventListener("click", () => abrirPlanoB({
    nome: estado.nome, meusDias: estado.meusDias, porId: estado.porId, avisar,
    aoImportar(achados) {
      achados.forEach((voto) => { estado.importados[voto.nome.toLowerCase()] = voto; });
      guardar.gravar("jampa_importados", estado.importados);
      pintarTudo();
    },
  }));
  // Carregado depois da tela: se o Firebase cair, o painel abre e o plano B continua valendo.
  try {
    const { iniciarVotos } = await import("./votos.js");
    votos = iniciarVotos({
      aoMudarVotos(todos, meuId) {
        estado.aoVivo = todos;
        const meu = todos[meuId];
        if (meu) {
          estado.meusDias = normalizarDias(meu.dias);
          guardar.gravar("jampa_votos", estado.meusDias);
        }
        pintarTudo();
      },
      aoMudarConexao: marcarConexao,
      aoFalhar: () => marcarConexao(false),
    });
  } catch {
    estado.jaConectou = true;
    marcarConexao(false);
  }
  setTimeout(() => {
    if (estado.aoVivoOk) return;
    estado.jaConectou = true;
    marcarConexao(false);
  }, 8000);
}

iniciar().catch((erro) => {
  console.error("Falha ao abrir o painel:", erro);
  el("dias").textContent = "Não foi possível abrir o painel. Recarregue a página.";
});
