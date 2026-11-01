// Cartão de um lugar: foto, nome, bloco do Google, valor, distância, horário e botões.
import { observarBloco } from "./google.js";

export const escapar = (texto) => {
  const caixa = document.createElement("div");
  caixa.textContent = texto ?? "";
  return caixa.innerHTML;
};

export function textoKm(lugar) {
  const rota = lugar.rota;
  if (!rota) return "Distância a confirmar";
  if (rota.km < 0.2) return "Em frente ao hotel";
  const cerca = lugar.ponto === "aproximado" ? "cerca de " : "";
  return `${cerca}${rota.km.toLocaleString("pt-BR")} km do hotel`;
}

export function textoTrajeto(lugar) {
  const rota = lugar.rota;
  if (!rota || rota.km < 0.2) return null;
  const partes = [];
  if (rota.min > 0) partes.push(`${rota.min} min de carro`);
  if (rota.pe_min) partes.push(`${rota.pe_min} min a pé`);
  return partes.join(" · ") || null;
}

function textoValor(lugar) {
  if (lugar.valor) return { texto: lugar.valor, ref: lugar.valor_ref };
  if (lugar.faixa_google) return { texto: "Por pessoa: o R$ junto das estrelas, acima", ref: null, faixa: true };
  return { texto: "Valor a confirmar", ref: null };
}

function htmlFatos(lugar) {
  const valor = textoValor(lugar);
  const horario = [lugar.horario, lugar.fecha].filter(Boolean).join(" · ");
  const trajeto = textoTrajeto(lugar);
  return `
    <dl class="fatos">
      <div class="fato ${valor.faixa ? "fato--faixa" : ""}"><dt>Valor</dt><dd>${escapar(valor.texto)}${valor.ref ? `<small>${escapar(valor.ref)}</small>` : ""}</dd></div>
      ${trajeto ? `<div class="fato"><dt>Do hotel</dt><dd>${escapar(trajeto)}</dd></div>` : ""}
      ${horario ? `<div class="fato"><dt>Horário</dt><dd>${escapar(horario)}</dd></div>` : ""}
    </dl>`;
}

function htmlBotoes(lugar) {
  const extras = [
    '<button class="botao" type="button" data-acao="mapa">Mapa</button>',
    '<button class="botao" type="button" data-acao="fotos">Fotos</button>',
  ];
  if (lugar.menu) extras.push(`<a class="botao" href="${escapar(lugar.menu)}" target="_blank" rel="noopener">Menu</a>`);
  if (lugar.instagram) extras.push(`<a class="botao" href="${escapar(lugar.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
  return `
    <div class="acoes">${extras.join("")}</div>
    <div class="cartao__voto"><button class="botao botao--votar" type="button" data-acao="votar">Votar</button></div>`;
}

export function criarCartao(lugar, aoAgir) {
  const capa = lugar.fotos[0];
  const cartao = document.createElement("article");
  cartao.className = capa ? "cartao" : "cartao cartao--sem-capa";
  cartao.dataset.id = lugar.id;
  const texto = `<p class="cartao__texto">${escapar(lugar.texto)}</p>`;
  cartao.innerHTML = `
    ${capa ? `
      <figure class="cartao__capa">
        <img src="${capa.arquivo}" alt="${escapar(lugar.nome)}" loading="lazy" decoding="async">
        <figcaption class="cartao__credito">Foto: ${escapar(capa.autor)} · ${escapar(capa.licenca)}</figcaption>
      </figure>` : ""}
    <div class="cartao__cabeca">
      <div class="cartao__selos"></div>
      <p class="cartao__area">${escapar(lugar.area)}<b>${escapar(textoKm(lugar))}</b></p>
      <h4 class="cartao__nome">${escapar(lugar.nome)}</h4>
      ${capa ? texto : ""}
    </div>
    ${lugar.place_id ? `
      <div class="cartao__google"><div class="cartao__reserva"></div></div>
      <div class="cartao__mais">
        <button type="button" data-acao="comentarios">Ver comentários</button>
      </div>` : ""}
    ${capa ? "" : texto}
    ${htmlFatos(lugar)}
    ${lugar.dica ? `<p class="dica">${escapar(lugar.dica)}</p>` : ""}
    ${lugar.alertas.map((alerta) => `<p class="alerta">${escapar(alerta)}</p>`).join("")}
    <p class="votantes"></p>
    ${htmlBotoes(lugar)}`;

  cartao.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) return;
    aoAgir(botao.dataset.acao, lugar);
  });
  if (lugar.place_id) {
    observarBloco(cartao, lugar, !capa, cartao.querySelector(".cartao__reserva"));
  }
  return cartao;
}

export function pintarVotos(cartao, lugar, { nomes, meu, lider }) {
  cartao.classList.toggle("cartao--votado", meu);
  const botao = cartao.querySelector("[data-acao=votar]");
  botao.classList.toggle("botao--votado", meu);
  botao.textContent = meu ? "✓ Votado" : "Votar";
  botao.setAttribute("aria-pressed", String(meu));
  cartao.querySelector(".cartao__selos").innerHTML = [
    lider ? '<span class="selo selo--lider">Mais votado da lista</span>' : "",
    lugar.mare ? '<span class="selo selo--mare">Só com maré baixa</span>' : "",
  ].join("");
  cartao.querySelector(".votantes").innerHTML = nomes.length
    ? `<b>${nomes.length} ${nomes.length === 1 ? "voto" : "votos"}</b> ${nomes.map((n) => `<span>${escapar(n)}</span>`).join("")}`
    : "";
}
