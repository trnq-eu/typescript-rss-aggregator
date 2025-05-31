import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_FILE_NAME = ".gatorconfig.json";

// Represents the structure of the config file in camelCase


export type Config = {
    "dbUrl": string;
    currentUserName?: string;
}

// Helper functions
/**
 * Gets the full path to the configuration file.
 * @returns {string} The absolute path to the config file.
 */

function getConfigFilePath(): string {
    return path.join(os.homedir(), CONFIG_FILE_NAME);
}

/**
 * Validates the raw parsed JSON object and transforms it into a Config object.
 * JSON keys are snake_case, Config fields are camelCase.
 * @param {any} rawConfig - The raw object parsed from JSON.
 * @returns {Config} The validated and transformed Config object.
 * @throws {Error} If the configuration is invalid.
 */

function validateConfig(rawConfig: any): Config {
    if (typeof rawConfig !== "object" || rawConfig == null) {
        throw new Error("Invalid config: The configuration must be an object.");
    }

    if (typeof rawConfig.db_url !== "string" || rawConfig.db_url.trim() === "") {
        throw new Error("Invalid config: 'db_url' is missing, not a string or empty")
    } 

    const config: Config = {
        dbUrl: rawConfig.db_url
    };

    if (rawConfig.current_user_name !== undefined) {
        if (typeof rawConfig.current_user_name !== "string" || rawConfig.current_user_name.trim() === "") {
            throw new Error("Invalid config: 'current_user_name' is missing, not a string or empty")
        }
        config.currentUserName = rawConfig.current_user_name;
    }
    return config;
}


/**
 * Writes the given Config object to the JSON configuration file.
 * Transforms camelCase Config fields to snake_case JSON keys.
 * @param {Config} cfg - The Config object to write.
 */

function writeConfig(cfg: Config): void {
    const filePath = getConfigFilePath();
    const rawConfig: any = {
        db_url: cfg.dbUrl,
    };

    if (cfg.currentUserName !== undefined){
        rawConfig.current_user_name = cfg.currentUserName;
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(rawConfig, null, 2), 'utf-8');
    } catch (error: any) {
        throw new Error(`Error writing config file at ${filePath}: ${error.message}`)
    };
}

// --- Exported functions ---

/**
 * Reads the JSON configuration file from ~/.gatorconfig.json,
 * validates it, and returns a Config object.
 * @returns {Config} The configuration object.
 * @throws {Error} If the file cannot be read, parsed, or is invalid.
 */

export function readConfig(): Config {;
    const filePath = getConfigFilePath();
    let fileContent: string;

    try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (error: any) {
        throw new Error(`Error reading config file at ${filePath}: ${error.message}`);
    }

    let parsedJson: any;
    try {
        parsedJson = JSON.parse(fileContent);

    } catch (error: any) {
        throw new Error(`Error parsing JSON in config file at ${filePath}: ${error.message}`);
    }

    try {
        return validateConfig(parsedJson);
    } catch (error: any) {
        // Augment validation error with file path information
        throw new Error(`Invalid configuration in file ${filePath}: ${error.message}`);
    }
}

    /**
     * Sets the current_user_name in the configuration and writes it to disk.
     * It reads the existing configuration, updates the user name, and then saves.
     * @param {string} userName - The user name to set.
     */
export function setUser(userName: string): void {
if (typeof userName !== 'string' || userName.trim() === '') {
    throw new Error("Username must be a non-empty string.");
}

    let config: Config;
    try {
        // Read the current config. This will throw if db_url is missing or file is malformed.
        config = readConfig();
    } catch (error: any) {
        // If readConfig fails, it means the base config (especially db_url) is not properly set up.
        // We cannot proceed to set a user without a valid base config.
        // The error from readConfig should be informative enough.
        console.error("Failed to read existing config before setting user. Ensure config file exists and is valid.", error);
        throw error; // Re-throw the error from readConfig
    }

    config.currentUserName = userName;

    try {
        writeConfig(config);
    } catch (error: any) {
        // writeConfig can also throw, e.g., due to permissions
        console.error("Failed to write updated config after setting user.", error);
        throw error; // Re-throw the error from writeConfig
    }

}