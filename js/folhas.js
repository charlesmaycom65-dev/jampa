// Janelas que sobem de baixo: mapa com rota, galeria de fotos e plano B do WhatsApp.
import { escapar, textoKm, textoTrajeto } from "./cartao.js";
import { linkGoogle, montarComentarios, prepararGoogle } from "./google.js";
import { HOTEL } from "./topicos.js";

const folha = document.getElementById("folha");
const titulo = document.getElementById("folha-titulo");
const corpo = document.getElementById("folha-corpo");
let aoFechar = null;

export function abrirFolha(textoTitulo, html, depois) {
  titulo.textContent = textoTitulo;
  corpo.innerHTML = html;
  folha.hidden = false;
  document.body.style.overflow = "hidden";
  corpo.scrollTop = 0;
  aoFechar = depois?.() || null;
}

export function fecharFolha() {
  aoFechar?.();
  aoFechar = null;
  folha.hidden = true;
  corpo.replaceChildren();
  document.body.style.overflow = "";
}

folha.addEventListener("click", (evento) => {
  if (evento.target.closest("[data-fechar]")) fecharFolha();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !folha.hidden) fecharFolha();
});

let leaflet = null;
function carregarLeaflet() {
  if (leaflet) return leaflet;
  leaflet = new Promise((resolver, rejeitar) => {
    const estilo = document.createElement("link");
    estilo.rel = "stylesheet";
    estilo.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.append(estilo);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => resolver(window.L);
    script.onerror = () => rejeitar(new Error("mapa não carregou"));
    document.head.append(script);
  });
  return leaflet;
}

const temPonto = (lugar) => Number.isFinite(lugar.lat) && Number.isFinite(lugar.lng);

function linkRota(lugar) {
  const destino = temPonto(lugar) ? `${lugar.lat},${lugar.lng}` : encodeURIComponent(`${lugar.nome}, Paraíba`);
  const cadastro = lugar.place_id ? `&destination_place_id=${lugar.place_id}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${HOTEL.lat},${HOTEL.lng}&destination=${destino}${cadastro}&travelmode=driving`;
}

export function abrirMapa(lugar) {
  const rota = lugar.rota;
  abrirFolha(lugar.nome, `
    <div id="mapa" class="mapa" role="img" aria-label="Mapa com a rota do hotel até ${escapar(lugar.nome)}"></div>
    <p class="mapa__fatos"><b>${escapar([textoKm(lugar), textoTrajeto(lugar)].filter(Boolean).join(" · "))}</b>
      <small>Saindo do hotel (Av. Cabo Branco, 1262), sem contar trânsito.</small></p>
    <p class="mapa__legenda"><span><i></i>Hotel</span><span><i></i>Destino</span></p>
    <div class="folha__linha">
      <a class="botao botao--escuro" href="${linkRota(lugar)}" target="_blank" rel="noopener">Abrir rota no Google Maps</a>
    </div>`, () => {
    let mapa = null;
    let cancelado = false;
    if (!temPonto(lugar)) {
      document.getElementById("mapa").textContent = "Mapa indisponível para este lugar. Use o botão abaixo.";
      return null;
    }
    carregarLeaflet().then((L) => {
      if (cancelado) return;
      mapa = L.map("mapa", { zoomControl: false, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · rota OSRM',
      }).addTo(mapa);
      const hotel = [HOTEL.lat, HOTEL.lng];
      const destino = [lugar.lat, lugar.lng];
      L.circleMarker(hotel, { radius: 9, color: "#fff", weight: 2, fillColor: "#e76f51", fillOpacity: 1 }).addTo(mapa).bindPopup("Hotel");
      L.circleMarker(destino, { radius: 9, color: "#fff", weight: 2, fillColor: "#0e7c86", fillOpacity: 1 }).addTo(mapa).bindPopup(escapar(lugar.nome));
      const linha = rota?.linha?.length ? rota.linha : [hotel, destino];
      const caminho = L.polyline(linha, { color: "#0e7c86", weight: 5, opacity: .85 }).addTo(mapa);
      mapa.fitBounds(caminho.getBounds().pad(.15));
    }).catch(() => {
      document.getElementById("mapa")?.replaceChildren(document.createTextNode("Mapa indisponível agora. Use o botão abaixo."));
    });
    return () => { cancelado = true; mapa?.remove(); };
  });
}

function galeriaPropria(lugar) {
  const quantidade = lugar.fotos.length;
  abrirFolha(lugar.nome, `
    <div class="galeria" id="galeria">
      ${lugar.fotos.map((foto) => `
        <figure>
          <img src="${foto.arquivo}" alt="${escapar(lugar.nome)}" loading="lazy">
          <figcaption>Foto: ${escapar(foto.autor)} · ${escapar(foto.licenca)} · <a href="${escapar(foto.pagina)}" target="_blank" rel="noopener">fonte</a></figcaption>
        </figure>`).join("")}
    </div>
    <p class="galeria__conta" id="galeria-conta">1 de ${quantidade}${quantidade > 1 ? " · deslize para o lado" : ""}</p>`, () => {
    const galeria = document.getElementById("galeria");
    const conta = document.getElementById("galeria-conta");
    const marcar = () => {
      const atual = Math.round(galeria.scrollLeft / galeria.clientWidth) + 1;
      conta.textContent = `${atual} de ${quantidade}`;
    };
    galeria.addEventListener("scroll", marcar, { passive: true });
    return () => galeria.removeEventListener("scroll", marcar);
  });
}

function galeriaGoogle(lugar) {
  abrirFolha(lugar.nome, `
    <p class="nota">Fotos do Google. Toque em uma foto para abrir em tela cheia e deslizar.</p>
    <div id="fotos-google"></div>`, () => {
    prepararGoogle().then(() => {
      const bloco = document.createElement("gmp-place-details");
      bloco.innerHTML = `
        <gmp-place-details-place-request place="${lugar.place_id}"></gmp-place-details-place-request>
        <gmp-place-media lightbox-preferred></gmp-place-media>
        <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>`;
      document.getElementById("fotos-google")?.append(bloco);
    }).catch(() => {
      document.getElementById("fotos-google")?.append("Fotos indisponíveis agora.");
    });
  });
}

export function abrirComentarios(lugar) {
  abrirFolha(lugar.nome, `
    <p class="nota">Comentários reais do Google, na ordem que o Google mostra.</p>
    <div id="comentarios-google" class="comentarios"></div>
    <div class="folha__linha"><a class="botao" href="${linkGoogle(lugar)}" target="_blank" rel="noopener">Ver todos no Google</a></div>`, () => {
    prepararGoogle().then(() => {
      document.getElementById("comentarios-google")?.append(montarComentarios(lugar));
    }).catch(() => {
      document.getElementById("comentarios-google")?.append("Comentários indisponíveis agora.");
    });
  });
}

export function abrirFotos(lugar) {
  if (lugar.fotos.length) return galeriaPropria(lugar);
  if (lugar.place_id) return galeriaGoogle(lugar);
  abrirFolha(lugar.nome, '<p class="nota">Ainda não temos fotos deste lugar.</p>');
}
