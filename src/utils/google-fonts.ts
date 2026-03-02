/**
 * Google Fonts Loader Utility
 * 
 * Dynamically loads Google Fonts based on selected font families
 */

export function loadGoogleFonts(fontFamilies: string[]) {
  // Extract Google Font names from font family strings
  const googleFonts = fontFamilies
    .filter(font => !font.includes('system-ui') && !font.includes('Arial') && !font.includes('Helvetica') && !font.includes('Georgia') && !font.includes('Times New Roman') && !font.includes('Verdana') && !font.includes('Trebuchet MS'))
    .map(font => font.split(',')[0].trim().replace(/'/g, ''))
    .filter(font => font !== 'Inter'); // Inter is already loaded by default

  if (googleFonts.length === 0) return;

  // Check if Google Fonts link already exists
  const existingLink = document.querySelector('link[data-google-fonts]');
  
  // Create Google Fonts URL
  const fontsQuery = googleFonts
    .map(font => font.replace(/ /g, '+'))
    .join('|');
  
  const googleFontsUrl = `https://fonts.googleapis.com/css2?${googleFonts.map(font => `family=${font.replace(/ /g, '+')}`).join('&')}&display=swap`;

  if (existingLink) {
    // Update existing link
    existingLink.setAttribute('href', googleFontsUrl);
  } else {
    // Create new link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontsUrl;
    link.setAttribute('data-google-fonts', 'true');
    document.head.appendChild(link);
  }
}

export function preloadGoogleFonts() {
  // Preload popular Google Fonts that are commonly used
  const popularFonts = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Source Sans Pro',
    'Nunito',
    'Raleway',
    'Playfair Display',
    'Merriweather',
    'Lora'
  ];

  loadGoogleFonts(popularFonts);
}