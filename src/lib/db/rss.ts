import { XMLParser } from 'fast-xml-parser';

export type RSSItem = {
    title: string,
    link: string,
    description: string,
    pubDate: string
};

export type RSSFeed = {
    channel: {
        title: string,
        link: string,
        description: string,
        item: RSSItem[]
    }
}

// Helper to check if a value is a non-empty string
function isNonEmptyString(value: any): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

// Helper to check if a value is a string (can be empty, e.g. description)
function isString(value: any): value is string {
    return typeof value === 'string';
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
    let response: Response;

    try {
        response = await fetch(feedURL, {
            headers: {
                'User-Agent': 'gator',
            },
        });
    } catch (err: any) {
        throw new Error(`Network error fetching feed from ${feedURL}: ${err.message}`);
    }
    if (!response.ok){
        throw new Error(`Failed to fetch feed from ${feedURL}. Status: ${response.status} ${response.statusText}`);
    }
    let xmlText: string;
    try {
        xmlText = await response.text();
    } catch (err: any) {
        throw new Error(`Error reading response text from ${feedURL}: ${err.message}`);
    }

    let parsedXml: any;
    try {
        const parser = new XMLParser();
        parsedXml = parser.parse(xmlText);
    } catch(err: any) {
        throw new Error(`Error parsing XML from ${feedURL}: ${err.message}`);
    }

    // Verify channel field exists
    if (!parsedXml || !parsedXml.rss || typeof parsedXml.rss.channel !== 'object' || parsedXml.rss.channel === null) {
        throw new Error("Invalid RSS structure: 'rss.channel' not found or not an object.");
    }
    const rawChannel = parsedXml.rss.channel;

    // Extract and validate channel metadata
    const { title: channelTitle, link: channelLink, description: channelDescription} = rawChannel;

    if (!isNonEmptyString(channelTitle)) {
        throw new Error("Invalid RSS feed: 'channel.title' is missing, not a string, or empty.");
    }
    if (!isNonEmptyString(channelLink)) {
        throw new Error("Invalid RSS feed: 'channel.link' is missing, not a string, or empty.");
    }
    if (!isString(channelDescription)) { // Description can be an empty string
        throw new Error("Invalid RSS feed: 'channel.description' is missing or not a string.");
    }

    // Extract feed items
    const items: RSSItem[] = [];
    if (rawChannel.item !== undefined) {
        if (Array.isArray(rawChannel.item)) {
            for (const rawItem of rawChannel.item) {
                if (typeof rawItem === 'object' && rawItem !== null) {
                    const { title, link, description, pubDate } = rawItem;
                    // Skip item if essential fields are missing or invalid
                    if (isNonEmptyString(title) && isNonEmptyString(link) && isString(description) && isNonEmptyString(pubDate)) {
                        items.push({ title, link, description, pubDate });
                    } else {
                        console.warn("Skipping item with missing or invalid fields:", rawItem);
                    }
                } else {
                    console.warn("Skipping invalid item in channel (not an object):", rawItem);
                }
            }
        } else {
            // If 'item' exists but is not an array, set items to empty (as per instruction)
            // This branch is technically covered by initializing `items` to [],
            // but the warning is good.
            console.warn("Channel 'item' field was found but is not an array. No items will be processed from it.");
        }
    }

    // Assemble the result
    return {
        channel: { title: channelTitle, link: channelLink, description: channelDescription, item: items },
    };
    }
