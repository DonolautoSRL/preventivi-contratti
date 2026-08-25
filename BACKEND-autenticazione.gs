/**
 * Copia di riferimento del file `autenticazione.gs` installato
 * nell'Apps Script "Donolauto – Preventivi Backend".
 *
 * Questo file NON viene eseguito da GitHub: sta qui solo perche' il
 * codice del backend sia leggibile e versionato insieme al frontend.
 * Se modifichi la guardia nell'Apps Script, aggiorna anche questa copia.
 *
 * La password vera vive solo nell'Apps Script. Qui resta un segnaposto.
 *
 * Come si aggancia al resto: in `Codice.gs` la prima riga dentro doGet
 * e doPost e'
 *
 *     const _bloccato = _verificaAccesso(e); if (_bloccato) return _bloccato;
 *
 * Bastano quelle due righe. Nessun'altra funzione e' stata toccata.
 */

// ============================================================
// AUTENTICAZIONE
// ------------------------------------------------------------
// Ogni richiesta al backend deve portare un token di sessione,
// che si ottiene solo facendo login con la password. Le richieste
// senza token valido vengono rifiutate prima di toccare i dati.
// ============================================================

const PASSWORD_ACCESSO = 'SEGNAPOSTO-la-password-vera-sta-solo-in-Apps-Script';

const DURATA_SESSIONE_SECONDI = 21600;
const MAX_TENTATIVI_FALLITI = 5;
const BLOCCO_SECONDI = 1800;


/**
 * Chiamata all'inizio di doGet e doPost.
 * Restituisce null se la richiesta puo' proseguire, oppure una
 * risposta gia' pronta (esito del login, o rifiuto) da ritornare
 * subito senza toccare i dati.
 */
function _verificaAccesso(e) {
  const req = _datiRichiesta(e);

  if (req.action === 'login') return _login(req.pin);

  if (_tokenValido(req.token)) return null;

  return _rispostaAuth({
    nonAutorizzato: true,
    error: 'Non autorizzato: effettua il login.'
  });
}


/** Unisce i parametri della query string e il corpo JSON del POST. */
function _datiRichiesta(e) {
  const dati = {};
  if (!e) return dati;

  if (e.parameter) {
    for (const k in e.parameter) dati[k] = e.parameter[k];
  }

  if (e.postData && e.postData.contents) {
    try {
      const corpo = JSON.parse(e.postData.contents);
      for (const k in corpo) dati[k] = corpo[k];
    } catch (err) {
      // corpo non JSON: restano i parametri della query string
    }
  }

  return dati;
}


/** Verifica la password e apre una sessione. */
function _login(passwordInviata) {
  const cache = CacheService.getScriptCache();

  const tentativi = Number(cache.get('tentativi_falliti') || 0);
  if (tentativi >= MAX_TENTATIVI_FALLITI) {
    return _rispostaAuth({
      ok: false,
      error: 'Troppi tentativi falliti. Riprova tra qualche minuto.'
    });
  }

  if (!_confrontoSicuro(String(passwordInviata || ''), PASSWORD_ACCESSO)) {
    cache.put('tentativi_falliti', String(tentativi + 1), BLOCCO_SECONDI);
    return _rispostaAuth({ ok: false, error: 'Password errata.' });
  }

  cache.remove('tentativi_falliti');

  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('sessione_' + token, 'valida', DURATA_SESSIONE_SECONDI);

  return _rispostaAuth({ ok: true, token: token });
}


function _tokenValido(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get('sessione_' + token) === 'valida';
}


/**
 * Confronto a tempo costante: scorre sempre tutti i caratteri, cosi'
 * la durata della risposta non lascia intuire quanti erano corretti.
 */
function _confrontoSicuro(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}


function _rispostaAuth(oggetto) {
  return ContentService
    .createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}
