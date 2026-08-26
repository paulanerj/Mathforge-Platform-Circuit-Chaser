/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const Telemetry = {
  events: [] as any[],
  maxEvents: 5000,
  log(type: string, payload: any = {}, gameStep: number | null = null, mode: string | null = null, configSnapshot: any = null, virtualTime: number | null = null) {
    const ev = { 
      timestamp: Date.now(), 
      virtualTime: virtualTime ?? 0,
      type, 
      payload, 
      gameStep, 
      mode, 
      configSnapshot 
    };
    this.events.push(ev);
    if (this.events.length > this.maxEvents) this.events.shift();
    console.log(`[Telemetry][VT:${ev.virtualTime}] ${type}`, payload);
  },
  exportJSON() {
    return JSON.stringify(this.events, null, 2);
  },
  print() {
    console.table(
      this.events.map((e) => ({
        Time: new Date(e.timestamp).toISOString().split('T')[1],
        Type: e.type,
        Payload: JSON.stringify(e.payload).substring(0, 100),
      }))
    );
  },
};

if (typeof window !== 'undefined') {
  (window as any).printTelemetry = () => Telemetry.print();
  (window as any).exportTelemetryJSON = () => Telemetry.exportJSON();
}
