// This would typically be in your main application file (e.g., main.ts or index.ts)
import { readConfig, setUser } from './config'; // Adjust path if necessary

type CommandHandler = (cmdName: string, ...args: string[]) => void;
type CommandsRegistry = Record<string, CommandHandler>;


function handlerLogin(cmdName: string, ...args: string[]) {
    if (args.length === 0) {
        throw new Error('Missing username command argument for login. Example: <login pippo>')
    }
    if (args.length > 1) {
        console.warn(`Warning: The '${cmdName}' command only expects one argument (username). Ignoring additional arguments.`);
    }
    const username = args[0];

    try{
        setUser(username);
        console.log(`User "${username}" has been successfully set as the current user.`);
    } catch (error: any) {
        throw new Error(`Failed to set user "${username}": ${error.message}`);
    }
}

function registerCommand(registry: CommandsRegistry,
    cmdName: string,
    handler: CommandHandler): void{
        if (registry[cmdName]) {
            console.warn(`Warning: Command '${cmdName}' is being overwritten in the registry.`)
        }
        registry[cmdName] = handler;
    }

function runCommand(
    registry: CommandsRegistry,
    cmdName: string,
    ...args: string[]) {
        const handler = registry[cmdName];
        if (!handler) {
            throw new Error(`Unknown command: ${cmdName}`);
        }
        // Call the handler with its arguments
        handler(cmdName, ...args);
    
    }

async function main() {
    // Create nee CommandsRegistry object
    const commands: CommandsRegistry = {};

    // Register commands
    registerCommand(commands, "login", handlerLogin);

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
        console.log(`Attempting to run command: '${cmdName}' with arguments: [${cmdArgs.join(', ')}]`);
        runCommand(commands, cmdName, ...cmdArgs); 
} catch (error: any) {
        console.error("\n--- Command Execution Failed ---");
        console.error(error.message);
        process.exit(1); // Exit with error code 1 on command failure
}
}

// Run the main function
main()
