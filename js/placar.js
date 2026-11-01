// Regras do placar, sem tela nem rede: junta os votos e descobre os líderes.
export const DIAS = [1, 2, 3, 4, 5, 6, 7];

export const normalizar = (nome) => (nome || "").trim().toLowerCase();

// O Firebase devolve chaves numéricas como lista, com a posição 0 vazia: [null, {p1: true}].
// Quem lê votos do banco ou do celular precisa passar por aqui antes de usar.
export function normalizarDias(dias) {
  const limpo = {};
  for (const [dia, ids] of Object.entries(dias || {})) {
    if (ids && typeof ids === "object") limpo[dia] = ids;
  }
  return limpo;
}

// Quem votou em dois aparelhos com o mesmo nome conta como uma pessoa só.
export function juntarVotos(aoVivo, importados) {
  const pessoas = new Map();
  const somar = (nome, dias) => {
    const chave = normalizar(nome);
    if (!chave) return;
    const pessoa = pessoas.get(chave) || { nome, dias: {} };
    for (const [dia, ids] of Object.entries(normalizarDias(dias))) {
      pessoa.dias[dia] = { ...(pessoa.dias[dia] || {}), ...ids };
    }
    pessoas.set(chave, pessoa);
  };
  Object.values(aoVivo || {}).forEach((voto) => somar(voto.nome, voto.dias));
  Object.values(importados || {}).forEach((voto) => somar(voto.nome, voto.dias));
  return pessoas;
}

export function nomesPorLugar(pessoas, dia) {
  const contagem = new Map();
  for (const pessoa of pessoas.values()) {
    for (const id of Object.keys(pessoa.dias[dia] || {})) {
      if (!contagem.has(id)) contagem.set(id, []);
      contagem.get(id).push(pessoa.nome);
    }
  }
  return contagem;
}

// Em caso de empate, todos os mais votados contam; `lugar` é só o primeiro, para o resumo do dia.
export function liderDoTopico(lugares, contagem) {
  let lider = null;
  for (const lugar of lugares) {
    const votos = (contagem.get(lugar.id) || []).length;
    if (votos > 0 && (!lider || votos > lider.votos)) lider = { lugar, votos };
  }
  return lider;
}

export function liderNoCartao(lider, nomes) {
  return Boolean(lider) && nomes.length === lider.votos;
}

// Código do plano B: JP7|Nome|1:p1.l2;2:t3
export function gerarCodigo(nome, dias) {
  const partes = Object.entries(dias)
    .map(([dia, ids]) => [dia, Object.keys(ids)])
    .filter(([, ids]) => ids.length)
    .map(([dia, ids]) => `${dia}:${ids.join(".")}`);
  return `JP7|${nome}|${partes.join(";")}`;
}

export function lerCodigos(texto, idsValidos) {
  const achados = [];
  for (const [, nomeBruto, corpo] of texto.matchAll(/JP7\|([^|\n]{1,40})\|([0-9:.;a-z]*)/g)) {
    const dias = {};
    for (const parte of corpo.split(";")) {
      const [dia, ids] = parte.split(":");
      if (!DIAS.includes(Number(dia)) || !ids) continue;
      const validos = ids.split(".").filter((id) => idsValidos.has(id));
      if (validos.length) dias[dia] = Object.fromEntries(validos.map((id) => [id, true]));
    }
    achados.push({ nome: nomeBruto.trim(), dias });
  }
  return achados;
}
