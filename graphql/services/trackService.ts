import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrackService {
  private graphqlEndpoint = environment.MasterApi + '/graphql'; // Assuming your GraphQL endpoint is /graphql

  constructor(private http: HttpClient) {}

  import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrackService {
  private graphqlEndpoint = environment.MasterApi + '/graphql';

  constructor(private http: HttpClient) {}

  private sendGraphQLRequest(query: string, variables: any = {}): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // --- IMPORTANT: Replace this with your actual token retrieval logic ---
    const yourAuthToken = localStorage.getItem('yourAuthTokenKey'); // Example: Get token from local storage
    if (yourAuthToken) {
      headers = headers.set('Authorization', `Bearer ${yourAuthToken}`);
    }
    // ---------------------------------------------------------------------

    return this.http.post(this.graphqlEndpoint, { query, variables }, { headers }).pipe(
      map((response: any) => {
        if (response.errors) {
          console.error('GraphQL Errors:', response.errors);
          throw new Error(response.errors[0].message || 'GraphQL error occurred');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('HTTP Error sending GraphQL request:', error);
        return throwError(() => new Error('Failed to send GraphQL request'));
      })
    );
  }

  saveData(formData: any, imgParam: string): Observable<string> {
    const mutation = `
      mutation SaveTrackData($input: FormDataInput!) {
        saveTrackData(input: $input) {
          message
        }
      }
    `;
    const variables = {
      input: {
        formData,
        imgParam,
      },
    };

    return this.sendGraphQLRequest(mutation, variables).pipe(
      map((data) => data.saveTrackData.message)
    );
  }

  getTrackData(imgParam: string): Observable<any[]> {
    const query = `
      query GetTrackData($imgParam: String!) {
        getTrackData(imgParam: $imgParam) {
          value_data
          timestamp
        }
      }
    `;
    const variables = { imgParam };

    return this.sendGraphQLRequest(query, variables).pipe(
      map((data) => data.getTrackData)
    );
  }

  generateExcel(imgParam: string): Observable<Blob> {
    const query = `
      query ExportTrackExcel($imgParam: String!) {
        exportTrackExcel(imgParam: $imgParam)
      }
    `;
    const variables = { imgParam };

    return this.sendGraphQLRequest(query, variables).pipe(
      map((data) => data.exportTrackExcel),
      catchError((error) => {
        console.error('Error getting Excel URL from GraphQL:', error);
        return throwError(() => new Error('Failed to get Excel file URL'));
      }),
      switchMap((fileUrl: string) => {
        if (!fileUrl) {
          return throwError(() => new Error('Excel file URL is empty'));
        }
        const fullFileUrl = fileUrl.startsWith('/') ? environment.MasterApi + fileUrl : fileUrl;
        return this.http.get(fullFileUrl, { responseType: 'blob' }).pipe(
          catchError((downloadError) => {
            console.error('Error downloading Excel file:', downloadError);
            return throwError(() => new Error('Failed to download Excel file'));
          })
        );
      })
    );
  }

  generatePdf(imgParam: string): Observable<Blob> {
    const query = `
      query ExportTrackPdf($imgParam: String!) {
        exportTrackPdf(imgParam: $imgParam)
      }
    `;
    const variables = { imgParam };

    return this.sendGraphQLRequest(query, variables).pipe(
      map((data) => data.exportTrackPdf),
      catchError((error) => {
        console.error('Error getting PDF URL from GraphQL:', error);
        return throwError(() => new Error('Failed to get PDF file URL'));
      }),
      switchMap((fileUrl: string) => {
        if (!fileUrl) {
          return throwError(() => new Error('PDF file URL is empty'));
        }
        const fullFileUrl = fileUrl.startsWith('/') ? environment.MasterApi + fileUrl : fileUrl;
        return this.http.get(fullFileUrl, { responseType: 'blob' }).pipe(
          catchError((downloadError) => {
            console.error('Error downloading PDF file:', downloadError);
            return throwError(() => new Error('Failed to download PDF file'));
          })
        );
      })
    );
  }

  downloadFile(blob: Blob, filename: string, type: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
}
