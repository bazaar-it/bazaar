'use client';

import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

interface CountryData {
  country: string;
  users: number;
  percentage: number;
}

interface WorldMapProps {
  data: CountryData[];
  height?: number;
}

// Map country names from Google Analytics to ISO codes
// Using both ISO-3166-1 alpha-3 codes and country name variations
const countryNameToISO: Record<string, string> = {
  // Countries from your data
  'Bangladesh': 'BGD',
  'India': 'IND',
  'Pakistan': 'PAK',
  'Indonesia': 'IDN',
  'United States': 'USA',
  'Belgium': 'BEL',
  
  // Common countries with ISO-3166-1 alpha-3 codes
  'United Kingdom': 'GBR',
  'Germany': 'DEU',
  'France': 'FRA',
  'Sri Lanka': 'LKA',
  'Norway': 'NOR',
  'Thailand': 'THA',
  'Iran': 'IRN',
  'Malaysia': 'MYS',
  'Egypt': 'EGY',
  'Vietnam': 'VNM',
  'Ireland': 'IRL',
  'Netherlands': 'NLD',
  'Canada': 'CAN',
  'Australia': 'AUS',
  'Brazil': 'BRA',
  'Japan': 'JPN',
  'South Korea': 'KOR',
  'China': 'CHN',
  'Russia': 'RUS',
  'Mexico': 'MEX',
  'Spain': 'ESP',
  'Italy': 'ITA',
  'Turkey': 'TUR',
  'Poland': 'POL',
  'Ukraine': 'UKR',
  'Argentina': 'ARG',
  'South Africa': 'ZAF',
  'Nigeria': 'NGA',
  'Kenya': 'KEN',
  'Ethiopia': 'ETH',
  'Philippines': 'PHL',
  'Singapore': 'SGP',
  'United Arab Emirates': 'ARE',
  'Saudi Arabia': 'SAU',
  'Israel': 'ISR',
  'Sweden': 'SWE',
  'Denmark': 'DNK',
  'Finland': 'FIN',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Portugal': 'PRT',
  'Greece': 'GRC',
  'Czech Republic': 'CZE',
  'Czechia': 'CZE',
  'Romania': 'ROU',
  'Hungary': 'HUN',
  'Bulgaria': 'BGR',
  'Serbia': 'SRB',
  'Croatia': 'HRV',
  'Chile': 'CHL',
  'Peru': 'PER',
  'Colombia': 'COL',
  'Venezuela': 'VEN',
  'Ecuador': 'ECU',
  'New Zealand': 'NZL',
  'Morocco': 'MAR',
  'Algeria': 'DZA',
  'Tunisia': 'TUN',
  'Libya': 'LBY',
  'Taiwan': 'TWN',
  'Hong Kong': 'HKG',
  'Macau': 'MAC',
  'Armenia': 'ARM',
  'Kazakhstan': 'KAZ',
};

// Create reverse mapping for debugging
const isoToCountryName: Record<string, string> = Object.entries(countryNameToISO).reduce((acc, [name, iso]) => {
  acc[iso] = name;
  return acc;
}, {} as Record<string, string>);

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap({ data, height = 400 }: WorldMapProps) {
  // Debug: Log the data we're receiving
  console.log('WorldMap received data:', data);
  
  // Create multiple maps for matching
  const countryDataByISO3 = new Map<string, CountryData>();
  const countryDataByName = new Map<string, CountryData>();
  
  // Process incoming data
  data.forEach(item => {
    const iso = countryNameToISO[item.country];
    if (iso) {
      countryDataByISO3.set(iso, item);
      console.log(`✓ Mapped "${item.country}" → ISO3: ${iso} (${item.users} users)`);
    } else {
      console.warn(`⚠ No ISO mapping for "${item.country}"`);
    }
    
    // Store by various name formats for fallback
    countryDataByName.set(item.country, item);
    countryDataByName.set(item.country.toLowerCase(), item);
    countryDataByName.set(item.country.toUpperCase(), item);
  });

  console.log('Country data maps created:', {
    byISO3: Array.from(countryDataByISO3.keys()),
    byName: Array.from(countryDataByName.keys()).filter(k => k === k.toLowerCase())
  });

  // Find max users for color scaling
  const maxUsers = Math.max(...data.map(d => d.users), 1);

  const getCountryColor = (geo: any) => {
    // Extract all possible identifiers from the geography object  
    const name = geo.properties.name || geo.properties.NAME;
    const iso3 = geo.properties.ISO_A3 || geo.properties.iso_a3;
    const iso2 = geo.properties.ISO_A2 || geo.properties.iso_a2;
    const nameEn = geo.properties.NAME_EN || geo.properties.name_en;
    const admin = geo.properties.ADMIN || geo.properties.admin;
    
    // Try to find country data using various methods
    let countryData = 
      (iso3 && countryDataByISO3.get(iso3)) ||
      (iso2 && countryDataByISO3.get(iso2)) ||
      (name && countryDataByName.get(name)) ||
      (nameEn && countryDataByName.get(nameEn)) ||
      (admin && countryDataByName.get(admin)) ||
      (name && countryDataByName.get(name.toLowerCase())) ||
      (nameEn && countryDataByName.get(nameEn?.toLowerCase())) ||
      (admin && countryDataByName.get(admin?.toLowerCase()));
    
    if (!countryData) {
      return '#E5E7EB'; // Gray for countries with no data
    }
    
    // Scale from light blue to dark blue based on user count
    const intensity = countryData.users / maxUsers;
    
    if (intensity > 0.8) return '#1e40af'; // blue-800
    if (intensity > 0.6) return '#2563eb'; // blue-600
    if (intensity > 0.4) return '#3b82f6'; // blue-500
    if (intensity > 0.2) return '#60a5fa'; // blue-400
    if (intensity > 0.1) return '#93c5fd'; // blue-300
    return '#dbeafe'; // blue-100
  };

  return (
    <div className="w-full" style={{ height }}>
      <ComposableMap
        projectionConfig={{
          scale: 140,
          center: [0, 20]
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              // Log first few geographies to understand structure
              if (geographies.length > 0 && Math.random() < 0.1) {
                console.log('Full geo object:', geographies[0]);
                console.log('Geo properties:', geographies[0].properties);
              }
              
              return geographies.map((geo) => {
                // The map data seems to use simple 'name' property
                const name = geo.properties.name || geo.properties.NAME;
                const iso3 = geo.properties.ISO_A3 || geo.properties.iso_a3;
                const iso2 = geo.properties.ISO_A2 || geo.properties.iso_a2;
                
                // Get country data using multiple matching strategies
                const countryData = 
                  (iso3 && countryDataByISO3.get(iso3)) ||
                  (iso2 && countryDataByISO3.get(iso2)) ||
                  (name && countryDataByName.get(name)) ||
                  (name && countryDataByName.get(name.toLowerCase()));
                
                // Log matches for countries with data (only log a sample)
                if (countryData && Math.random() < 0.1) {
                  console.log(`✅ Matched ${name} with ${countryData.users} users`);
                }
                
                const fillColor = getCountryColor(geo);
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{
                      default: {
                        outline: 'none',
                      },
                      hover: {
                        fill: countryData ? '#1e3a8a' : '#D1D5DB',
                        outline: 'none',
                        cursor: countryData ? 'pointer' : 'default',
                      },
                      pressed: {
                        outline: 'none',
                      },
                    }}
                  >
                    {countryData && (
                      <title>
                        {`${name}: ${countryData.users} users (${countryData.percentage}%)`}
                      </title>
                    )}
                  </Geography>
                );
              });
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Legend */}
      <div className="flex items-center justify-center mt-4 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span className="text-xs text-muted-foreground">No visitors</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <div className="w-4 h-4 bg-blue-300 rounded"></div>
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <div className="w-4 h-4 bg-blue-700 rounded"></div>
          <div className="w-4 h-4 bg-blue-900 rounded"></div>
          <span className="text-xs text-muted-foreground ml-1">More visitors</span>
        </div>
      </div>
    </div>
  );
}