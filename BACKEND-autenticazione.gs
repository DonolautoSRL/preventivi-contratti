/**
 * GUARDIA DI AUTENTICAZIONE — Donolauto
 * ---------------------------------------------------------------------------
 * Blocca ogni richiesta al backend che non porti un token valido.
 *
 * Il problema che risolve: le funzioni doGet/doPost rispondevano a chiunque
 * conoscesse l'URL della web app. L'URL era scritto in un repository pubblico,
 * quindi anagrafiche, codici fiscali e contratti erano scaricabili da chiunque.
 *
 * COME INSTALLARLO — 4 passaggi
 *
 *   1. Apri il progetto Apps Script collegato al foglio.
 *
 *   2. Nel codice che hai gia', rinomina SOLO le due funzioni di ingresso:
 *
 *          function doGet(e)   { ...}   ->   function gestisciGet(e)  { ...}
 *          function doPost(e)  { ...}   ->   function gestisciPost(e) { ...}
 *
 *      Non serve toccare nient'altro: tutta la tua logica resta com'e'.
 *
 *   3. Aggiungi un file nuovo (+ > Script), chiamalo "autenticazione",
 *      incolla dentro questo contenuto e imposta PASSWORD qui sotto.
 *
 *   4. Distribuisci > Nuova distribuzione > Applicazione web
 *         - "Esegui come": Me stesso
 *         - "Chi ha accesso": Chiunque      <- serve, l'accesso lo controlliamo noi
 *      Copia il NUOVO URL nell'index.html, al posto del segnaposto.
 *
 *      Poi: Distribuzioni > quella VECCHIA > Archivia. L'URL vecchio e'
 *      bruciato, non va riutilizzato.
 * ---------------------------------------------------------------------------
 */

/** Password di accesso. Lunga e casuale: non un PIN di 4 cifre. */
const PASSWORD = 'CAMBIAMI-metti-qui-una-password-lunga-e-casuale';

/** Durata della sessione. Massimo consentito da CacheService: 6 ore. */
const DURATA_SESSIONE_SECONDI = 21600;

/** Dopo quanti tentativi falliti il login si blocca, e per quanto. */
const MAX_TENTATIVI_FALLITI = 10;
const BLOCCO_SECONDI = 900;


function doGet(e)  { return _conAutenticazione(e, gestisciGet); }
function doPost(e) { return _conAutenticazione(e, gestisciPost); }


function _conAutenticazione(e, gestoreOriginale) {
  const richiesta = _leggiRichiesta(e);

  if (richiesta.action === 'login') {
    return _login(richiesta.pin);
  }

  if (!_tokenValido(richiesta.token)) {
    return _rispostaJson({
      nonAutorizzato: true,
      error: 'Non autorizzato: effettua il login.'
    });
  }

  return gestoreOriginale(e);
}


/** Unisce i parametri in query string e l'eventuale corpo JSON del POST. */
function _leggiRichiesta(e) {
  const richiesta = {};

  if (e && e.parameter) {
    for (const chiave in e.parameter) richiesta[chiave] = e.parameter[chiave];
  }

  if (e && e.postData && e.postData.contents) {
    try {
      const corpo = JSON.parse(e.postData.contents);
      for (const chiave in corpo) richiesta[chiave] = corpo[chiave];
    } catch (err) {
      // corpo non JSON: restano solo i parametri in query string
    }
  }

  return richiesta;
}


function _login(passwordInviata) {
  const cache = CacheService.getScriptCache();

  const tentativi = Number(cache.get('tentativi_falliti') || 0);
  if (tentativi >= MAX_TENTATIVI_FALLITI) {
    return _rispostaJson({
      ok: false,
      error: 'Troppi tentativi falliti. Riprova tra qualche minuto.'
    });
  }

  if (!_confrontoSicuro(String(passwordInviata || ''), PASSWORD)) {
    cache.put('tentativi_falliti', String(tentativi + 1), BLOCCO_SECONDI);
    return _rispostaJson({ ok: false, error: 'Password errata.' });
  }

  cache.remove('tentativi_falliti');

  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('sessione_' + token, 'valida', DURATA_SESSIONE_SECONDI);

  return _rispostaJson({ ok: true, token: token });
}


function _tokenValido(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get('sessione_' + token) === 'valida';
}


/**
 * Confronto a tempo costante: scorre sempre tutti i caratteri, cosi' la
 * durata della risposta non lascia capire quanti ne erano corretti.
 */
function _confrontoSicuro(a, b) {
  if (a.length !== b.length) return false;
  let differenza = 0;
  for (let i = 0; i < a.length; i++) {
    differenza |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return differenza === 0;
}


function _rispostaJson(oggetto) {
  return ContentService
    .createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}
