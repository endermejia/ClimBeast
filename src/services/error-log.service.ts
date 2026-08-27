import { inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';
import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface AppErrorLog {
  id: string;
  created_at: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  user_id?: string | null;
  severity: ErrorSeverity;
  code?: string | null;
  context?: string | null;
}

const SEVERITY_WEIGHT: Record<ErrorSeverity, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1,
};

@Injectable({
  providedIn: 'root',
})
export class ErrorLogService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly localStorage = inject(LocalStorage);
  private readonly supabase = inject(SupabaseService);
  private readonly storageKey = 'app_error_logs_v3';

  readonly logs = signal<AppErrorLog[]>([]);

  constructor() {
    if (this.isBrowser) {
      this.logs.set(this.loadLocalLogs());
    }
  }

  async logError(
    error: unknown,
    severity: ErrorSeverity = 'error',
    context?: string,
  ): Promise<void> {
    if (!this.isBrowser) return;

    let message = 'Unexpected error';
    let stack: string | null = null;
    let code: string | null = null;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack ?? null;
      if (
        'context' in error &&
        error.context &&
        typeof error.context === 'object'
      ) {
        const ctx = error.context as Record<string, unknown>;
        if (typeof ctx['status'] === 'number') {
          code = String(ctx['status']);
        }
      }
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      const innerError = errorObj['error'] as
        Record<string, unknown> | undefined;
      message = String(
        errorObj['message'] ||
          innerError?.['message'] ||
          errorObj['details'] ||
          innerError?.['details'] ||
          errorObj['messageKey'] ||
          JSON.stringify(error),
      );
      stack = errorObj['stack'] ? String(errorObj['stack']) : null;
      code = errorObj['code']
        ? String(errorObj['code'])
        : errorObj['status']
          ? String(errorObj['status'])
          : null;
    } else if (error) {
      message = String(error);
    }

    const userId = this.supabase.authUserId();
    const newLog: AppErrorLog = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      message,
      stack,
      url: window.location.href,
      user_id: userId || null,
      severity,
      code,
      context: context ?? null,
    };

    // Save locally first
    this.saveLocalLog(newLog);

    // Save to Supabase table `error_logs` silently (without console output)
    try {
      await this.supabase.whenReady();
      await this.supabase.client.from('error_logs').insert({
        id: newLog.id,
        message: newLog.message,
        stack: newLog.stack,
        url: newLog.url,
        user_id: newLog.user_id,
        severity: newLog.severity,
        code: newLog.code,
        context: newLog.context,
      });
    } catch {
      // Suppress console output if DB insert fails
    }
  }

  async fetchLogs(): Promise<AppErrorLog[]> {
    if (!this.isBrowser) return [];

    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !data) {
        return this.sortLogs(this.loadLocalLogs());
      }

      const dbLogs = (data as AppErrorLog[]).map((log) => ({
        ...log,
        severity: (log.severity as ErrorSeverity) || 'error',
      }));

      const sorted = this.sortLogs(dbLogs);
      this.logs.set(sorted);
      return sorted;
    } catch {
      return this.sortLogs(this.loadLocalLogs());
    }
  }

  sortLogs(
    logs: AppErrorLog[],
    sortBy: 'severity' | 'date' = 'severity',
  ): AppErrorLog[] {
    return [...logs].sort((a, b) => {
      if (sortBy === 'severity') {
        const weightA = SEVERITY_WEIGHT[a.severity] ?? 0;
        const weightB = SEVERITY_WEIGHT[b.severity] ?? 0;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }

  async clearErrors(): Promise<void> {
    this.logs.set([]);
    if (this.isBrowser) {
      try {
        this.localStorage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
      try {
        await this.supabase.whenReady();
        await this.supabase.client
          .from('error_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {
        // ignore
      }
    }
  }

  private loadLocalLogs(): AppErrorLog[] {
    if (!this.isBrowser) return [];
    try {
      const data = this.localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalLog(log: AppErrorLog): void {
    const updated = [log, ...this.loadLocalLogs()].slice(0, 100);
    this.logs.set(this.sortLogs(updated));
    try {
      this.localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}
