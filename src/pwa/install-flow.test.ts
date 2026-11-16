import { describe, expect, it, vi } from 'vitest';
import { InstallFlow, type BrowserInstallEvent } from './install-flow';
function event(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => ({ outcome })), userChoice: Promise.resolve({ outcome }),
  }) as BrowserInstallEvent;
}
describe('native browser installation flow', () => {
  it('cannot manufacture an install prompt or shortcut without browser support', async () => {
    const flow = new InstallFlow(); expect(await flow.request()).toBe('unavailable'); expect(flow.state).toBe('idle');
  });
  it('defers the browser event and preserves native user activation on click', async () => {
    const flow = new InstallFlow(), native = event(); flow.capture(native);
    expect(native.defaultPrevented).toBe(true); expect(flow.available).toBe(true);
    const result = flow.request(); expect(native.prompt).toHaveBeenCalledTimes(1);
    expect(flow.state).toBe('prompting'); expect(await flow.request()).toBe('unavailable');
    expect(await result).toBe('accepted'); expect(flow.state).toBe('requested');
    expect(await flow.request()).toBe('unavailable');
  });
  it('never marks dismissal as installation', async () => {
    const flow = new InstallFlow(); flow.capture(event('dismissed'));
    expect(await flow.request()).toBe('dismissed'); expect(flow.state).toBe('idle');
  });
  it('supports browsers whose prompt returns void and uses userChoice', async () => {
    const flow = new InstallFlow(), native = event(); native.prompt = vi.fn(async () => {}); flow.capture(native);
    expect(await flow.request()).toBe('accepted'); expect(flow.state).toBe('requested');
  });
  it('preserves the installed event that arrives during a pending native prompt', async () => {
    const flow = new InstallFlow(), native = event(); let done!: () => void;
    native.prompt = () => new Promise<void>(resolve => { done = resolve; }); flow.capture(native);
    const result = flow.request(); flow.markInstalled(); done(); await result;
    expect(flow.state).toBe('installed'); flow.capture(event()); expect(flow.available).toBe(false);
  });
  it('clears failed prompts without claiming installation and permits a new browser event', async () => {
    const flow = new InstallFlow(), native = event(); native.prompt = vi.fn(async () => { throw new Error('blocked'); });
    flow.capture(native); await expect(flow.request()).rejects.toThrow('blocked'); expect(flow.state).toBe('idle');
    flow.capture(event()); expect(flow.available).toBe(true);
  });
});
