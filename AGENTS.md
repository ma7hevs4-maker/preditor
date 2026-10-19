# Architecture rules
- Central Climática cards and exports share the pure operational calculations in `climateOperationalExport.ts` to keep displayed and downloaded numbers consistent.
- Climate exports reuse the existing weather/history query cache and aggregate branch volumes before rounding team requirements, preventing extra forecast calls and inflated Polo totals.