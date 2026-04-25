interface AgentStatusBarProps {
  hubOnline: boolean;
  gooseAvail: boolean;
  hubModel: string;
  sessionName: string | null;
  sessionTasks: number;
  gooseDesktopAvail: boolean;
  gooseLaunching: boolean;
  showIframe: boolean;
  onResetSession: () => void;
  onLaunchGooseDesktop: () => void;
  onToggleIframe: () => void;
}

export function AgentStatusBar({
  hubOnline, gooseAvail, hubModel,
  sessionName, sessionTasks,
  gooseDesktopAvail, gooseLaunching,
  showIframe,
  onResetSession, onLaunchGooseDesktop, onToggleIframe,
}: AgentStatusBarProps) {
  return (
    <div className="ah-statusbar">
      <span className={`ah-dot ${hubOnline ? 'ah-dot-ok' : 'ah-dot-err'}`} />
      <span className="ah-status-lbl">Hub {hubOnline ? 'online' : 'offline'} :4224</span>
      {hubOnline && <span className="ah-status-model">{hubModel}</span>}
      <span className="ah-sep">·</span>
      <span className={`ah-dot ${gooseAvail ? 'ah-dot-ok' : 'ah-dot-warn'}`} />
      <span className="ah-status-lbl">Goose {gooseAvail ? 'ready' : 'offline'}</span>
      {!hubOnline && <span className="ah-status-hint">→ uruchom: npm run hub</span>}
      {hubOnline && sessionName && (
        <>
          <span className="ah-sep">·</span>
          <span className="ah-session-info" title={`Sesja: ${sessionName}`}>
            🧠 {sessionTasks} task{sessionTasks !== 1 ? 'ów' : ''}
          </span>
          <button
            className="ah-session-reset"
            title={`Reset sesji "${sessionName}" — następny task zacznie nową sesję`}
            onClick={onResetSession}
          >↺ sesja</button>
        </>
      )}
      <div className="ah-status-spacer" />
      {gooseDesktopAvail && (
        <button
          className="ah-goose-desktop-btn"
          onClick={onLaunchGooseDesktop}
          disabled={gooseLaunching || !hubOnline}
          title="Uruchom Goose Desktop (v41)"
        >{gooseLaunching ? '⟳' : '🖥'} Goose</button>
      )}
      <button
        className={`ah-iframe-toggle${showIframe ? ' ah-iframe-toggle-on' : ''}`}
        onClick={onToggleIframe}
        title="Pokaż/ukryj sandbox iframe"
      >⊟ Sandbox</button>
    </div>
  );
}
