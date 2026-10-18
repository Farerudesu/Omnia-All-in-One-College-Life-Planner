import { OmniChat } from './components/OmniChat';

export function AskOmniPage() {
  return (
    <div
      className="ask-omni-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface-container-low)',
      }}
    >
      <OmniChat />
    </div>
  );
}

export default AskOmniPage;
