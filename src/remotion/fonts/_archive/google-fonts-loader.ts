// src/remotion/fonts/google-fonts-loader.ts
// Google Fonts CDN loader - works everywhere including Lambda
// Following official Remotion documentation: https://www.remotion.dev/docs/fonts

import { loadFont as remotionLoadFont } from '@remotion/fonts';

// Wrapper to prevent loadFont from running in Lambda
const loadFont = async (options: any) => {
  // Check if we're in Lambda by looking at the URL
  if (typeof window !== 'undefined' && 
      (window.location?.href?.includes('remotionlambda') || 
       window.location?.href?.includes('s3.amazonaws.com'))) {
    console.log('[Font Skip] Lambda detected, skipping loadFont for', options.family);
    return;
  }
  return remotionLoadFont(options);
};

// Map of font families to their Google Fonts URLs
// These are the actual Google Fonts CDN URLs that work everywhere
const GOOGLE_FONTS_MAP: Record<string, Record<string, string>> = {
  'Inter': {
    '100': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeAZ9hiA.woff2',
    '200': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfAZ9hiA.woff2',
    '300': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfAZ9hiA.woff2',
    '400': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
    '500': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2',
    '600': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2',
    '700': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2',
    '800': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hiA.woff2',
    '900': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYAZ9hiA.woff2',
  },
  'DM Sans': {
    '400': 'https://fonts.gstatic.com/s/dmsans/v11/rP2Hp2ywxg089UriCZ2IHSeH.woff2',
    '500': 'https://fonts.gstatic.com/s/dmsans/v11/rP2Cp2ywxg089UriAWCrCBamC2QX.woff2',
    '700': 'https://fonts.gstatic.com/s/dmsans/v11/rP2Cp2ywxg089UriASitCBamC2QX.woff2',
  },
  'Roboto': {
    '300': 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmSU5fBBc4.woff2',
    '400': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
    '500': 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2',
    '700': 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2',
  },
  'Poppins': {
    '300': 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1xlFQ.woff2',
    '400': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2',
    '500': 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9Z1xlFQ.woff2',
    '600': 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2',
    '700': 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
  },
  'Montserrat': {
    '300': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
    '400': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WRhyw.woff2',
    '500': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459W1hyw.woff2',
    '600': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WZhyw.woff2',
    '700': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wdhyw.woff2',
  },
  'Playfair Display': {
    '400': 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2',
    '700': 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKebvXDXbtM.woff2',
  },
  'Merriweather': {
    '300': 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l521wRZWMf6.woff2',
    '400': 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l52xwNZ.woff2',
    '700': 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l52_wFZWMf6.woff2',
  },
  'Lobster': {
    '400': 'https://fonts.gstatic.com/s/lobster/v28/neILzCirqoswsqX9zo-mM5Ez.woff2',
  },
  'Dancing Script': {
    '400': 'https://fonts.gstatic.com/s/dancingscript/v24/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup5.woff2',
    '700': 'https://fonts.gstatic.com/s/dancingscript/v24/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i43Sup5.woff2',
  },
  'Pacifico': {
    '400': 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6Mw.woff2',
  },
  'Fira Code': {
    '300': 'https://fonts.gstatic.com/s/firacode/v21/uU9NCBsR6Z2vfE9aq3bh0dSDqFGedA.woff2',
    '400': 'https://fonts.gstatic.com/s/firacode/v21/uU9NCBsR6Z2vfE9aq3bh3dSD.woff2',
    '500': 'https://fonts.gstatic.com/s/firacode/v21/uU9NCBsR6Z2vfE9aq3bh9dSDqFGedA.woff2',
    '600': 'https://fonts.gstatic.com/s/firacode/v21/uU9NCBsR6Z2vfE9aq3bhwdODqFGedA.woff2',
    '700': 'https://fonts.gstatic.com/s/firacode/v21/uU9NCBsR6Z2vfE9aq3bh3dODqFGedA.woff2',
  },
  'JetBrains Mono': {
    '400': 'https://fonts.gstatic.com/s/jetbrainsmono/v13/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yK1jPVmUsaaDhw.woff2',
    '700': 'https://fonts.gstatic.com/s/jetbrainsmono/v13/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8lqlkPVmUsaaDhw.woff2',
  },
  'Raleway': {
    '200': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2',
    '300': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyCMIT4ttDfA.woff2',
    '400': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2',
    '500': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyCkIT4ttDfA.woff2',
    '600': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyCsIT4ttDfA.woff2',
    '700': 'https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyCoIT4ttDfA.woff2',
  },
  'Ubuntu': {
    '300': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCv6KVjbNBYlgoC1CzjsGyN.woff2',
    '400': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCs6KVjbNBYlgoKfw72.woff2',
    '500': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCv6KVjbNBYlgoCjC3jsGyN.woff2',
    '700': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCv6KVjbNBYlgoCxCvjsGyN.woff2',
  },
  'Bebas Neue': {
    '400': 'https://fonts.gstatic.com/s/bebasneue/v9/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2',
  },
  'Plus Jakarta Sans': {
    '200': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KU7NShXUEKi4Rw.woff2',
    '300': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_907NShXUEKi4Rw.woff2',
    '400': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU7NShXUEKi4Rw.woff2',
    '500': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_m07NShXUEKi4Rw.woff2',
    '600': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_40nNShXUEKi4Rw.woff2',
    '700': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_3knNShXUEKi4Rw.woff2',
    '800': 'https://fonts.gstatic.com/s/plusjakartasans/v7/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KUnNShXUEKi4Rw.woff2',
  },
  'Space Mono': {
    '400': 'https://fonts.gstatic.com/s/spacemono/v12/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff2',
    '700': 'https://fonts.gstatic.com/s/spacemono/v12/i7dMIFZifjKcF5UAWdDRaPpZYFKQHw.woff2',
  },
  'Ubuntu Mono': {
    '400': 'https://fonts.gstatic.com/s/ubuntumono/v15/KFOjCneDtsqEr0keqCMhbCc6CsQ.woff2',
    '700': 'https://fonts.gstatic.com/s/ubuntumono/v15/KFO-CneDtsqEr0keqCMhbC-BL9H1tY0.woff2',
  },
  'Abril Fatface': {
    '400': 'https://fonts.gstatic.com/s/abrilfatface/v19/zOL64pLDlL1D99S8g8PtiKchm-BsjOLhZBY.woff2',
  },
  'Allura': {
    '400': 'https://fonts.gstatic.com/s/allura/v19/9oRPNYsQpS4zjuA_iwgW.woff2',
  },
  'Anton': {
    '400': 'https://fonts.gstatic.com/s/anton/v23/1Ptgg87LROyAm3Kz-C8.woff2',
  },
  'Bangers': {
    '400': 'https://fonts.gstatic.com/s/bangers/v21/FeVQS0BTqb0h60ACH55Q2J5h.woff2',
  },
  'Crimson Text': {
    '400': 'https://fonts.gstatic.com/s/crimsontext/v19/wlp2gwHKFkZgtmSR3NB0oRJvaAJSA_JN3Q.woff2',
    '600': 'https://fonts.gstatic.com/s/crimsontext/v19/wlppgwHKFkZgtmSR3NB0oRJX1C1GDNNQ9rJPfw.woff2',
    '700': 'https://fonts.gstatic.com/s/crimsontext/v19/wlppgwHKFkZgtmSR3NB0oRJX1C1GEtNQ9rJPfw.woff2',
  },
  'Fredoka One': {
    '400': 'https://fonts.gstatic.com/s/fredokaone/v14/k3kUo8kEI-tA1RRcTZGmTlHGCac.woff2',
  },
  'Fredoka': {
    '400': 'https://fonts.gstatic.com/s/fredoka/v14/X7nP4b87HvSqjb_WIi2yDCRwoQ_k7367_B-i2yQag0-mac3OryLMFuOLlNldbw.woff2',
  },
  'Great Vibes': {
    '400': 'https://fonts.gstatic.com/s/greatvibes/v15/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.woff2',
  },
  'Kaushan Script': {
    '400': 'https://fonts.gstatic.com/s/kaushanscript/v14/vm8vdRfvXFLG3OLnsO15WYS5DF7_ytN3M48a.woff2',
  },
  'Libre Baskerville': {
    '400': 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0pNeYRI4CN2V.woff2',
    '700': 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKiZrc3Hgbbcjq75U4uslyuy4kn0qviTjYwI8Gcw6Oi.woff2',
  },
  'Lobster Two': {
    '400': 'https://fonts.gstatic.com/s/lobstertwo/v18/BngRUXZGTXPUvIoyV6yN5-fN5qU.woff2',
    '700': 'https://fonts.gstatic.com/s/lobstertwo/v18/BngTUXZGTXPUvIoyV6yN5-fI3hyEwRiof_U.woff2',
  },
  'Noto Sans JP': {
    '400': 'https://fonts.gstatic.com/s/notosansjp/v42/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.woff2',
    '700': 'https://fonts.gstatic.com/s/notosansjp/v42/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.woff2',
  },
  'Righteous': {
    '400': 'https://fonts.gstatic.com/s/righteous/v14/1cXxaUPXBpj2rGoU7C9WiHGF.woff2',
  },
  'Satisfy': {
    '400': 'https://fonts.gstatic.com/s/satisfy/v17/rP2Hp2ywxg089UriCZ2IHSeH.woff2',
  },
  'Oswald': {
    '300': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs13FvsUtiZTaR.woff2',
    '400': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs1PFvsUtiZTaR.woff2',
    '500': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs1MNvsUtiZTaR.woff2',
    '600': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs1D1osUtiZTaR.woff2',
    '700': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs1BRosUtiZTaR.woff2',
  },
  'Archivo Black': {
    '400': 'https://fonts.gstatic.com/s/archivoblack/v17/HTxqL289NzCGg4MzN6KJ7eW6CYyF_g.woff2',
  },
  'League Spartan': {
    '400': 'https://fonts.gstatic.com/s/leaguespartan/v6/kJEqBuEW6A0lliaV_m88ja5Twtx8BWhtkDVmjZvM_oXpBMdcFguczA.woff2',
    '700': 'https://fonts.gstatic.com/s/leaguespartan/v6/kJEqBuEW6A0lliaV_m88ja5Twtx8BWhtkDVmjZvMgoTpBMdcFguczA.woff2',
  },
  'Open Sans': {
    '300': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2',
    '400': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu1aB.woff2',
    '500': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSOmu1aB.woff2',
    '600': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTQKmu1aB.woff2',
    '700': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTXqmu1aB.woff2',
  },
  'Lato': {
    '300': 'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh7USSwiPGQ.woff2',
    '400': 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXg.woff2',
    '700': 'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ.woff2',
  },
  'Work Sans': {
    '300': 'https://fonts.gstatic.com/s/worksans/v18/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K3vXNi0Dp6_cOyA.woff2',
    '400': 'https://fonts.gstatic.com/s/worksans/v18/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K0nXNi0Dp6_cOyA.woff2',
    '500': 'https://fonts.gstatic.com/s/worksans/v18/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32KxfXNi0Dp6_cOyA.woff2',
    '600': 'https://fonts.gstatic.com/s/worksans/v18/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K67QNi0Dp6_cOyA.woff2',
    '700': 'https://fonts.gstatic.com/s/worksans/v18/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K5bQNi0Dp6_cOyA.woff2',
  },
  'Source Code Pro': {
    '400': 'https://fonts.gstatic.com/s/sourcecodepro/v22/HI_diYsKILxRpg3hIP6sJ7fM7PqPMcMnZFqUwX28DMyQhM5hTXUcdJg.woff2',
    '700': 'https://fonts.gstatic.com/s/sourcecodepro/v22/HI_diYsKILxRpg3hIP6sJ7fM7PqPMcMnZFqUwX28DMyQhM5hTXUcdJg.woff2',
  },
  'IBM Plex Mono': {
    '400': 'https://fonts.gstatic.com/s/ibmplexmono/v12/-F63fjptAgt5VM-kVkqdyU8n5igg1l9kn-s.woff2',
    '700': 'https://fonts.gstatic.com/s/ibmplexmono/v12/-F6pfjptAgt5VM-kVkqdyU8n3kwq0n1hj-sNFQ.woff2',
  },
  'Roboto Mono': {
    '400': 'https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW4.woff2',
    '700': 'https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW4.woff2',
  },
  'Lora': {
    '400': 'https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqs.woff2',
    '700': 'https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuGQbT0gvTJPa787z5vxJBkqs.woff2',
  },
  'Crimson Pro': {
    '400': 'https://fonts.gstatic.com/s/crimsonpro/v23/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm18OJE_VNWoyQ.woff2',
    '700': 'https://fonts.gstatic.com/s/crimsonpro/v23/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm1yPZE_VNWoyQ.woff2',
  },
  'EB Garamond': {
    '400': 'https://fonts.gstatic.com/s/ebgaramond/v26/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-2fRUA4V-e9x4.woff2',
    '700': 'https://fonts.gstatic.com/s/ebgaramond/v26/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-NfFUA4V-e9x4.woff2',
  },
  'Caveat': {
    '400': 'https://fonts.gstatic.com/s/caveat/v17/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9eIWpYA.woff2',
    '700': 'https://fonts.gstatic.com/s/caveat/v17/WnznHAc5bAfYB2QRah7pcpNvOx-pjSZ6eIWpYA.woff2',
  },
  // Popular display fonts
  'Audiowide': {
    '400': 'https://fonts.gstatic.com/s/audiowide/v16/l7gdbjpo0cum0ckerWCtkQXPExpQBw.woff2',
  },
  'Oxanium': {
    '400': 'https://fonts.gstatic.com/s/oxanium/v14/RrQPboN_4yJ0JmiMUW7sIp8fUejDII-NNNtJmQ.woff2',
    '700': 'https://fonts.gstatic.com/s/oxanium/v14/RrQPboN_4yJ0JmiMUW7sIp8fUejDII-lM9tJmQ.woff2',
  },
  'Exo 2': {
    '400': 'https://fonts.gstatic.com/s/exo2/v20/7cH1v4okm5zmbvwkAx_sfcEuiD8jvvKsOdC6.woff2',
    '700': 'https://fonts.gstatic.com/s/exo2/v20/7cH1v4okm5zmbvwkAx_sfcEuiD8jjvOsOdC6.woff2',
  },
  'Space Grotesk': {
    '400': 'https://fonts.gstatic.com/s/spacegrotesk/v13/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUXskPMBBSSJLm2E.woff2',
    '700': 'https://fonts.gstatic.com/s/spacegrotesk/v13/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62VnkkPMBBSSJLm2E.woff2',
  },
  'Outfit': {
    '400': 'https://fonts.gstatic.com/s/outfit/v6/QGYyz_MVcBeNP4NjuGObqx1XmO1I4W61O4a0Fg.woff2',
    '700': 'https://fonts.gstatic.com/s/outfit/v6/QGYyz_MVcBeNP4NjuGObqx1XmO1I4bC0O4a0Fg.woff2',
  },
  'Manrope': {
    '400': 'https://fonts.gstatic.com/s/manrope/v13/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk59FO_F87jxeN7B.woff2',
    '700': 'https://fonts.gstatic.com/s/manrope/v13/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk6GEu_F87jxeN7B.woff2',
  },
  'Sora': {
    '400': 'https://fonts.gstatic.com/s/sora/v11/xMQOuFFYT72X5wkB_18qmnndmSdSn3-KIwNhBti0.woff2',
    '700': 'https://fonts.gstatic.com/s/sora/v11/xMQOuFFYT72X5wkB_18qmnndmSdSn0-NKANhBti0.woff2',
  },
};

const loaded = new Set<string>();

export async function ensureFontLoaded(family: string, weight: string = '400') {
  const key = `${family}:${weight}`;
  
  if (loaded.has(key)) {
    console.log(`[Google Fonts Loader] Font already loaded: ${family} weight ${weight}`);
    return;
  }

  // CRITICAL: Skip font loading in Lambda environment
  // Check multiple ways to detect Lambda
  const isLambda = 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_EXECUTION_ENV ||
    (typeof window !== 'undefined' && 
     (window.location?.href?.includes('remotionlambda') || 
      window.location?.href?.includes('s3.amazonaws.com')));
      
  if (isLambda) {
    console.log(`[Google Fonts Loader] Lambda detected - skipping font load for ${family}:${weight}`);
    loaded.add(key);
    return;
  }

  // Check if we have this font in our Google Fonts map
  const fontFamily = GOOGLE_FONTS_MAP[family];
  if (!fontFamily) {
    console.warn(`[Google Fonts Loader] Font "${family}" not in Google Fonts map - using CSS fallback`);
    loaded.add(key); // Mark as handled to avoid retries
    return;
  }

  const fontUrl = fontFamily[weight];
  if (!fontUrl) {
    // Try to find nearest weight
    const availableWeights = Object.keys(fontFamily);
    const nearestWeight = availableWeights.reduce((prev, curr) => {
      return Math.abs(Number(curr) - Number(weight)) < Math.abs(Number(prev) - Number(weight)) ? curr : prev;
    });
    
    console.log(`[Google Fonts Loader] Weight ${weight} not available for ${family}, using nearest: ${nearestWeight}`);
    const nearestUrl = fontFamily[nearestWeight];
    
    if (!nearestUrl) {
      console.warn(`[Google Fonts Loader] No valid weight found for ${family} - using CSS fallback`);
      loaded.add(key);
      return;
    }
    
    try {
      await loadFont({
        family: family,
        url: nearestUrl,
        weight: nearestWeight,
      });
      loaded.add(key);
      console.log(`[Google Fonts Loader] ✅ Loaded ${family} weight ${nearestWeight} (requested ${weight}) from Google Fonts`);
    } catch (error) {
      console.error(`[Google Fonts Loader] Failed to load ${family}:`, error);
      loaded.add(key); // Mark as handled even on failure
    }
    return;
  }

  try {
    await loadFont({
      family: family,
      url: fontUrl,
      weight: weight,
    });
    loaded.add(key);
    console.log(`[Google Fonts Loader] ✅ Loaded ${family} weight ${weight} from Google Fonts`);
  } catch (error) {
    console.error(`[Google Fonts Loader] Failed to load ${family} weight ${weight}:`, error);
    loaded.add(key); // Mark as handled even on failure
  }
}

export async function ensureFonts(fonts: Array<{family: string; weight?: string}>) {
  // Skip font loading entirely in Lambda
  const isLambda = 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_EXECUTION_ENV ||
    (typeof window !== 'undefined' && 
     (window.location?.href?.includes('remotionlambda') || 
      window.location?.href?.includes('s3.amazonaws.com')));
      
  if (isLambda) {
    console.log(`[Google Fonts Loader] Lambda detected - skipping all font loading`);
    fonts.forEach(f => loaded.add(`${f.family}:${f.weight ?? '400'}`));
    return;
  }
  
  console.log(`[Google Fonts Loader] Loading ${fonts.length} fonts from Google Fonts CDN...`);
  
  // Load all fonts in parallel
  const promises = fonts.map(f => ensureFontLoaded(f.family, f.weight ?? '400'));
  await Promise.allSettled(promises);
  
  console.log(`[Google Fonts Loader] Font loading complete`);
}

// For preloading common fonts
export async function preloadCommonFonts() {
  // Skip in Lambda environment
  const isLambda = 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_EXECUTION_ENV ||
    (typeof window !== 'undefined' && 
     (window.location?.href?.includes('remotionlambda') || 
      window.location?.href?.includes('s3.amazonaws.com')));
      
  if (isLambda) {
    console.log('[Google Fonts Loader] Lambda detected - skipping font preload');
    return;
  }
  
  const commonFonts = [
    { family: 'Inter', weight: '400' },
    { family: 'Inter', weight: '700' },
    { family: 'DM Sans', weight: '400' },
    { family: 'DM Sans', weight: '700' },
  ];
  
  await ensureFonts(commonFonts);
}