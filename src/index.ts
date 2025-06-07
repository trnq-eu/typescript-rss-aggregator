// This would typically be in your main application file (e.g., main.ts or index.ts)
import { readConfig, setUser } from './config'; // Adjust path if necessary
import { createUser, getUser, getUsers, deleteAllUsers } from './lib/db/queries/users';
import { fetchFeed, RSSFeed } from './lib/db/rss'; // Import RSS related functions and types



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
        process.exit(1);
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
        process.exit(1);
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

async function main() {
    // Create nee CommandsRegistry object
    const commands: CommandsRegistry = {};

    // Register commands
    await registerCommand(commands, "login", handlerLogin);
    await registerCommand(commands, "register", handlerRegister);
    await registerCommand(commands, "reset", handlerReset);
    await registerCommand(commands, "users", handlerUsers);
    await registerCommand(commands, "agg", handlerAgg); // Register the new agg command


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
