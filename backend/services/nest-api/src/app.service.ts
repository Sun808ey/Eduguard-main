import { Injectable } from '@nestjs/common';

type AuditEntry = {
  id: string;
  eventType: string;
  description: string;
  hash: string;
  timestamp: string;
};

type AuditEntryInput = Partial<Pick<AuditEntry, 'eventType' | 'description' | 'hash' | 'timestamp'>>;

@Injectable()
export class AppService {
  private auditEntries: AuditEntry[] = [
    {
      id: 'audit-001',
      eventType: 'Policy Applied',
      description: 'Exam Kiosk policy enforced for S.4 devices',
      hash: 'a3f9c1d9b6e8f4c2d1e0a9f8b7c6d5e4a3b2c1d0',
      timestamp: '2026-05-28T08:10:00Z',
    },
    {
      id: 'audit-002',
      eventType: 'Sync',
      description: 'Local LAN sync completed with 12 pending devices',
      hash: 'b4c1d2e3f5061728394a5b6c7d8e9f0a1b2c3d4e',
      timestamp: '2026-05-28T08:03:00Z',
    },
    {
      id: 'audit-003',
      eventType: 'Violation',
      description: 'Unauthorized app detected on Tecno Spark 8C',
      hash: 'c5d2e3f4061728394a5b6c7d8e9f0a1b2c3d4e5f',
      timestamp: '2026-05-28T07:55:00Z',
    },
    {
      id: 'audit-004',
      eventType: 'Admin Action',
      description: 'Super Admin rotated policy signing keys',
      hash: 'd6e3f40718293a4b5c6d7e8f901a2b3c4d5e6f70',
      timestamp: '2026-05-27T17:20:00Z',
    },
  ];

  getHello(): string {
    return 'Hello World!';
  }

  getAuditEntries(): AuditEntry[] {
    return this.auditEntries.map((entry) => ({ ...entry }));
  }

  recordAuditEntry(input: AuditEntryInput): AuditEntry {
    const timestamp = this.normalizeTimestamp(input.timestamp);
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      eventType: this.normalizeText(input.eventType, 'Unknown event'),
      description: this.normalizeText(input.description, 'No description provided'),
      hash: this.normalizeText(input.hash, this.createPseudoHash(input.eventType ?? 'audit-entry')),
      timestamp,
    };

    this.auditEntries = [entry, ...this.auditEntries].slice(0, 100);
    return { ...entry };
  }

  verifyAuditChain(): { ok: boolean; message: string; totalEntries: number } {
    if (this.auditEntries.length === 0) {
      return { ok: false, message: 'no entries', totalEntries: 0 };
    }

    const seen = new Set<string>();
    let lastTimestamp = Number.POSITIVE_INFINITY;

    for (const entry of this.auditEntries) {
      const timestampValue = new Date(entry.timestamp).getTime();
      if (!entry.hash || typeof entry.hash !== 'string') {
        return { ok: false, message: 'missing hash', totalEntries: this.auditEntries.length };
      }
      if (seen.has(entry.hash)) {
        return { ok: false, message: 'duplicate hash detected', totalEntries: this.auditEntries.length };
      }
      seen.add(entry.hash);
      if (timestampValue > lastTimestamp) {
        return { ok: false, message: 'timestamps out of order', totalEntries: this.auditEntries.length };
      }
      lastTimestamp = timestampValue;
    }

    return { ok: true, message: 'no duplicates; timestamps descending', totalEntries: this.auditEntries.length };
  }

  private normalizeText(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
  }

  private normalizeTimestamp(value: string | undefined): string {
    if (!value) {
      return new Date().toISOString();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }

    return parsed.toISOString();
  }

  private createPseudoHash(seed: string): string {
    const source = `${seed}:${Date.now().toString(16)}:${Math.random().toString(16).slice(2, 18)}`;
    let hash = '';
    for (let index = 0; index < source.length; index += 1) {
      hash += source.charCodeAt(index).toString(16).padStart(2, '0');
    }
    return hash.slice(0, 40).padEnd(40, '0');
  }
}
