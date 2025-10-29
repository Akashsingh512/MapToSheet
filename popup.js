const status = document.getElementById('status');
const count = document.getElementById('count');
const sheetUrlInput = document.getElementById('sheetUrl');
const webhookUrlInput = document.getElementById('webhookUrl');

// Load saved settings
chrome.storage.local.get(['sheetUrl', 'webhookUrl', 'businesses'], (result) => {
  if (result.sheetUrl) {
    sheetUrlInput.value = result.sheetUrl;
  }
  if (result.webhookUrl) {
    webhookUrlInput.value = result.webhookUrl;
  }
  updateCount(result.businesses || []);
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const sheetUrl = sheetUrlInput.value.trim();
  const webhookUrl = webhookUrlInput.value.trim();
  
  chrome.storage.local.set({ sheetUrl, webhookUrl }, () => {
    showStatus('Settings saved!', 'success');
  });
});

// Scrape current business
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('google.com/maps') && !tab.url.includes('google.co')) {
    showStatus('Please navigate to maps.google.com', 'error');
    return;
  }

  showStatus('Extracting business data...', 'info');
  
  try {
    // Try to inject content script if not already loaded
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (e) {
    // Script might already be injected, continue
  }
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeCurrent' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Please refresh the page and try again', 'error');
        return;
      }
      
      if (response && response.success) {
        saveBusiness(response.data);
        showStatus('Business data extracted successfully!', 'success');
      } else {
        showStatus('No business data found on this page', 'error');
      }
    });
  }, 100);
});

// Scrape all visible results
document.getElementById('scrapeAllBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('google.com/maps') && !tab.url.includes('google.co')) {
    showStatus('Please navigate to maps.google.com', 'error');
    return;
  }

  showStatus('Extracting all visible businesses...', 'info');
  
  try {
    // Try to inject content script if not already loaded
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (e) {
    // Script might already be injected, continue
  }
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeAll' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Please refresh the page and try again', 'error');
        return;
      }
      
      if (response && response.success && response.data.length > 0) {
        response.data.forEach(business => saveBusiness(business));
        showStatus(`Extracted ${response.data.length} businesses!`, 'success');
      } else {
        showStatus('No businesses found. Make sure search results are visible.', 'error');
      }
    });
  }, 100);
});

// Scrape all with auto-scroll
document.getElementById('scrapeAllScrollBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('google.com/maps') && !tab.url.includes('google.co')) {
    showStatus('Please navigate to maps.google.com', 'error');
    return;
  }

  showStatus('🔄 Auto-scrolling... Please wait, do not close this window.', 'info');
  document.getElementById('scrapeAllScrollBtn').disabled = true;
  
  try {
    // Try to inject content script if not already loaded
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (e) {
    // Script might already be injected, continue
  }
  
  // Add a progress updater
  const progressInterval = setInterval(() => {
    chrome.storage.local.get(['businesses'], (result) => {
      const count = (result.businesses || []).length;
      showStatus(`🔄 Extracting... Found ${count} businesses so far`, 'info');
    });
  }, 2000);
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeAllWithScroll' }, (response) => {
      clearInterval(progressInterval);
      document.getElementById('scrapeAllScrollBtn').disabled = false;
      
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message + '. Try refreshing the page.', 'error');
        return;
      }
      
      if (response && response.success && response.data.length > 0) {
        let newCount = 0;
        response.data.forEach(business => {
          const wasSaved = saveBusiness(business);
          if (wasSaved !== false) newCount++;
        });
        showStatus(`✅ Extracted ${response.data.length} unique businesses!`, 'success');
      } else if (response && response.data.length === 0) {
        showStatus('No businesses found. Make sure you have search results visible on the left panel.', 'error');
      } else {
        showStatus('Failed to extract. Make sure search results are visible.', 'error');
      }
    });
  }, 100);
});

// Export to CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  chrome.storage.local.get(['businesses'], (result) => {
    const businesses = result.businesses || [];
    
    if (businesses.length === 0) {
      showStatus('No data to export', 'error');
      return;
    }

    const csv = convertToCSV(businesses);
    downloadCSV(csv, 'google_maps_businesses.csv');
    showStatus('CSV downloaded successfully!', 'success');
  });
});

// Export to Google Sheets
document.getElementById('exportSheetBtn').addEventListener('click', async () => {
  const sheetUrl = sheetUrlInput.value.trim();
  
  if (!sheetUrl) {
    showStatus('Please enter and save Google Sheets URL first', 'error');
    return;
  }

  chrome.storage.local.get(['businesses'], async (result) => {
    const businesses = result.businesses || [];
    
    if (businesses.length === 0) {
      showStatus('No data to export', 'error');
      return;
    }

    showStatus('Exporting to Google Sheets...', 'info');
    
    try {
      await exportToGoogleSheets(sheetUrl, businesses);
      showStatus('Successfully exported to Google Sheets!', 'success');
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });
});

// Clear all data
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all stored business data? This cannot be undone.')) {
    chrome.storage.local.set({ businesses: [] }, () => {
      updateCount([]);
      showStatus('All data cleared!', 'success');
    });
  }
});

function saveBusiness(business) {
  chrome.storage.local.get(['businesses', 'webhookUrl'], async (result) => {
    const businesses = result.businesses || [];
    const webhookUrl = result.webhookUrl;
    
    // Check for duplicates using name AND address
    const isDuplicate = businesses.some(b => 
      b.name === business.name && 
      b.address === business.address &&
      b.name !== '' // Don't skip if name is empty
    );
    
    if (!isDuplicate && business.name) {
      businesses.push(business);
      chrome.storage.local.set({ businesses }, () => {
        updateCount(businesses);
      });
      
      // Auto-sync to Google Sheets if webhook URL is set
      if (webhookUrl) {
        try {
          await sendToGoogleSheets(webhookUrl, business);
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    }
  });
}

function updateCount(businesses) {
  count.textContent = `Stored: ${businesses.length} business(es)`;
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

function convertToCSV(data) {
  const headers = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Category'];
  const rows = data.map(b => [
    b.name || '',
    b.phone || '',
    b.address || '',
    b.website || '',
    b.rating || '',
    b.reviews || '',
    b.category || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToGoogleSheets(sheetUrl, businesses) {
  // Extract sheet ID from URL
  const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) {
    throw new Error('Invalid Google Sheets URL');
  }
  
  const sheetId = sheetIdMatch[1];
  
  // Prepare data for Google Sheets
  const headers = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Category', 'Extracted At'];
  const rows = businesses.map(b => [
    b.name || '',
    b.phone || '',
    b.address || '',
    b.website || '',
    b.rating || '',
    b.reviews || '',
    b.category || '',
    b.extractedAt || ''
  ]);
  
  const data = [headers, ...rows];
  
  // Convert to CSV format for Google Sheets import
  const csvData = data.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  // Create form data
  const formData = new FormData();
  formData.append('data', csvData);
  
  // Note: Direct API integration requires OAuth
  // For now, we'll open the sheet and show instructions
  const message = `To export to Google Sheets:\n\n1. Click "Export to CSV" button\n2. Open your Google Sheet\n3. Go to File → Import → Upload\n4. Select the downloaded CSV file\n5. Choose "Replace data at selected cell" or "Append rows"\n\nFor automatic sync, you need to:\n1. Make your sheet publicly editable\n2. Use Google Apps Script or Sheets API (requires OAuth setup)`;
  
  // Open the Google Sheet in a new tab
  window.open(sheetUrl, '_blank');
  
  throw new Error(message);
}

async function sendToGoogleSheets(webhookUrl, data) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  return response;
}