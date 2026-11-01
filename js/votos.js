// Votação ao vivo: login anônimo no Firebase e votos no Realtime Database.
// Cada aparelho só altera o próprio voto; a regra disso mora em database.rules.json.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export function iniciarVotos({ aoMudarVotos, aoMudarConexao, aoFalhar }) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  let uid = null;

  onValue(ref(db, ".info/connected"), (foto) => aoMudarConexao(foto.val() === true && uid !== null));
  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) return;
    uid = usuario.uid;
    onValue(ref(db, "votos"), (foto) => aoMudarVotos(foto.val() || {}, uid), aoFalhar);
    aoMudarConexao(true);
  });
  signInAnonymously(auth).catch(aoFalhar);

  return {
    meuId: () => uid,
    async salvar(nome, dia, id, votado) {
      if (!uid) throw new Error("sem conexão com a votação");
      await update(ref(db, `votos/${uid}`), {
        nome,
        t: Date.now(),
        [`dias/${dia}/${id}`]: votado ? true : null,
      });
    },
    async renomear(nome) {
      if (uid) await update(ref(db, `votos/${uid}`), { nome, t: Date.now() });
    },
  };
}
