import { useState, useEffect, useCallback } from 'react'
import { changePassword, downloadBackup, getIntegrityCheck, fixIntegrity } from '../api/admin'
import './AdminMaintenancePage.css'

function AnomalyTable({ title, count, items, columns, renderRow, fixable }) {
  return (
    <div className="anomaly-block">
      <div className="anomaly-block__header">
        <h3>{title}</h3>
        <span className={`anomaly-count ${count === 0 ? 'anomaly-count--ok' : 'anomaly-count--error'}`}>
          {count === 0 ? 'OK' : count}
        </span>
        {!fixable && count > 0 && (
          <span className="anomaly-manual">Correction manuelle requise</span>
        )}
      </div>
      {count === 0 ? (
        <p className="anomaly-empty">Aucune anomalie.</p>
      ) : (
        <div className="anomaly-table-wrapper">
          <table className="anomaly-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  {renderRow(item).map((cell, j) => <td key={j}>{String(cell ?? '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminMaintenancePage() {
  const [pwdOld, setPwdOld] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState(null)
  const [pwdSuccess, setPwdSuccess] = useState(null)

  const [backupLoading, setBackupLoading] = useState(false)
  const [backupError, setBackupError] = useState(null)

  const [integrity, setIntegrity] = useState(null)
  const [integrityLoading, setIntegrityLoading] = useState(true)
  const [integrityError, setIntegrityError] = useState(null)
  const [fixLoading, setFixLoading] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  const fetchIntegrity = useCallback(async () => {
    setIntegrityLoading(true)
    setIntegrityError(null)
    setFixResult(null)
    try {
      const res = await getIntegrityCheck()
      setIntegrity(res.data.data)
    } catch (err) {
      setIntegrityError(err.response?.data?.message || 'Erreur lors de la vérification.')
    } finally {
      setIntegrityLoading(false)
    }
  }, [])

  useEffect(() => { fetchIntegrity() }, [fetchIntegrity])

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwdLoading(true)
    setPwdError(null)
    setPwdSuccess(null)
    try {
      const res = await changePassword({ old_password: pwdOld, new_password: pwdNew })
      setPwdSuccess(res.data.message)
      setPwdOld('')
      setPwdNew('')
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.')
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleDownloadBackup() {
    setBackupLoading(true)
    setBackupError(null)
    try {
      const res = await downloadBackup()
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      setBackupError('Erreur lors de la génération de la sauvegarde.')
    } finally {
      setBackupLoading(false)
    }
  }

  async function handleFix() {
    setFixLoading(true)
    setFixResult(null)
    try {
      const res = await fixIntegrity()
      setFixResult({ success: true, message: res.data.message, fixes: res.data.fixes })
      await fetchIntegrity()
    } catch (err) {
      setFixResult({ success: false, message: err.response?.data?.message || 'Erreur lors de la correction.' })
    } finally {
      setFixLoading(false)
    }
  }

  const totalAnomalies = integrity
    ? integrity.objects_sans_zone.length +
      integrity.users_sans_level.length +
      integrity.users_incoherents.length +
      integrity.objects_sans_conso.length
    : 0

  const fixableAnomalies = integrity
    ? integrity.objects_sans_zone.length +
      integrity.users_sans_level.length +
      integrity.users_incoherents.length
    : 0

  return (
    <main className="admin-maintenance">
      <header className="admin-maintenance__header">
        <h1>Maintenance système</h1>
      </header>

      <div className="maintenance-grid">
        {/* Changement de mot de passe */}
        <section className="card" aria-labelledby="pwd-title">
          <h2 id="pwd-title">Mise à jour du mot de passe admin</h2>
          <form onSubmit={handleChangePassword} noValidate>
            {pwdError && <p className="alert alert--error" role="alert">{pwdError}</p>}
            {pwdSuccess && <p className="alert alert--success" role="status">{pwdSuccess}</p>}
            <div className="field">
              <label htmlFor="old-password">Ancien mot de passe</label>
              <input
                id="old-password"
                type="password"
                value={pwdOld}
                onChange={e => setPwdOld(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">Nouveau mot de passe</label>
              <input
                id="new-password"
                type="password"
                value={pwdNew}
                onChange={e => setPwdNew(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={pwdLoading || !pwdOld || !pwdNew}
            >
              {pwdLoading ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </form>
        </section>

        {/* Sauvegarde BDD */}
        <section className="card" aria-labelledby="backup-title">
          <h2 id="backup-title">Sauvegarde de la base de données</h2>
          <p className="card__desc">
            Télécharger l'intégralité des données au format JSON via <code>dumpdata</code>.
          </p>
          {backupError && <p className="alert alert--error" role="alert">{backupError}</p>}
          <button
            className="btn btn--primary"
            onClick={handleDownloadBackup}
            disabled={backupLoading}
          >
            {backupLoading ? 'Génération…' : 'Télécharger la sauvegarde'}
          </button>
        </section>
      </div>

      {/* Intégrité des données */}
      <section className="card card--full" aria-labelledby="integrity-title">
        <div className="integrity-header">
          <div>
            <h2 id="integrity-title">Vérification de l'intégrité des données</h2>
            {integrity && (
              <p className="integrity-summary">
                {totalAnomalies === 0
                  ? 'Aucune anomalie détectée.'
                  : `${totalAnomalies} anomalie${totalAnomalies > 1 ? 's' : ''} détectée${totalAnomalies > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <div className="integrity-actions">
            <button
              className="btn btn--outline"
              onClick={fetchIntegrity}
              disabled={integrityLoading}
            >
              {integrityLoading ? 'Vérification…' : 'Actualiser'}
            </button>
            {fixableAnomalies > 0 && (
              <button
                className="btn btn--success"
                onClick={handleFix}
                disabled={fixLoading}
              >
                {fixLoading ? 'Correction…' : `Corriger automatiquement (${fixableAnomalies})`}
              </button>
            )}
          </div>
        </div>

        {fixResult && (
          <div className={`alert ${fixResult.success ? 'alert--success' : 'alert--error'}`} role="status">
            <p className="alert__msg">{fixResult.message}</p>
            {fixResult.fixes && fixResult.fixes.length > 0 && (
              <ul className="fix-list">
                {fixResult.fixes.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}

        {integrityError && (
          <p className="alert alert--error" role="alert">{integrityError}</p>
        )}

        {integrityLoading && <p className="status-text" aria-live="polite">Vérification en cours…</p>}

        {integrity && !integrityLoading && (
          <div className="anomaly-tables">
            <AnomalyTable
              title="Objets sans zone assignée"
              count={integrity.objects_sans_zone.length}
              items={integrity.objects_sans_zone}
              columns={['ID', 'Nom', 'Identifiant unique']}
              renderRow={item => [item.id, item.nom, item.unique_id]}
              fixable
            />
            <AnomalyTable
              title="Utilisateurs vérifiés sans niveau"
              count={integrity.users_sans_level.length}
              items={integrity.users_sans_level}
              columns={['ID', 'Pseudo', 'Email', 'Points']}
              renderRow={item => [item.id, item.pseudo, item.email, item.points]}
              fixable
            />
            <AnomalyTable
              title="Points incohérents avec le niveau"
              count={integrity.users_incoherents.length}
              items={integrity.users_incoherents}
              columns={['ID', 'Pseudo', 'Points', 'Niveau actuel', 'Niveau attendu']}
              renderRow={item => [item.id, item.pseudo, item.points, item.level_actuel, item.level_attendu]}
              fixable
            />
            <AnomalyTable
              title="Objets sans historique de consommation"
              count={integrity.objects_sans_conso.length}
              items={integrity.objects_sans_conso}
              columns={['ID', 'Nom', 'Identifiant unique']}
              renderRow={item => [item.id, item.nom, item.unique_id]}
              fixable={false}
            />
          </div>
        )}
      </section>
    </main>
  )
}
