# Jampa 7 dias

Painel para um grupo de amigos escolher, dia a dia, as praias, passeios, restaurantes e noites de uma viagem a João Pessoa (PB). Site estático, feito primeiro para o celular.

## Como está organizado

| Parte | Arquivo | O que faz |
|---|---|---|
| Página | `index.html`, `css/estilo.css` | Estrutura e visual |
| Montagem | `js/app.js` | Dias, tópicos, sanfonas e ligação entre as partes |
| Cartão | `js/cartao.js` | Foto, fatos e botões de cada lugar |
| Google | `js/google.js` | Bloco do Places UI Kit, criado só quando o cartão chega perto da tela |
| Votos | `js/votos.js`, `js/placar.js` | Votação ao vivo no Firebase e cálculo dos líderes |
| Janelas | `js/folhas.js`, `js/plano-b.js` | Mapa, galeria de fotos e plano B pelo WhatsApp |
| Dados | `data/lugares.json` | Textos, valores, rotas e créditos das fotos |
| Regras | `database.rules.json` | Cópia das regras publicadas no Firebase |

## Decisões que não devem mudar sem pensar

- **Dados do Google nunca são guardados.** Nota, comentários, horários, faixa de preço e fotos aparecem ao vivo pelo bloco do Google. Os Termos proíbem cache e cópia; só o `place_id` pode ficar salvo.
- **O mapa é Leaflet com OpenStreetMap porque o conteúdo do Google vem do Places UI Kit.** Os Termos proíbem usar a Places API perto de mapa que não é do Google, com exceção escrita para o UI Kit (Service Specific Terms, seção 15).
- **As coordenadas vêm do OpenStreetMap e as rotas do OSRM**, calculadas uma vez na montagem. Os tempos não contam trânsito.
- **Fotos em `fotos/` são só da Wikimedia Commons**, com autor e licença em `data/lugares.json`.
- **As chaves ficam fora do Git.** `js/google-config.js` e `js/firebase-config.js` nascem na publicação, a partir dos segredos do repositório. Elas são públicas no site de propósito e protegidas por restrição de site, de API e pelas regras do banco.

## Publicar

Todo push na `main` publica no GitHub Pages pelo fluxo `.github/workflows/publicar.yml`.
