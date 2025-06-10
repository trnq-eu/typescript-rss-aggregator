// This would typically be in your main application file (e.g., main.ts or index.ts)
import { readConfig, setUser } from './config'; // Adjust path if necessary
import { createUser, getUser, getUsers, deleteAllUsers } from './lib/db/queries/users';
import { fetchFeed, RSSFeed } from './lib/db/rss';
import { createFeed, getAllFeedsWithUserDetails, getFeedByUrl } from './lib/db/queries/feeds';
import { createFeedFollow, getFeedFollowsForUser } from './lib/db/queries/feed_follows';


type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type CommandsRegistry = Record<string, CommandHandler>;

async function handlerAgg(cmdName: string, ...args: string[]): Promise<void> {
    // For now, use a fixed URL as per assignment.
    // Later, this might take a URL or feed name as an argument.
    const feedURL = "https://www.wagslane.dev/index.xml";
    console.log(`Fetching feed from ${feedURL}...`);

    try {
        const feedData: RSSFeed = await fetchFeed(feedURL);
        console.log("Feed data received (entire object):");
        console.log(JSON.stringify(feedData, null, 2)); // Pretty print the object
    } catch (error: any) {
        // Re-throw to be caught by the main error handler, adding context
        throw new Error(`Error in 'agg' command while fetching from ${feedURL}: ${error.message}`);
    }
}

async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length === 0) {
        throw new Error('Missing username command argument for register. Example: <register lane>')
    }
    if (args.length > 1) {
        console.warn(`Warning: The '${cmdName}' command only expects one argument (username). Ignoring addition arguments.`)
    }
    const username = args[0];

    // Check if user already exists
    const existingUser = await getUser(username);
    if (existingUser) {
        throw new Error(`User "${username}" already exists. Please choose a different name or login.`)
    } 
    
    try {const newUser = await createUser(username);
        setUser(username);
        console.log(`User "${username}" has been successfully registered.`)
        console.log("User data:", newUser);
    }
    catch (error: any) {
        throw new Error(`Failed to register user "${username}": ${error.message}`);
    }
}

async function handlerReset(cmdName: string, ...args: string[]): Promise<void> {
    try {
        await deleteAllUsers();
        console.log("All users have been deleted. I hope your really meant to do that.Ah ah ah ah!")

    } catch (error: any) {
        throw new Error(`Failed to reset users: ${error.message}`);
    }
    
}

async function handlerUsers(cmdName: string, ...args: string[]): Promise<void> {
    try {
        const usersList = await getUsers();
        const actualConfig = await readConfig();
        const currentUser = actualConfig.currentUserName

        for (let user of usersList) {
            if (user.name === currentUser) {
                console.log(`* ${user.name} (current)`)
            } else {
                console.log(`* ${user.name}`);
            }
            
        }
        // console.log(actualConfig)
    } catch (error: any) {
        throw new Error(`Failed to get users: ${error.message}`);
    }
}


async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length === 0) {
        throw new Error('Missing username command argument for login. Example: <login pippo>')
    }
    if (args.length > 1) {
        console.warn(`Warning: The '${cmdName}' command only expects one argument (username). Ignoring additional arguments.`);
    }
    const username = args[0];
    
    // Check if user exists in the database
    const existingUser = await getUser(username);

    if (!existingUser) {
        throw new Error(`User "${username}" does not exist. Please register first.`)    
    }

    try{
        setUser(username);
        console.log(`User "${username}" has been successfully set as the current user.`);
    } catch (error: any) {
        throw new Error(`Failed to set user "${username}": ${error.message}`);
    }
}

async function handlerAddFeed(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length < 2) {
        throw new Error('Missing arguments for addfeed. Usage: addfeed <name> <url>');
    }
    if (args.length > 2) {
        console.warn(`Warning: The '${cmdName}' command only expects two arguments (name, url). Ignoring additional arguments.`);
    }
    const feedName = args[0];
    const feedUrl = args[1];

    const config = await readConfig();

    if (!config.currentUserName) {
        throw new Error("No current user set. Please login or register first using 'login <username>' or 'register <username>'.");
    }

    const currentUser = await getUser(config.currentUserName);

    if (!currentUser) {
        throw new Error(`Current user "${config.currentUserName}" not found in the database. Please re-login or register.`);
    }

    try {
        const newFeed = await createFeed(feedName, feedUrl, currentUser.id);
        // Automatically follow the newly added feed
        const followDetails = await createFeedFollow(currentUser.id, newFeed.id);
        console.log(`Feed "${followDetails.feed_name}" added and followed by "${followDetails.user_name}".`);
    } catch (error: any) {
        throw new Error(`Failed to add feed "${feedName}": ${error.message}`);
    }
}

async function handlerFollow(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length === 0) {
        throw new Error('Missing feed URL argument for follow. Usage: follow <feed_url>');
    }
    if (args.length > 1) {
        console.warn(`Warning: The '${cmdName}' command only expects one argument (feed_url). Ignoring additional arguments: ${args.slice(1).join(', ')}`);
    }
    const feedUrl = args[0];

    const config = await readConfig();
    if (!config.currentUserName) {
        throw new Error("No current user set. Please login or register first using 'login <username>' or 'register <username>'.");
    }

    const currentUser = await getUser(config.currentUserName);
    if (!currentUser) {
        // This case should ideally not happen if config.currentUserName is set and valid
        throw new Error(`Current user "${config.currentUserName}" not found in the database. Please re-login or register.`);
    }

    const feedToFollow = await getFeedByUrl(feedUrl);
    if (!feedToFollow) {
        throw new Error(`Feed with URL "${feedUrl}" not found. Please add it first using 'addfeed <name> <url>' or check the URL.`);
    }

    try {
        // The unique constraint 'user_feed_unique_idx' will prevent duplicates.
        // We can attempt the insert and catch the specific error if it's a duplicate.
        const followDetails = await createFeedFollow(currentUser.id, feedToFollow.id);
        console.log(`Successfully followed "${followDetails.feed_name}" as "${followDetails.user_name}".`);
    } catch (error: any) {
        // Check for unique constraint violation error (specific error code/message might depend on PostgreSQL version/driver)
        // For PostgreSQL, a common error code for unique_violation is '23505'
        if (error.message && error.message.includes('duplicate key value violates unique constraint "user_feed_unique_idx"')) {
            // It's okay if they are already following, just inform them.
            console.log(`You are already following "${feedToFollow.name}".`);
        } else {
            // Re-throw other errors
            throw new Error(`Failed to follow feed "${feedToFollow.name}": ${error.message}`);
        }
    }
}

async function handlerFollowing(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length > 0) {
        console.warn(`Warning: The '${cmdName}' command does not accept any arguments. Ignoring provided arguments: ${args.join(', ')}`);
    }

    const config = await readConfig();
    if (!config.currentUserName) {
        throw new Error("No current user set. Please login or register first.");
    }

    const currentUser = await getUser(config.currentUserName);
    if (!currentUser) {
        throw new Error(`Current user "${config.currentUserName}" not found in the database. Please re-login or register.`);
    }

    try {
        const followedFeeds = await getFeedFollowsForUser(currentUser.id);

        if (followedFeeds.length === 0) {
            console.log("You are not following any feeds yet.");
            return;
        }

        console.log(`\n--- Feeds followed by ${currentUser.name} ---`);
        for (const follow of followedFeeds) {
            console.log(`- ${follow.feed_name} (${follow.feed_url})`);
        }
    } catch (error: any) {
        throw new Error(`Failed to retrieve followed feeds for user "${currentUser.name}": ${error.message}`);
    }
}



async function registerCommand(registry: CommandsRegistry,
    cmdName: string,
    handler: CommandHandler): Promise<void>{
        if (registry[cmdName]) {
            console.warn(`Warning: Command '${cmdName}' is being overwritten in the registry.`)
        }
        registry[cmdName] = handler;
    }

async function runCommand(
    registry: CommandsRegistry,
    cmdName: string,
    ...args: string[]): Promise<void> {
        const handler = registry[cmdName];
        if (!handler) {
            throw new Error(`Unknown command: ${cmdName}`);
        }
        // Call the handler with its arguments
        await handler(cmdName, ...args);
    }

// Type definition for the data structure returned by getAllFeedsWithUserDetails
type FeedWithUserDetail = {
    feed_name: string;
    feed_url: string;
    user_name: string | null;
};

async function handlerFeeds(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length > 0) {
        console.warn(`Warning: The '${cmdName}' command does not accept any arguments. Ignoring provided arguments: ${args.join(', ')}`);
    }

    try {
        const feeds: FeedWithUserDetail[] = await getAllFeedsWithUserDetails(); // This function needs to be implemented in './lib/db/queries/feeds.ts'

        if (feeds.length === 0) {
            console.log("No feeds found in the database.");
            return;
        }

        console.log("\n--- All Feeds ---");
        for (const feed of feeds) {
            console.log(`Name: ${feed.feed_name}\nURL: ${feed.feed_url}\nAdded by: ${feed.user_name}\n-----------------`);
        }
    } catch (error: any) {
        throw new Error(`Failed to retrieve feeds: ${error.message}`);
    }
}

async function main() {
    // Create nee CommandsRegistry object
    const commands: CommandsRegistry = {};

    // Register commands
    await registerCommand(commands, "login", handlerLogin);
    await registerCommand(commands, "register", handlerRegister);
    await registerCommand(commands, "reset", handlerReset);
    await registerCommand(commands, "users", handlerUsers);
    await registerCommand(commands, "agg", handlerAgg); // Register the new agg command
    await registerCommand(commands, "addfeed", handlerAddFeed);
    await registerCommand(commands, "feeds", handlerFeeds);
    await registerCommand(commands, "follow", handlerFollow);
    await registerCommand(commands, "following", handlerFollowing);


    // Get command-line arguments
    const args = process.argv.slice(2); // Remove node path and script path

    // Check if there's at least one argument (the command name)
    if (args.length === 0) {
        console.error("Error: not enough arguments. Usage npm run start <command> [args...]");
        process.exit(1);
    }

    const cmdName = args[0]; // First argument is the command name
    const cmdArgs = args.slice(1); // Rest of the arguments for the command

    try {
        // console.log(`Attempting to run command: '${cmdName}' with arguments: [${cmdArgs.join(', ')}]`);
        await runCommand(commands, cmdName, ...cmdArgs); 
} catch (error: any) {
        console.error("\n--- Command Execution Failed ---");
        console.error(error.message);
        process.exit(1); // Exit with error code 1 on command failure
}
    process.exit(0);
}

// Run the main function
main();
