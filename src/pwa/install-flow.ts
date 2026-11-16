export type InstallState = 'idle' | 'available' | 'prompting' | 'requested' | 'installed';
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';
export interface BrowserInstallEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' } | void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export class InstallFlow {
  private event: BrowserInstallEvent | null = null;
  state: InstallState = 'idle';
  get available(): boolean { return this.state === 'available' && this.event !== null; }
  capture(event: BrowserInstallEvent): void {
    event.preventDefault();
    if (this.state === 'installed' || this.state === 'prompting') return;
    this.event = event; this.state = 'available';
  }
  markInstalled(): void { this.event = null; this.state = 'installed'; }
  async request(): Promise<InstallOutcome> {
    if (!this.available || !this.event) return 'unavailable';
    const event = this.event;
    this.event = null; this.state = 'prompting';
    try {
      // Called before the first await, preserving the user's click activation.
      const result = await event.prompt();
      const choice = result?.outcome ? result : await event.userChoice;
      if ((this.state as InstallState) !== 'installed') this.state = choice.outcome === 'accepted' ? 'requested' : 'idle';
      return choice.outcome;
    } catch (error) {
      if ((this.state as InstallState) !== 'installed') this.state = 'idle';
      throw error;
    }
  }
}
