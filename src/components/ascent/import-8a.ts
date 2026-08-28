import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { type TuiFileLike, TuiStepper } from '@taiga-ui/kit';
import { TuiSlides } from '@taiga-ui/layout';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  BehaviorSubject,
  finalize,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import {
  CsvParserService,
  EmptyCsvError,
} from '../../services/csv-parser.service';
import { MapDataService } from '../../services/map-data.service';
import { NotificationService } from '../../services/notification.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import {
  Import8aPayload,
  ResolvedSlugData,
  RouteMatcherService,
} from '../../services/route-matcher.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EightAnuAscent, Json } from '../../models';

import { slugify } from '../../utils';
import { reactToObservable } from '../../utils';

import {
  Import8aStepConfirmComponent,
  ResolvedAscentItem,
} from './import-8a-step-confirm';

import { Import8aStepUploadComponent } from './import-8a-step-upload';

@Component({
  selector: 'app-import-8a',
  imports: [
    Import8aStepConfirmComponent,
    Import8aStepUploadComponent,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiSlides,
    TuiStepper,
  ],
  template: `
    <div class="flex justify-center">
      <div class="w-full max-w-2xl">
        <tui-stepper
          [activeItemIndex]="index"
          (activeItemIndexChange)="onStep($event)"
          class="mb-4"
        >
          <button tuiStep>{{ 'import8a.steps.uploadCSV' | translate }}</button>
          <button tuiStep [disabled]="!control.value">
            {{ 'import8a.steps.confirmAscents' | translate }}
          </button>
        </tui-stepper>

        <section [tuiSlides]="direction" class="mt-6">
          <!-- Step 0: Upload CSV -->
          @if (index === 0) {
            <app-import-8a-step-upload
              [control]="control"
              [loadedFile]="loadedFile()"
              [failedFiles]="failedFiles$"
              [loadingFiles]="loadingFiles$"
              (removeFile)="removeFile()"
            />
          }

          <!-- Step 1: Preview & Confirm -->
          @if (index === 1) {
            <app-import-8a-step-confirm
              [ascentsWithResolved]="ascentsWithResolved()"
              [ascentsCount]="ascents().length"
              [selectedCount]="selectedIndices().size"
              [isAllSelected]="
                selectedIndices().size === ascents().length &&
                ascents().length > 0
              "
              [newAreasCount]="newAreasCount()"
              [newCragsCount]="newCragsCount()"
              [selectedMap]="selectedMap()"
              [importing]="importing()"
              (toggleSelect)="toggleSelect($event.index, $event.checked)"
              (toggleAll)="toggleAll($event)"
              (import)="onImport()"
            />
          }
        </section>

        <footer class="mt-8 flex justify-end gap-2">
          @if (index) {
            <button
              appearance="secondary"
              tuiButton
              type="button"
              (click)="onStep(index - 1)"
            >
              {{ 'back' | translate }}
            </button>
          }
          @if (index === 0) {
            <button
              tuiButton
              type="button"
              [disabled]="!control.value || searching()"
              (click)="onStep(1)"
            >
              {{ 'next' | translate }}
            </button>
          }
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Import8aComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);
  private readonly toast = inject(ToastService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly mapData = inject(MapDataService);
  private readonly cragRoutesData = inject(CragRoutesDataService);
  private readonly csvParser = inject(CsvParserService);
  private readonly routeMatcher = inject(RouteMatcherService);
  private readonly context = inject(
    POLYMORPHEUS_CONTEXT,
  ) as TuiDialogContext<boolean>;

  protected index = 0;
  protected direction = 0;

  protected searching = signal(false);
  protected importing = signal(false);
  protected ascents = signal<EightAnuAscent[]>([]);
  protected selectedIndices = signal<Set<number>>(new Set());
  protected existingAreaSlugsSet = signal<Set<string>>(new Set());
  protected existingCragKeysSet = signal<Set<string>>(new Set());

  private resolvedSlugsMap = new Map<string, ResolvedSlugData>();
  private loaderClose$?: Subject<void>;

  protected readonly ascentsWithResolved = computed<ResolvedAscentItem[]>(
    () => {
      const existingAreas = this.existingAreaSlugsSet();
      const existingCrags = this.existingCragKeysSet();

      return this.ascents().map((a): ResolvedAscentItem => {
        const areaSlug = slugify(a.location_name);
        const cragSlug = slugify(a.sector_name);
        const isNewArea = !existingAreas.has(areaSlug);
        const isNewCrag =
          isNewArea || !existingCrags.has(`${areaSlug}|${cragSlug}`);

        return {
          ...a,
          _resolvedData: this.resolvedSlugsMap.get(
            `${areaSlug}|${cragSlug}|${slugify(a.name)}`,
          ),
          _isNewArea: isNewArea,
          _isNewCrag: isNewCrag,
        };
      });
    },
  );

  protected readonly newAreasCount = computed(() => {
    const selected = this.selectedIndices();
    const ascents = this.ascents();
    const existingAreas = this.existingAreaSlugsSet();
    const uniqueSelectedNewAreas = new Set<string>();

    ascents.forEach((a, i) => {
      if (selected.has(i)) {
        const areaSlug = slugify(a.location_name);
        if (!existingAreas.has(areaSlug)) {
          uniqueSelectedNewAreas.add(areaSlug);
        }
      }
    });

    return uniqueSelectedNewAreas.size;
  });

  protected readonly newCragsCount = computed(() => {
    const selected = this.selectedIndices();
    const ascents = this.ascents();
    const existingAreas = this.existingAreaSlugsSet();
    const existingCrags = this.existingCragKeysSet();
    const uniqueSelectedNewCrags = new Set<string>();

    ascents.forEach((a, i) => {
      if (selected.has(i)) {
        const areaSlug = slugify(a.location_name);
        const cragKey = `${areaSlug}|${slugify(a.sector_name)}`;
        const isNewArea = !existingAreas.has(areaSlug);
        const isNewCrag = isNewArea || !existingCrags.has(cragKey);
        if (isNewCrag) {
          uniqueSelectedNewCrags.add(cragKey);
        }
      }
    });

    return uniqueSelectedNewCrags.size;
  });

  protected readonly selectedMap = computed(() => {
    const set = this.selectedIndices();
    const map: Record<number, boolean> = {};
    for (const idx of set) {
      map[idx] = true;
    }
    return map;
  });

  protected readonly control = new FormControl<TuiFileLike | null>(
    null,
    Validators.required,
  );

  protected readonly failedFiles$ = new Subject<TuiFileLike | null>();
  protected readonly loadingFiles$ = new Subject<TuiFileLike | null>();
  protected readonly loadedFile = signal<TuiFileLike | null>(null);

  protected readonly loadedFiles$ = this.control.valueChanges.pipe(
    startWith(this.control.value),
    switchMap((file) => {
      if (!file) {
        this.loadedFile.set(null);
        return of(null);
      }
      return this.processFile(file).pipe(
        tap((processed) => {
          this.loadedFile.set(processed);
        }),
      );
    }),
  );

  constructor() {
    reactToObservable(this.loadedFiles$, () => undefined);
  }

  protected onStep(step: number): void {
    this.direction = step - this.index;
    this.index = step;
  }

  protected toggleSelect(index: number, checked: boolean): void {
    this.selectedIndices.update((set) => {
      const newSet = new Set(set);
      if (checked) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }

  protected toggleAll(checked: boolean): void {
    const current = this.ascents();
    if (checked) {
      this.selectedIndices.set(new Set(current.map((_, i) => i)));
    } else {
      this.selectedIndices.set(new Set());
    }
  }

  protected removeFile(): void {
    this.control.setValue(null);
    this.ascents.set([]);
    this.selectedIndices.set(new Set());
    this.loadedFile.set(null);
    this.routeMatcher.resetCache();
    this.existingAreaSlugsSet.set(new Set());
    this.existingCragKeysSet.set(new Set());
  }

  private processFile(
    file: TuiFileLike | null,
  ): Observable<TuiFileLike | null> {
    this.failedFiles$.next(null);

    if (this.control.invalid || !file) {
      return of(null);
    }

    if (this.ascents().length > 0) {
      return of(file);
    }

    this.loadingFiles$.next(file);

    return of(file).pipe(
      tap(() => this.searching.set(true)),
      switchMap(async (f) => {
        try {
          if (f instanceof File) {
            const text = await f.text();
            const parsedAscents = this.csvParser.parseCSV(text);

            if (parsedAscents.length === 0) {
              throw new EmptyCsvError('Empty CSV');
            }

            const resolveProgress$ = new BehaviorSubject<number>(0);
            this.resolvedSlugsMap =
              await this.routeMatcher.resolveCsvAscentsWith8aData(
                parsedAscents,
                resolveProgress$,
              );

            const { existingAreaSlugs, existingCragKeys } =
              await this.routeMatcher.resolveExistingAreasAndCrags(
                parsedAscents,
              );
            this.existingAreaSlugsSet.set(existingAreaSlugs);
            this.existingCragKeysSet.set(existingCragKeys);

            const { ascents } =
              await this.routeMatcher.deduplicateCsvAscentsAgainstExisting(
                parsedAscents,
                this.resolvedSlugsMap,
              );

            this.ascents.set(ascents);
            this.selectedIndices.set(new Set(ascents.map((_, i) => i)));
            return f;
          }
          return null;
        } catch (e) {
          console.error(e);
          this.failedFiles$.next(f);
          if (e instanceof EmptyCsvError) {
            this.toast.error(
              this.translate.instant('import8a.errors.emptyCSV'),
            );
          } else {
            this.toast.error(
              this.translate.instant('import8a.errors.parseCSV'),
            );
          }
          return null;
        }
      }),
      finalize(() => {
        this.loadingFiles$.next(null);
        this.searching.set(false);
      }),
    );
  }

  async onImport(): Promise<void> {
    const allAscents = this.ascents();
    const selected = this.selectedIndices();
    const ascents = allAscents.filter((_, i) => selected.has(i));
    if (ascents.length === 0) return;

    this.importing.set(true);
    const progress$ = new BehaviorSubject<number>(0);
    this.loaderClose$ = this.toast.showLoader('import8a.importing', progress$);

    try {
      const { payload, totalUnits } =
        await this.routeMatcher.fetch8aAreaAndCragData(
          ascents,
          progress$,
          this.resolvedSlugsMap,
        );

      const existingAscentKeys =
        await this.routeMatcher.getOrLoadExistingAscentKeys();
      const { payload: deduplicatedPayload, skipped: skippedBeforeImport } =
        this.routeMatcher.deduplicatePayloadAgainstExistingAscents(
          payload,
          existingAscentKeys,
        );

      let completedUnits = 0;
      const CHUNK_SIZE = 50;
      const chunks: Import8aPayload[][] = [];
      for (let i = 0; i < deduplicatedPayload.length; i += CHUNK_SIZE) {
        chunks.push(deduplicatedPayload.slice(i, i + CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await this.supabase.client.rpc(
            'import_8a_ascents',
            {
              ascents: chunk as unknown as Json[],
            },
          );

          if (error) {
            console.error('[8a Import] RPC Error:', error);
            throw error;
          }

          completedUnits += chunk.length;
          progress$.next(
            Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
          );

          return data;
        }),
      );

      let totalInserted = 0;
      let totalSkipped = skippedBeforeImport;
      let totalCreatedAreas = 0;
      let totalCreatedCrags = 0;
      let totalCreatedRoutes = 0;

      for (const data of results) {
        if (data) {
          totalInserted += data.inserted_ascents ?? 0;
          totalSkipped += data.skipped_ascents ?? 0;
          totalCreatedAreas += data.created_areas ?? 0;
          totalCreatedCrags += data.created_crags ?? 0;
          totalCreatedRoutes += data.created_routes ?? 0;
        }
      }

      this.ascentsService.refreshResources();
      this.outdoorData.areasListResource.reload();
      this.mapData.areasMapResource.reload();
      this.mapData.mapResource.reload();
      this.outdoorData.cragsListResource.reload();
      this.outdoorData.cragDetailResource.reload();
      this.cragRoutesData.cragRoutesResource.reload();

      progress$.next(100);

      let skippedInfo = '';
      if (totalSkipped > 0) {
        skippedInfo = ` (${this.translate.instant('import8a.skipped', {
          count: `<strong>${totalSkipped}</strong>`,
        })})`;
      }

      let createdInfo = '';
      if (
        totalCreatedAreas > 0 ||
        totalCreatedCrags > 0 ||
        totalCreatedRoutes > 0
      ) {
        createdInfo = '<br>';
        if (totalCreatedAreas > 0) {
          createdInfo += ` <strong>+${totalCreatedAreas}</strong> ${this.translate.instant(totalCreatedAreas === 1 ? 'area' : 'areas').toLowerCase()}`;
        }
        if (totalCreatedCrags > 0) {
          createdInfo += ` <strong>+${totalCreatedCrags}</strong> ${this.translate.instant(totalCreatedCrags === 1 ? 'crag' : 'crags').toLowerCase()}`;
        }
        if (totalCreatedRoutes > 0) {
          createdInfo += ` <strong>+${totalCreatedRoutes}</strong> ${this.translate.instant(totalCreatedRoutes === 1 ? 'route' : 'routes').toLowerCase()}`;
        }
      }

      this.notification.success(
        this.translate.instant('import8a.success', {
          importedCount: `<strong>${totalInserted}</strong>`,
          skippedInfo,
          createdInfo,
        }) + '.',
        'import8a.successTitle',
        false,
      );
      this.context.completeWith(true);
    } catch (e) {
      console.error(e);
      this.toast.error(this.translate.instant('import8a.errors.import'));
    } finally {
      this.importing.set(false);
      if (this.loaderClose$) {
        this.loaderClose$.next();
        this.loaderClose$.complete();
      }
    }
  }
}
