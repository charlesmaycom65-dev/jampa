// Plano B: mandar os votos pelo WhatsApp e somar no placar, caso a votação ao vivo falhe.
import { abrirFolha } from "./folhas.js";
import { escapar } from "./cartao.js";
import { DIAS, gerarCodigo, lerCodigos } from "./placar.js";
import { TOPICOS } from "./topicos.js";

function mensagem(nome, dias, porId) {
  let texto = `🏖️ Meus votos · Jampa 7 dias (${nome})\n`;
  for (const dia of DIAS) {
    const ids = Object.keys(dias[dia] || {});
    if (!ids.length) continue;
    texto += `\n*Dia ${dia}*\n`;
    for (const topico of TOPICOS) {
      const nomes = ids.filter((id) => porId.get(id)?.topico === topico.chave).map((id) => porId.get(id).nome);
      if (nomes.length) texto += `${topico.icone} ${nomes.join(", ")}\n`;
    }
  }
  return `${texto}\nCódigo do placar (não apague):\n${gerarCodigo(nome, dias)}`;
}

export function abrirPlanoB({ nome, meusDias, porId, aoImportar, avisar }) {
  const temVotos = Object.values(meusDias).some((ids) => Object.keys(ids).length);
  const texto = nome && temVotos ? mensagem(nome, meusDias, porId) : "";
  abrirFolha("Votar pelo WhatsApp", `
    <p class="nota">Use só se a votação ao vivo falhar. Seus votos vão para o grupo como mensagem.</p>
    <h4>Enviar meus votos</h4>
    ${texto ? `
      <textarea id="plano-texto" readonly>${escapar(texto)}</textarea>
      <div class="folha__linha">
        <a class="botao botao--verde" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto)}">Abrir no WhatsApp</a>
        <button class="botao" id="plano-copiar" type="button">Copiar</button>
      </div>` : '<p class="nota">Salve seu nome e marque pelo menos um voto para gerar a mensagem.</p>'}
    <div class="folha__secao">
      <h4>Placar do grupo</h4>
      <p class="nota">Cole aqui as mensagens que o pessoal mandou. O painel soma tudo neste celular.</p>
      <textarea id="plano-colar" placeholder="Cole as mensagens aqui"></textarea>
      <div class="folha__linha"><button class="botao botao--escuro" id="plano-somar" type="button">Somar votos</button></div>
    </div>`, () => {
    document.getElementById("plano-copiar")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(texto);
        avisar("Copiado. Agora cole no grupo.");
      } catch {
        document.getElementById("plano-texto").select();
        avisar("Selecione o texto e copie.");
      }
    });
    document.getElementById("plano-somar").addEventListener("click", () => {
      const caixa = document.getElementById("plano-colar");
      const achados = lerCodigos(caixa.value, new Set(porId.keys()));
      if (!achados.length) return avisar("Não achei votos nesse texto. Cole a mensagem inteira.");
      aoImportar(achados);
      caixa.value = "";
      avisar(`Votos de ${achados.length} ${achados.length === 1 ? "pessoa somados" : "pessoas somados"}.`);
    });
  });
}
