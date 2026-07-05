import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiEnvelope,
  ApiError,
  ApiErrorBody,
  ListEnvelope,
  ListResult,
} from '../models/api.model';
import { ListQuery } from '../models/query.model';

/**
 * Single typed gateway to the mock REST API.
 * Every feature service depends on this — no raw HttpClient in components.
 * Unwraps the `{ success, data }` envelope and maps `{ success:false, error }`
 * (or transport failures) into a normalized {@link ApiError}.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /** GET a single/object resource, unwrapping the data envelope. */
  get<T>(path: string, query?: ListQuery): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: this.buildParams(query) })
      .pipe(map((res) => res.data), catchError(this.handleError));
  }

  /** GET a list resource, keeping pagination + stats alongside rows. */
  getList<T>(path: string, query?: ListQuery): Observable<ListResult<T>> {
    return this.http
      .get<ListEnvelope<T>>(this.url(path), { params: this.buildParams(query) })
      .pipe(
        map((res) => ({
          data: res.data ?? [],
          pagination: res.pagination,
          stats: res.stats,
        })),
        catchError(this.handleError),
      );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(this.url(path), body)
      .pipe(map((res) => res.data), catchError(this.handleError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(this.url(path), body)
      .pipe(map((res) => res.data), catchError(this.handleError));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiEnvelope<T>>(this.url(path))
      .pipe(map((res) => res.data), catchError(this.handleError));
  }

  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private buildParams(query?: ListQuery): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return params;
  }

  private handleError = (err: HttpErrorResponse): Observable<never> => {
    // Normalize the API's `{ success:false, error }` envelope or a transport error.
    const body = err.error as ApiErrorBody | undefined;
    if (body && body.success === false && body.error) {
      return throwError(
        () => new ApiError(body.error.code, body.error.message, err.status, body.error.details),
      );
    }
    const message =
      err.status === 0
        ? 'Cannot reach the API. Is the mock server running on :8787?'
        : err.message || 'Unexpected error';
    return throwError(() => new ApiError('UNKNOWN', message, err.status));
  };
}
