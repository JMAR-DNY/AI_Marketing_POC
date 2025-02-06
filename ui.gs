// Global variables to store user inputs and state
var properties = PropertiesService.getScriptProperties();

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('GPT Sidebar')
    .addItem('Summarizer', 'Summarizer')
    .addItem('Snippetizer', 'Snippetizer')
    .addToUi();
}

function Summarizer() {
  var html = HtmlService.createHtmlOutputFromFile('Summarizer')
      .setTitle('GPT Sidebar')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function Snippetizer() {
  var html = HtmlService.createHtmlOutputFromFile('Snippetizer')
      .setTitle('GPT Sidebar')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Function to start processing with user inputs
function startProcessing(userInput, inputCol, outputCol, inputMode, gptModel) {

  properties.setProperties({
    'userInput': userInput,
    'inputCol': inputCol,
    'outputCol': outputCol,
    'inputMode': inputMode,
    'gptModel': gptModel,
    'startIndex': '2'  // Starting row index
  });

  // Create a trigger if it doesn't exist
  if (!isTriggerExists()) {
    ScriptApp.newTrigger('updateSheetWithGPT')
      .timeBased()
      .everyMinutes(5)
      .create();
  }

  // Start the first execution
  updateSheetWithGPT();
}

// Function to check if the trigger already exists
function isTriggerExists() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'updateSheetWithGPT') {
      return true;
    }
  }
  return false;
}

// Modified updateSheetWithGPT function to work with triggers
function updateSheetWithGPT() {
  var userInput = properties.getProperty('userInput');
  var inputCol = parseInt(properties.getProperty('inputCol'));
  var outputCol = parseInt(properties.getProperty('outputCol'));
  var inputMode = properties.getProperty('inputMode');
  var gptModel = properties.getProperty('gptModel');
  var startIndex = parseInt(properties.getProperty('startIndex') || '2');


  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var startTime = new Date().getTime();

  for (var i = startIndex; i <= lastRow; i++) {
    var currentTime = new Date().getTime();
    if (currentTime - startTime > 300000) { // 5 minutes in milliseconds
      properties.setProperty('startIndex', i.toString());
      return; // Exit the function
    }

        var resultCell = sheet.getRange(i, outputCol); // Assuming results go in column L (12) //set output col here
    var existingInput = sheet.getRange(i, outputCol).getValue(); // Get existing input from the sheet

    // Use the user input if provided, otherwise use the existing input from the sheet
    var input = userInput || existingInput;

    // Skip the row if the result cell already contains data or if there is no input
    if (resultCell.getValue() !== "" || !input) {
      continue;
    }
//set log here
    if (inputMode === "summary"){
      resultCell.setFontColor("#FF0000");
      resultCell.setValue("Scraping " + i + "...");
      SpreadsheetApp.flush();
  //
      var siteData = webScrape(sheet.getRange(i, inputCol).getValue());//set input col here
      if (siteData === "404 - Bad URL") {
        var result = "Invalid URL";
      } else {
        // Concatenate the input with siteData before passing to the GPT function
  //set log here
      resultCell.setFontColor("#0000EE");
      resultCell.setValue("GPT Processing " + i + "...");
      SpreadsheetApp.flush();
  //
      var result = GPT(input + siteData, gptModel);
      }
    } else if (inputMode === "snippet"){
      resultCell.setFontColor("#0000EE");
      resultCell.setValue("GPT Processing " + i + "...");
      SpreadsheetApp.flush();
  
      var result = GPT(input + sheet.getRange(i, inputCol).getValue(), gptModel);
    }
    resultCell.setFontColor("#000000")
    resultCell.setValue(result);
    SpreadsheetApp.flush(); // Refresh the sheet to see live updates
  }

  // Reset the startIndex and delete the trigger when done
  properties.deleteProperty('startIndex');
  deleteTriggers();
}

// Function to delete all triggers
function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

// Your existing functions (GPT, webScrape, scrapeLinksFromHomepage, scrapeWebPagesWithinDomain, normalizeUrl)...


function GPT(input, gptModel) {
  //var input = "hello";
  //var gptModel = "gpt-3.5-turbo-0125";
  //console.log(gptModel);
  //const Input = "hello";
  const GPT_API = "INSERT_API_KEY_HERE";
  const BASE_URL = "https://api.openai.com/v1/chat/completions";

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GPT_API}`
    };


  const options = {
      headers,
      method: "GET",
      muteHttpExceptions: true,
        payload: JSON.stringify({
        "model": gptModel,
        //"model": "gpt-3.5-turbo-0125",
        "messages": [{
          "role": "system",
          "content": ""
        },
        {
          "role": "user",
          "content": input
        }
        ],
        "temperature": 0.5
      })
  }
  const response = JSON.parse(UrlFetchApp.fetch(BASE_URL, options));
   console.log(response)
  
    if (response.choices && response.choices.length > 0) {
        console.log(response.choices[0].message.content);
        return response.choices[0].message.content;
  } else {
        return "404 - No GPT Response";
  }

}

// //this function grabs a list of links from the home page that are most likely to contain valuable
// //information such as the about page, team, etc
function scrapeLinksFromHomepage(homepageUrl) {
  //var homepageUrl = "http://www.brandinglosangeles.com";
  try {
    var response = UrlFetchApp.fetch(homepageUrl);
    var content = response.getContentText();

    // Extract links from the homepage
    // Modified regex to handle whitespace and optional quotes
    var links = content.match(/href\s*=\s*["']?([^"'\s>]+)/g).map(function(link) {
      // Remove the 'href=', optional quotes, and any leading/trailing whitespace
      return link.replace(/href\s*=\s*["']?/, '').trim();
    });

    // Define regular expressions that indicate useful information
    var regexes = [/about/, /team/, /who-we-are/, /our-team/, /our team/, /who we are/, /about us/, /meet.*team/];
// removed , /blog/ for now...
    // Filter links based on regular expressions and remove duplicates
    var filteredLinks = links.reduce(function(acc, link) {
      // Convert relative links to absolute URLs
      var absoluteLink = link.startsWith('http') ? link : homepageUrl + link;
      
      // Normalize the link (remove trailing slash)
      absoluteLink = absoluteLink.replace(/\/$/, '');

      // Check if the link matches any of the regular expressions and is not already in the accumulator
      if (!acc.includes(absoluteLink) && regexes.some(function(regex) {
        return regex.test(absoluteLink.toLowerCase());
      })) {
        acc.push(absoluteLink);
      }

      return acc;
    }, []);
    //console.log(filteredLinks);
    return filteredLinks;
  } catch (e) {
    return "404 - Bad URL"; // Return "404" if an error occurs (e.g., URL is invalid or unreachable)
  }
}

// // //This function scrapes text data from the web pages associated to the domain
// // function scrapeWebPagesWithinDomain(homepageUrl, urls) {

function scrapeWebPagesWithinDomain(homepageUrl, urls) {
  urls.unshift(homepageUrl);
  
  var homepageDomain = normalizeUrl(homepageUrl).split('/')[0]; // Get the domain from the normalized homepage URL
  var allText = "";

  // Filter URLs to include only those from the same domain
  var filteredUrls = urls.filter(function(url) {
    return normalizeUrl(url).split('/')[0] === homepageDomain;
  });

  // Create an array of request objects for fetchAll
  var requests = filteredUrls.map(function(url) {
    return {url: url, muteHttpExceptions: true};
  });

  // Fetch all URLs in parallel
  var responses = UrlFetchApp.fetchAll(requests);

  // Process the responses
  responses.forEach(function(response) {
    var content = response.getContentText();

    // Remove all HTML tags to extract the text content
    var text = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                       .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .trim();

    allText += text + "\n\n"; // Append the text from this page to the overall text
  });

  return allText;
}

//This calls the scraper helper functions
//This function was broken out from the other two to streamline testing purposes
function webScrape(homepageUrl) {
  //var homepageUrl = "http://www.mindfirecomm.com";
  var links = scrapeLinksFromHomepage(homepageUrl);
  if (links === "404 - Bad URL"){
    return "404 - Bad URL";
  }
  else{
    var allText = scrapeWebPagesWithinDomain(homepageUrl, links);
    //console.log(allText);
    return allText;
  
  }
}

//This function normalizes URLs to account for some links being http, https, having www, or not having www
function normalizeUrl(url) {
  var normalizedUrl = url.toLowerCase();
  normalizedUrl = normalizedUrl.replace(/^https?:\/\//, ''); // Remove http:// or https://
  normalizedUrl = normalizedUrl.replace(/^www\./, ''); // Remove www.
  return normalizedUrl;
}
