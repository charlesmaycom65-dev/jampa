// Bloco do Google (Places UI Kit). Os dados aparecem ao vivo e nada é guardado, como pedem os Termos.
// Cada bloco custa uma consulta, então só nasce quando o cartão chega perto da tela.
import { GOOGLE_MAPS_KEY } from "./google-config.js";

let carregando = null;

function carregarMaps() {
  if (carregando) return carregando;
  carregando = new Promise((resolver, rejeitar) => {
    const parametros = new URLSearchParams({
      key: GOOGLE_MAPS_KEY, v: "weekly", libraries: "places", language: "pt-BR",
      region: "BR", loading: "async", callback: "__mapsPronto",
    });
    window.__mapsPronto = () => google.maps.importLibrary("places").then(resolver, rejeitar);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${parametros}`;
    script.async = true;
    script.onerror = () => rejeitar(new Error("Google Maps não carregou"));
    document.head.append(script);
  });
  return carregando;
}

export const linkGoogle = (lugar) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.nome)}&query_place_id=${lugar.place_id}`;

function aviso(lugar) {
  const caixa = document.createElement("p");
  caixa.className = "sem-google";
  caixa.innerHTML = `Avaliações indisponíveis agora. <a href="${linkGoogle(lugar)}" target="_blank" rel="noopener">Ver no Google</a>`;
  return caixa;
}

export function montarBloco(lugar, comFotos) {
  const bloco = document.createElement("gmp-place-details");
  bloco.innerHTML = `
    <gmp-place-details-place-request place="${lugar.place_id}"></gmp-place-details-place-request>
    ${comFotos ? '<gmp-place-media lightbox-preferred></gmp-place-media>' : ""}
    <gmp-place-rating></gmp-place-rating>
    <gmp-place-price></gmp-place-price>
    <gmp-place-open-now-status></gmp-place-open-now-status>
    <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>`;
  bloco.addEventListener("gmp-error", () => bloco.replaceWith(aviso(lugar)));
  return bloco;
}

// Comentários ficam fechados no cartão: cada abertura custa uma consulta, só de quem tocar.
export function montarComentarios(lugar) {
  const bloco = document.createElement("gmp-place-details");
  bloco.innerHTML = `
    <gmp-place-details-place-request place="${lugar.place_id}"></gmp-place-details-place-request>
    <gmp-place-rating></gmp-place-rating>
    <gmp-place-reviews></gmp-place-reviews>
    <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>`;
  bloco.addEventListener("gmp-error", () => bloco.replaceWith(aviso(lugar)));
  return bloco;
}

const pendentes = new WeakMap();
const vigia = new IntersectionObserver((entradas) => {
  for (const entrada of entradas) {
    if (!entrada.isIntersecting) continue;
    vigia.unobserve(entrada.target);
    const { lugar, comFotos, alvo } = pendentes.get(entrada.target);
    carregarMaps()
      .then(() => alvo.replaceChildren(montarBloco(lugar, comFotos)))
      .catch(() => alvo.replaceChildren(aviso(lugar)));
  }
}, { rootMargin: "500px 0px" });

export function observarBloco(cartao, lugar, comFotos, alvo) {
  pendentes.set(cartao, { lugar, comFotos, alvo });
  vigia.observe(cartao);
}

export const prepararGoogle = carregarMaps;
