import { TestBed } from '@angular/core/testing';

import { VexService } from './vex.service';

describe('VexService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: VexService = TestBed.get(VexService);
    expect(service).toBeTruthy();
  });
});
