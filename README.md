# AI_Marketing_POC
Google Apps script application to perform bulk company research and personalized outreach at scale

## Problem ##
I was approached by someone in the Mergers and Acquisitions space who needed help with their cold email outreach campaigns.  Their deliverability, open, and positive-reply rates were lower than the industry standard despite following best-pracices.  Upon investigating their data I determined that many of their leads were not of the corresponding industry to their respective searches (HVAC company showing up in a search for marketing agency, etc).

### Other Considerations ###
- Data from business databases are often out-dated and misrepresentative of actual service offerings
- Most email providers are smart enough to recognize cold email outreach with minor spintax changes
- Personalized messaging achieves higher open and positive-reply rates but are time-consuming to create

## Solution ##
- Sanitize and homogenize the .csv data from business databases
- Create personalized messaging for each email in the campaign

### Implementation ###
Google Apps Script that:
- ingests a .csv file
- allows the user to specify which column to parse (URLs) and where to put the output
- user then inserts their AI prompt and runs the script
- web scraper goes to each site and parses pages & subpages relevant to company info (about, team, company, etc)
- response then hits the chat GPT API using the AI prompt and generates a unified summary
- Snippet feature is similar but uses the summary instead of webscraping.  Snippets were used by cold email outreach and injected as custom hooks and closers into their messaging templates, providing much greater variability than spintax injection

## Results ##
- More than 50% increase in reply rates from previous campaigns
- More than doubled positive reply rate from previous campaigns

## Future Development ##
Beyond the POC, if I were to flesh this out into a full product I would:
- Implement a vector database on business summaries to allow users to semantically search for a business and what their services are instead of using filters (ex. "I'm looking for renovation companies specializing in floodwater recovery in Florida and are likely to have at least 500k annual EBITDA"
- Collation between data sources -> Not only their website but also Yelp reviews, facebook, Google Business pages, etc collated into a unified structure
- Use ML and predictive analysis to rank leads based on how likely they are to being open to sell, then rank them accorgingly to prioritize follow-up
