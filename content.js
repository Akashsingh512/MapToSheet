// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeCurrent') {
    const data = scrapeCurrentBusiness();
    sendResponse({ success: !!data, data });
  } else if (request.action === 'scrapeAll') {
    const data = scrapeAllBusinesses();
    sendResponse({ success: data.length > 0, data });
  } else if (request.action === 'scrapeAllWithScroll') {
    scrapeAllWithScroll().then(data => {
      sendResponse({ success: data.length > 0, data });
    });
    return true; // Keep message channel open for async response
  }
  return true;
});

function scrapeCurrentBusiness() {
  try {
    const business = {};
    
    // Business name
    const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
    business.name = nameEl ? nameEl.textContent.trim() : '';
    
    // Phone number - multiple selectors
    let phoneEl = document.querySelector('button[data-item-id^="phone:tel:"]');
    if (!phoneEl) {
      phoneEl = document.querySelector('button[aria-label*="Phone"]');
    }
    if (!phoneEl) {
      // Try to find in the contact section
      const phoneButtons = document.querySelectorAll('button[data-tooltip*="Copy phone"]');
      phoneEl = phoneButtons[0];
    }
    
    if (phoneEl) {
      // Extract from data-item-id if available
      const dataItemId = phoneEl.getAttribute('data-item-id');
      if (dataItemId && dataItemId.includes('tel:')) {
        business.phone = dataItemId.replace('phone:tel:', '').replace('tel:', '');
      } else {
        // Extract from aria-label or text content
        const ariaLabel = phoneEl.getAttribute('aria-label');
        if (ariaLabel) {
          const phoneMatch = ariaLabel.match(/[\+\d][\d\s\-\(\)]+/);
          business.phone = phoneMatch ? phoneMatch[0].trim() : '';
        } else {
          business.phone = phoneEl.textContent.trim();
        }
      }
    } else {
      business.phone = '';
    }
    
    // Address
    const addressEl = document.querySelector('button[data-item-id^="address"]');
    if (addressEl) {
      const ariaLabel = addressEl.getAttribute('aria-label');
      business.address = ariaLabel || addressEl.textContent.trim();
    } else {
      business.address = '';
    }
    
    // Website
    const websiteEl = document.querySelector('a[data-item-id^="authority"]');
    business.website = websiteEl ? websiteEl.href : '';
    
    // Rating
    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    business.rating = ratingEl ? ratingEl.textContent.trim() : '';
    
    // Number of reviews
    const reviewsEl = document.querySelector('div.F7nice button[aria-label*="review"]');
    if (reviewsEl) {
      const ariaLabel = reviewsEl.getAttribute('aria-label');
      const match = ariaLabel.match(/(\d+[\d,]*)\s*review/i);
      business.reviews = match ? match[1] : '';
    } else {
      business.reviews = '';
    }
    
    // Category
    const categoryEl = document.querySelector('button.DkEaL');
    business.category = categoryEl ? categoryEl.textContent.trim() : '';
    
    // Timestamp
    business.extractedAt = new Date().toISOString();
    
    return business;
  } catch (error) {
    console.error('Error scraping business:', error);
    return null;
  }
}

function scrapeAllBusinesses() {
  const businesses = [];
  
  try {
    // Find all business cards in the results panel - updated selector
    const businessCards = document.querySelectorAll('div.Nv2PK, a.hfpxzc, div.bfdHYd.Ppzolf');
    
    businessCards.forEach((card, index) => {
      try {
        const business = {};
        
        // Business name
        const nameEl = card.querySelector('div.qBF1Pd.fontHeadlineSmall, div.fontHeadlineSmall');
        business.name = nameEl ? nameEl.textContent.trim() : '';
        
        // Phone number - using the UsdlK class (navigating through nested structure)
        const phoneEl = card.querySelector('span.UsdlK');
        business.phone = phoneEl ? phoneEl.textContent.trim() : '';
        
        // Rating
        const ratingEl = card.querySelector('span.MW4etd');
        business.rating = ratingEl ? ratingEl.textContent.trim() : '';
        
        // Number of reviews
        const reviewsEl = card.querySelector('span.UY7F9');
        business.reviews = reviewsEl ? reviewsEl.textContent.trim().replace(/[()]/g, '') : '';
        
        // Category - updated selector
        const categorySpans = card.querySelectorAll('div.W4Efsd span span');
        business.category = '';
        categorySpans.forEach(span => {
          const text = span.textContent.trim();
          // Look for category-like text (not address, not phone, not hours)
          if (text && !text.includes('Open') && !text.includes('Closed') && 
              !text.match(/\d{5,}/) && text.length > 3 && text.length < 50) {
            if (!business.category) {
              business.category = text;
            }
          }
        });
        
        // Address - look for address-like patterns
        const addressSpans = card.querySelectorAll('div.W4Efsd span');
        business.address = '';
        addressSpans.forEach(span => {
          const text = span.textContent.trim();
          // Look for address patterns (contains numbers, dashes, etc.)
          if (text && text.match(/[A-Z0-9]+-\d+|Floor|Block|Sector|Road|Street/i)) {
            business.address = text;
          }
        });
        
        // Website - try to find in the card
        const websiteEl = card.querySelector('a[href*="http"]');
        business.website = websiteEl && !websiteEl.href.includes('google.com') ? websiteEl.href : '';
        
        business.extractedAt = new Date().toISOString();
        
        if (business.name) {
          businesses.push(business);
        }
      } catch (error) {
        console.error(`Error scraping business ${index}:`, error);
      }
    });
    
  } catch (error) {
    console.error('Error scraping all businesses:', error);
  }
  
  return businesses;
}

async function scrapeAllWithScroll() {
  const allBusinesses = new Map(); // Use Map to prevent duplicates by name
  let previousCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 50; // Maximum scrolls to prevent infinite loop
  
  // Try multiple selectors to find the scrollable results panel
  let scrollableDiv = document.querySelector('div[role="feed"]');
  
  if (!scrollableDiv) {
    scrollableDiv = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf');
  }
  
  if (!scrollableDiv) {
    // Try to find by looking for the parent of business cards
    const firstCard = document.querySelector('div.bfdHYd.Ppzolf, div.Nv2PK, a.hfpxzc');
    if (firstCard) {
      scrollableDiv = firstCard.closest('div[style*="overflow"]') || 
                      firstCard.parentElement?.parentElement;
    }
  }
  
  if (!scrollableDiv) {
    console.error('Could not find scrollable results panel. Trying direct extraction...');
    // Fallback: just return current visible results
    return scrapeAllBusinesses();
  }
  
  console.log('Found scrollable div:', scrollableDiv);
  console.log('Starting auto-scroll extraction...');
  
  while (scrollAttempts < maxScrollAttempts) {
    // Scrape current visible businesses
    const currentBatch = scrapeAllBusinesses();
    
    console.log(`Batch found: ${currentBatch.length} businesses`);
    
    // Add to Map (automatically handles duplicates)
    currentBatch.forEach(business => {
      if (business.name && business.name.trim() !== '') {
        const key = `${business.name}-${business.phone || business.address}`;
        if (!allBusinesses.has(key)) {
          allBusinesses.set(key, business);
        }
      }
    });
    
    const currentCount = allBusinesses.size;
    console.log(`Scroll ${scrollAttempts + 1}: Total ${currentCount} unique businesses`);
    
    // Check if we've reached the end
    const isAtBottom = scrollableDiv.scrollHeight - scrollableDiv.scrollTop <= scrollableDiv.clientHeight + 100;
    
    if (isAtBottom && currentCount === previousCount) {
      console.log('Reached end of results');
      scrollAttempts++;
      if (scrollAttempts >= 3) {
        break;
      }
    } else if (currentCount === previousCount) {
      scrollAttempts++;
    } else {
      scrollAttempts = 0; // Reset counter when we find new results
      previousCount = currentCount;
    }
    
    // Scroll down
    scrollableDiv.scrollBy(0, 1000);
    
    // Wait for new results to load
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  console.log(`Extraction complete! Total unique businesses: ${allBusinesses.size}`);
  
  const results = Array.from(allBusinesses.values());
  
  if (results.length === 0) {
    // If no results from scrolling, try regular scraping
    console.log('No results from scrolling, falling back to regular scraping');
    return scrapeAllBusinesses();
  }
  
  return results;
}