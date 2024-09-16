import { execSync } from "child_process";
import fs from "fs";

function runCommand(command) {
  try {
    return execSync(command, { stdio: "inherit", encoding: "utf-8" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function hasChanges(directory) {
  const output = execSync(`git status --porcelain ${directory}`, { encoding: "utf-8" });
  return output.trim().length > 0;
}

// Push to public repo
console.log("Pushing to public repo...");
runCommand("git add docs");
runCommand('git commit -m "Update docs"');
runCommand("git push origin main");

// Push to private repo
console.log("Pushing to private repo...");

// Temporarily rename .gitignore
fs.renameSync(".gitignore", ".gitignore_temp");
fs.renameSync(".gitignore_private", ".gitignore");

runCommand("git add .");
runCommand('git commit -m "Update all files including source"');
runCommand("git push private main");

// Restore original .gitignore
fs.renameSync(".gitignore", ".gitignore_private");
fs.renameSync(".gitignore_temp", ".gitignore");

console.log("All operations completed successfully.");
