import { useCallback, useEffect, useState } from 'react'
import { AdminDashboard } from './components/AdminDashboard'
import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { AuthPage } from './components/AuthPage'
import { EvaluatePage } from './components/EvaluatePage'
import { HistorySection } from './components/HistorySection'
import { LinksGroupingPage } from './components/LinksGroupingPage'
import { QaPage } from './components/QaPage'
import { Sidebar, type AppRoute } from './components/Sidebar'
import { SourcePanel } from './components/SourcePanel'
import { SummarizeControls } from './components/SummarizeControls'
import { SummaryHistoryManagement } from './components/SummaryHistoryManagement'
import { SummaryPanel } from './components/SummaryPanel'
import { UserManagement } from './components/UserManagement'
import { useAuth } from './hooks/useAuth'
import { useRagQa } from './hooks/useRagQa'
import { useTextSum } from './hooks/useTextSum'
import { useTheme } from './hooks/useTheme'
import { formatCompareSideCaption } from './lib/summarizeModels'

export default function App() {
  const ts = useTextSum()
  const auth = useAuth()
  const { theme, setTheme, resolvedDark } = useTheme()
  const [pathname, setPathname] = useState<AppRoute>(() => {
    const p = window.location.pathname
    if (p === '/auth' || p === '/evaluate' || p === '/links-grouping' || p === '/qa' || p === '/admin' || p === '/admin/users' || p === '/admin/history') return p
    return '/'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarDesktopOpen, setSidebarDesktopOpen] = useState(true)
  const [qaSource, setQaSource] = useState('')
  const rag = useRagQa(qaSource, ts.ragSummarizeModelId)

  const isAuthPage = pathname === '/auth'
  const showSidebar = !isAuthPage

  const summarizeAndIndex = useCallback(async () => {
    const ok = await ts.summarize()
    if (ok && ts.apiConfigured && ts.source.trim().length > 80) {
      setQaSource(ts.source)
      await rag.ingest(ts.source)
    }
  }, [ts, rag])

  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname
      const validRoutes: AppRoute[] = ['/auth', '/evaluate', '/links-grouping', '/qa', '/admin', '/admin/users', '/admin/history']
      setPathname(validRoutes.includes(p as AppRoute) ? (p as AppRoute) : '/')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Check if user is admin
  const isAdmin = auth.session?.user?.role === 'admin' || false
  
  // Debug: Log admin status
  useEffect(() => {
    if (auth.session) {
      console.log('Admin check:', {
        email: auth.session.user.email,
        role: auth.session.user.role,
        isAdmin,
      })
    }
  }, [auth.session, isAdmin])

  // Close sidebar on route change — update via navigateTo which also sets pathname


  const navigateTo = useCallback((nextPath: AppRoute) => {
    if (window.location.pathname === nextPath) return
    window.history.pushState({}, '', nextPath)
    setPathname(nextPath)
    setSidebarOpen(true)
  }, [])

  const openQaPage = useCallback(() => {
    if (ts.source.trim().length > 0) {
      setQaSource(ts.source)
    }
    navigateTo('/qa')
  }, [ts.source, navigateTo])

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-(--color-surface)">
      {/* Background gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklch,var(--color-accent)_22%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/2 -z-10 h-[40vh] w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklch,var(--color-mint)_12%,transparent),transparent)]"
      />

      {/* Hamburger Menu Toggle */}
      {showSidebar && (!sidebarOpen || !sidebarDesktopOpen) ? (
        <button
          onClick={() => {
            setSidebarOpen(true)
            setSidebarDesktopOpen(true)
          }}
          className="fixed top-4 left-4 z-30 flex size-9 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink-muted) shadow-sm transition hover:text-(--color-ink)"
          aria-label="Mở menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      ) : null}

      {/* Sidebar — only on non-auth pages */}
      {showSidebar ? (
        <Sidebar
          pathname={pathname}
          navigateTo={navigateTo}
          mobileOpen={sidebarOpen}
          desktopOpen={sidebarDesktopOpen}
          onClose={() => {
            setSidebarOpen(false)
            setSidebarDesktopOpen(false)
          }}
          isAdmin={isAdmin}
          session={auth.session}
          theme={theme}
          onSetTheme={setTheme}
          onLogout={() => {
            auth.logout()
            navigateTo('/auth')
          }}
        />
      ) : null}

      {/* Main content */}
      <div
        className={[
          'relative transition-all duration-300',
          pathname === '/qa' ? 'h-svh overflow-hidden' : 'pt-4 pb-8',
          showSidebar && sidebarDesktopOpen ? 'lg:pl-56' : '',
        ].join(' ')}
      >
        {isAuthPage ? (
          <div className="px-4 sm:px-6 lg:px-8">
          <AuthPage
            session={auth.session}
            status={auth.status}
            error={auth.error}
            successMsg={auth.successMsg}
            onLogin={auth.login}
            onRegister={auth.register}
            onLogout={auth.logout}
            onClearMessages={auth.clearMessages}
            onSuccess={() => {
              navigateTo('/')
              void ts.syncHistoryFromServer()
            }}
          />
          </div>
        ) : pathname === '/evaluate' ? (
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <EvaluatePage
              session={auth.session}
              history={ts.history}
              navigateTo={navigateTo}
            />
          </div>
        ) : pathname === '/links-grouping' ? (
          <>
            <LinksGroupingPage />
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <AppFooter />
            </div>
          </>
        ) : pathname === '/admin' ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <AdminDashboard session={auth.session} />
          </div>
        ) : pathname === '/admin/users' ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <UserManagement session={auth.session} />
          </div>
        ) : pathname === '/admin/history' ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <SummaryHistoryManagement session={auth.session} />
          </div>
        ) : pathname === '/qa' ? (
          <QaPage
            source={qaSource}
            onSource={setQaSource}
            apiConfigured={rag.apiConfigured}
            docId={rag.docId}
            onDocId={rag.setDocId}
            question={rag.question}
            onQuestion={rag.setQuestion}
            messages={rag.messages}
            indexedChars={rag.indexedChars}
            ingesting={rag.ingesting}
            asking={rag.asking}
            error={rag.error}
            canIngest={rag.canIngest}
            onIngest={rag.ingest}
            onAsk={rag.ask}
            onClearChat={rag.clearChat}
          />
        ) : (
          /* Home — summarize */
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="flex flex-col h-full">
              <SourcePanel
                id="input-source"
                value={ts.source}
                onChange={ts.setSource}
                chars={ts.stats.chars}
                words={ts.stats.words}
                minutes={ts.stats.minutes}
                copyDone={ts.copyFlash === 'source'}
                onCopy={ts.copySource}
                onClear={ts.clearAll}
                apiConfigured={ts.apiConfigured}
                onSummarizeFile={ts.summarizeFile}
                summarizeLoading={ts.loading}
              />
              </div>

              <div className="flex flex-col h-full">
              {ts.compareEnabled ? (
                <div className="grid gap-4">
                  <SummaryPanel
                    id="output-summary-a"
                    title="Kết quả A"
                    description={formatCompareSideCaption(
                      ts.compareA.mode,
                      ts.compareA.extractiveModelId,
                      ts.compareA.abstractiveModelId,
                    )}
                    value={ts.summary}
                    loading={ts.loading}
                    error={ts.compareErrorA ?? ts.error}
                    wordCount={ts.summaryWordCount}
                    copyDone={ts.copyFlash === 'summary'}
                    onCopy={ts.copySummary}
                    onDownload={ts.downloadSummary}
                    sentiment={ts.sentiment}
                  />
                  <SummaryPanel
                    id="output-summary-b"
                    title="Kết quả B"
                    description={formatCompareSideCaption(
                      ts.compareB.mode,
                      ts.compareB.extractiveModelId,
                      ts.compareB.abstractiveModelId,
                    )}
                    value={ts.summaryB}
                    loading={ts.loading}
                    error={ts.compareErrorB ?? ts.error}
                    wordCount={ts.summaryBWordCount}
                    copyDone={ts.copyFlash === 'summaryB'}
                    onCopy={ts.copySummaryB}
                    onDownload={ts.downloadSummaryB}
                    sentiment={ts.sentimentB}
                  />
                </div>
              ) : (
                <SummaryPanel
                  id="output-summary"
                  value={ts.summary}
                  loading={ts.loading}
                  error={ts.error}
                  wordCount={ts.summaryWordCount}
                  copyDone={ts.copyFlash === 'summary'}
                  onCopy={ts.copySummary}
                  onDownload={ts.downloadSummary}
                  sentiment={ts.sentiment}
                />
              )}
              </div>

              <div className="flex flex-col h-full lg:sticky lg:top-18">
                <SummarizeControls
                  mode={ts.mode}
                  onMode={ts.setMode}
                  length={ts.length}
                  onLength={ts.setLength}
                  lang={ts.lang}
                  onLang={ts.setLang}
                  includeSentiment={ts.includeSentiment}
                  onIncludeSentiment={ts.setIncludeSentiment}
                  extractiveModelId={ts.extractiveModelId}
                  onExtractiveModel={ts.setExtractiveModelId}
                  abstractiveModelId={ts.abstractiveModelId}
                  onAbstractiveModel={ts.setAbstractiveModelId}
                  apiConfigured={ts.apiConfigured}
                  loading={ts.loading}
                  onSummarize={summarizeAndIndex}
                  onOpenRagAi={openQaPage}
                  ragIngesting={rag.ingesting}
                  compareEnabled={ts.compareEnabled}
                  onCompareEnabled={ts.setCompareEnabled}
                  compareA={ts.compareA}
                  setCompareA={ts.setCompareA}
                  compareB={ts.compareB}
                  setCompareB={ts.setCompareB}
                />
              </div>
            </div>

            <HistorySection
              history={ts.history}
              onRestore={ts.restoreHistory}
              onRemove={ts.removeHistory}
              onClearAll={ts.clearHistoryAll}
            />

            <AppFooter />
          </div>
        )}
      </div>
    </div>
  )
}



