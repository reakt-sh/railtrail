import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RailLine } from '../../../schema-gen/railline';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RailLineService {

  constructor(
    private httpClient: HttpClient
  ) { }

  public getRailLine(): Observable<RailLine> {
    return this.httpClient.get<RailLine>(`${environment.assetsURLPrefix}/assets/raillines/${environment.railLine}.json`);
  }
}
