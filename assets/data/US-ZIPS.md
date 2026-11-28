# US ZIP directory

`assets/js/us-zips.js` is a compact ZIP → city/state table compiled from the GeoNames US postal code file:

- Source: https://download.geonames.org/export/zip/US.zip
- Publisher: GeoNames (https://www.geonames.org/)
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)

The mockup loads this file locally and does not call an outside ZIP or geocoding API. Unknown 5-digit ZIPs are not marked invalid; staff enter city and state, and the app never invents a city.
