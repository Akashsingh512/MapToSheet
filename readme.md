# 🗺️ MapToSheet

A powerful Chrome extension that extracts business information from Google Maps and exports it to Google Sheets or CSV files. Perfect for lead generation, market research, and competitor analysis.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## ✨ Features

- 🔍 **Extract Business Data** - Name, phone number, address, website, rating, reviews, and category
- 🚀 **Auto-Scroll Extraction** - Automatically scrolls through all search results and extracts everything
- 📊 **Google Sheets Integration** - Direct export to Google Sheets in real-time
- 💾 **CSV Export** - Download data as CSV file
- 🎯 **Duplicate Prevention** - Smart filtering to avoid duplicate entries
- ⚡ **Fast & Efficient** - Extract hundreds of businesses in minutes
- 🔒 **Privacy-Focused** - All data stored locally in your browser

## 📸 Screenshots

![Extension Popup](/image1.png)
*Extension interface with all features*

![Google Maps Extraction](/image.png)
*Extracting businesses from Google Maps*

## 🚀 Installation

### Step 1: Download the Extension

1. Clone this repository or download as ZIP:
```bash
git clone https://github.com/Akashsingh512/MapToSheet
```

2. Or click the green "Code" button above and select "Download ZIP", then extract it.

### Step 2: Install in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the folder containing the extension files
5. The extension icon should appear in your Chrome toolbar

### Step 3: Create Extension Icons (Optional)

If you don't have icon files, create three simple PNG icons:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Or download free icons from [Flaticon](https://www.flaticon.com/) or [Icons8](https://icons8.com/).

## 📖 Usage Guide

### Basic Extraction

1. **Open Google Maps**
   - Navigate to [maps.google.com](https://maps.google.com)
   - Search for businesses (e.g., "restaurants in New York", "digital marketing agency in London")

2. **Choose Extraction Method**
   - **Extract Current Business** - Click on a business, then extract (gets complete details)
   - **Extract Visible Results (Quick)** - Extracts only visible businesses on screen (10-20 results)
   - **Extract All with Auto-Scroll** ⭐ - Automatically scrolls and extracts ALL results (100+ businesses)

3. **Export Your Data**
   - **Export to CSV** - Download data immediately
   - **Open Google Sheet** - View/export to your configured Google Sheet

### Google Sheets Integration (Recommended)

For automatic real-time export to Google Sheets:

#### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it (e.g., "Google Maps Business Data")

#### Step 2: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy and paste this code:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check if headers exist, if not add them
    if (sheet.getLastRow() === 0) {
      const headers = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Category', 'Extracted At'];
      sheet.appendRow(headers);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Add the data
    if (Array.isArray(data)) {
      data.forEach(business => {
        sheet.appendRow([
          business.name || '',
          business.phone || '',
          business.address || '',
          business.website || '',
          business.rating || '',
          business.reviews || '',
          business.category || '',
          business.extractedAt || new Date().toISOString()
        ]);
      });
    } else {
      sheet.appendRow([
        data.name || '',
        data.phone || '',
        data.address || '',
        data.website || '',
        data.rating || '',
        data.reviews || '',
        data.category || '',
        data.extractedAt || new Date().toISOString()
      ]);
    }
    
    sheet.autoResizeColumns(1, 8);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data added successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **Save** (disk icon)
5. Name your project (e.g., "Maps Data Receiver")

#### Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Select **Web app**
4. Configure:
   - **Description:** Maps Data API
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**
6. Click **Authorize access** and follow the prompts
7. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/.../exec`)

#### Step 4: Configure Extension

1. Click the extension icon in Chrome
2. Paste the **Web App URL** into the "Google Apps Script Web App URL" field
3. Click **Save Settings**

Now all extracted data will automatically appear in your Google Sheet! 🎉

### Google Sheets Duplicate Remover (by Column A)

A lightweight Google Apps Script that automatically removes duplicate rows from a Google Sheet by checking **Column A** values — keeping only the **first occurrence** of each unique value.

---

```javascript
function deleteDuplicatesByColumnA() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  const seen = new Set();
  const rowsToKeep = [];
  let deletedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const value = data[i][0]; // Column A value (0-based index)
    if (!seen.has(value)) {
      seen.add(value);
      rowsToKeep.push(data[i]);
    } else {
      deletedCount++;
    }
  }

  // Clear the existing data and write back only the unique rows
  sheet.clearContents();
  sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${deletedCount} duplicate row(s) deleted (based on Column A)`,
    "Cleanup Complete",
    5
  );
}
```

### Setup Instructions

1. Open your Google Sheet.
2. Go to Extensions → Apps Script.

3. Delete any existing code and paste the above script.

4. Save the script (e.g., DuplicateRemover.gs).

5. Click ▶️ Run → deleteDuplicatesByColumnA.

6. Click Authorize access
7. Choose your Google account
8. Click Advanced → Go to [project name] (unsafe)
9. Click Allow
Allow the necessary permissions (only once).


10. Go to Triggers (⏰ icon in Apps Script).

11. Click Add Trigger.

    Choose:

    Function: deleteDuplicatesByColumnA

    Event Type: “On Change or “On edit”

12. Save it — now the script runs automatically.


## 🎯 Best Practices

### For Maximum Results

1. **Use Auto-Scroll** - The "Extract All with Auto-Scroll" button gets the most data
2. **Scroll First** - Manually scroll down a bit before extracting to load initial results
3. **Wait for Loading** - Let Google Maps fully load before clicking extract
4. **Clear Duplicates** - Use "Clear All Data" button to start fresh
5. **Check Console** - Press F12 to see extraction progress in real-time

### Data Quality Tips

- ✅ Phone numbers are extracted from visible list view
- ✅ Websites may require clicking individual businesses
- ✅ All public data is captured automatically
- ✅ Export frequently to avoid losing data

## 📊 Data Fields Extracted

| Field | Description | Always Available? |
|-------|-------------|-------------------|
| Name | Business name | ✅ Yes |
| Phone | Phone number | ✅ Yes |
| Address | Full address | ✅ Yes |
| Website | Business website | ✅ Yes |
| Rating | Star rating (1-5) | ✅ Yes |
| Reviews | Number of reviews | ✅ Yes |
| Category | Business type | ✅ Yes |
| Extracted At | Timestamp | ✅ Yes |

## 🛠️ Troubleshooting

### Extension not working?
- Make sure you're on `maps.google.com`, not regular Google search
- Refresh the Google Maps page
- Reload the extension at `chrome://extensions/`

### No phone numbers extracted?
- Phone numbers appear in the list view for most businesses
- Make sure search results are visible on the left panel
- Some businesses may not display phone numbers publicly

### "No businesses found" error?
- Ensure search results list is visible on the left side
- Try "Extract Visible Results (Quick)" first to test
- Check browser console (F12) for error messages

### Duplicate entries?
- Click "Clear All Data" to start fresh
- The extension automatically prevents duplicates based on name + address

### Auto-scroll not working?
- Make sure the results panel is visible
- Try manual extraction first
- Check console (F12) for error messages

## 🔒 Privacy & Legal

- ✅ Only extracts **publicly visible** information
- ✅ No data sent to external servers (except your Google Sheet if configured)
- ✅ All data stored locally in your browser
- ⚠️ Respect Google's Terms of Service
- ⚠️ Use responsibly and ethically
- ⚠️ Consider rate limiting for large extractions

**Disclaimer:** This tool is for educational and research purposes. Users are responsible for complying with Google's Terms of Service and applicable laws.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Changelog

### Version 1.0.0 (2025-01-29)
- ✨ Initial release
- 🚀 Auto-scroll extraction feature
- 📊 Google Sheets integration
- 💾 CSV export
- 🎯 Duplicate prevention
- 📱 Phone number extraction from list view

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

Having issues? 

1. Check the [Troubleshooting](#troubleshooting) section
2. Open an [Issue](https://github.com/yourusername/google-maps-scraper/issues)
3. Check existing issues for solutions

## ⭐ Show Your Support

If this project helped you, please consider giving it a ⭐ star on GitHub!

## 🔗 Links

- [Report Bug](https://github.com/Akashsingh512/MapToSheet/issues)
- [Request Feature](https://github.com/Akashsingh512/MapToSheet/issues)
- [Documentation](https://github.com/Akashsingh512/MapToSheet/wiki)

---

**Made with ❤️ for lead generation and market research**

*Remember: Use this tool responsibly and respect website terms of service.*